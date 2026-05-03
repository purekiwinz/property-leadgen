import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { supabase } from '@/lib/supabase';
import fs from 'fs';

export const dynamic = 'force-dynamic';
// PDF generation can take a while on cold start
export const maxDuration = 60;

function chromiumPath(): string {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (process.platform === 'darwin') {
    for (const p of [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ]) {
      if (fs.existsSync(p)) return p;
    }
  }
  return '/usr/bin/chromium-browser';
}

type Sale = { id: number; address: string; image: string | null; beds: number | null; baths: number | null; parking: number | null; days: string | null; updated_at: string | null; display_order: number | null };

async function buildHtml(page: string): Promise<{ html: string; filename: string } | null> {
  const { data: sales } = await supabase.from('recent_sales').select('*');
  const rows = (sales as Sale[]) || [];

  if (page === 'recent-sales') {
    const { generateHtml } = await import('@/app/ads/intro/recent-sales/route');
    return { html: generateHtml(rows), filename: 'recent-sales.pdf' };
  }
  if (page === 'dle-print') {
    const { generateHtml } = await import('@/app/ads/dle/print/route');
    return { html: generateHtml(rows), filename: 'dle-flyers.pdf' };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const page = new URL(req.url).searchParams.get('page') || 'recent-sales';

  const result = await buildHtml(page);
  if (!result) return NextResponse.json({ error: 'Unknown page' }, { status: 400 });

  const browser = await puppeteer.launch({
    executablePath: chromiumPath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
    headless: true,
  });

  try {
    const tab = await browser.newPage();
    await tab.setContent(result.html, { waitUntil: 'domcontentloaded' });

    // Wait for fonts, then all images (or their errors), then a small buffer
    await tab.evaluateHandle(() => document.fonts.ready);
    await tab.evaluate(() => Promise.all(
      Array.from(document.images).map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise(r => { img.onload = r; img.onerror = r; })
      )
    ));
    await new Promise(r => setTimeout(r, 500));

    const pdf = await tab.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    const pdfBuf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    return new Response(pdfBuf.buffer.slice(pdfBuf.byteOffset, pdfBuf.byteOffset + pdfBuf.byteLength) as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } finally {
    await browser.close();
  }
}
