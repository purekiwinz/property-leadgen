import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type Sale = {
  id: number;
  address: string;
  image: string | null;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  days: string | null;
  updated_at: string | null;
};

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function sortSales(sales: Sale[]): Sale[] {
  const toNum = (d: string | null) => {
    if (!d) return 0;
    const [m, y] = d.split(' ');
    const mi = MONTHS_LONG.indexOf(m);
    return isNaN(parseInt(y)) || mi === -1 ? 0 : parseInt(y) * 12 + mi;
  };
  return [...sales].sort((a, b) => {
    const diff = toNum(b.days) - toNum(a.days);
    return diff !== 0 ? diff : new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime();
  });
}

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const BED_ICON  = `<svg style="width:3.5mm;height:3.5mm;vertical-align:middle;margin-right:0.5mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17V9.5A1.5 1.5 0 013.5 8h17A1.5 1.5 0 0122 9.5V17"/><path d="M2 13h20"/><path d="M6 13V10a1 1 0 011-1h4a1 1 0 011 1v3"/><line x1="4" y1="17" x2="4" y2="19"/><line x1="20" y1="17" x2="20" y2="19"/></svg>`;
const BATH_ICON = `<svg style="width:3.5mm;height:3.5mm;vertical-align:middle;margin-right:0.5mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5" r="1" fill="currentColor" stroke="none"/><path d="M8 6v3"/><path d="M6 9h4"/><path d="M2 16h20v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1z"/><line x1="5" y1="19" x2="5" y2="21"/><line x1="19" y1="19" x2="19" y2="21"/></svg>`;
const CAR_ICON  = `<svg style="width:3.5mm;height:3.5mm;vertical-align:middle;margin-right:0.5mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l1.8-5.4A2 2 0 018.7 6h6.6a2 2 0 011.9 1.6L19 13"/><rect x="2" y="13" width="20" height="5" rx="1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

function renderCard(sale: Sale): string {
  const lastComma = sale.address.lastIndexOf(',');
  const street = lastComma > 0 ? sale.address.slice(0, lastComma).trim() : sale.address;
  const suburb = lastComma > 0 ? sale.address.slice(lastComma + 1).trim() : '';

  const feats: string[] = [];
  if (sale.beds)    feats.push(`${BED_ICON}<span>${sale.beds}</span>`);
  if (sale.baths)   feats.push(`${BATH_ICON}<span>${sale.baths}</span>`);
  if (sale.parking) feats.push(`${CAR_ICON}<span>${sale.parking}</span>`);

  return `<div class="card">
    <div class="card-img-wrap">
      ${sale.image ? `<img class="card-img" src="${esc(sale.image)}" alt="${esc(sale.address)}">` : '<div class="card-img-placeholder"></div>'}
      <div class="sold-wrap"><div class="sold-band"><span class="sold-text">Sold</span></div></div>
      ${sale.days ? `<div class="month-pill">${esc(sale.days)}</div>` : ''}
    </div>
    <div class="card-body">
      <p class="card-street">${esc(street)}</p>
      ${suburb ? `<p class="card-suburb">${esc(suburb)}</p>` : ''}
      ${feats.length ? `<div class="card-feats">${feats.join('<span class="feat-sep"> | </span>')}</div>` : ''}
    </div>
  </div>`;
}

function generateHtml(sales: Sale[]): string {
  const sorted = sortSales(sales.filter(s => s.image));
  const cards = sorted.map(s => renderCard(s)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Recent Sales — Ed Scanlan, Professionals Hibiscus Coast</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&family=Source+Serif+4:ital,opsz,wght@1,8,400;1,8,600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4 portrait; margin: 0; }

    body {
      font-family: 'Poppins', sans-serif;
      background: #fff;
      color: #1e1e2e;
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 13mm 12mm;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* ── Header ── */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 5mm;
    }

    .heading-block { display: flex; flex-direction: column; line-height: 1; }
    .heading-our {
      font-size: 28pt;
      font-weight: 800;
      color: #1e1e2e;
      letter-spacing: -0.01em;
      line-height: 1.05;
    }
    .heading-sub {
      font-family: 'Source Serif 4', Georgia, serif;
      font-style: italic;
      font-size: 32pt;
      font-weight: 600;
      color: #CC2229;
      line-height: 1.05;
    }
    .heading-tagline {
      font-size: 8pt;
      color: #888;
      font-weight: 400;
      margin-top: 2.5mm;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    /* Professionals logo mark */
    .logo-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 1mm; }
    .logo-name { font-size: 14pt; font-weight: 700; color: #1e1e2e; letter-spacing: -0.01em; }

    /* Red rule */
    .red-rule { width: 100%; height: 0.6mm; background: #CC2229; margin-bottom: 5mm; }

    /* ── Card grid ── */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4.5mm;
    }

    .card {
      border: 0.3mm solid #e0e0e0;
      border-radius: 1.5mm;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
    }

    .card-img-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: #f0f0f0;
    }
    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .card-img-placeholder { width: 100%; height: 100%; background: #e8e8e8; }

    /* Sold diagonal band */
    .sold-wrap { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    .sold-band {
      position: absolute;
      background: #CC2229;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 220%;
      height: 7mm;
      top: 3%;
      left: -30%;
      transform: rotate(45deg);
    }
    .sold-text {
      font-family: 'Source Serif 4', Georgia, serif;
      font-style: italic;
      font-weight: 400;
      font-size: 8pt;
      color: #fff;
      letter-spacing: 0.04em;
    }

    /* Month pill */
    .month-pill {
      position: absolute;
      bottom: 2mm;
      left: 2mm;
      background: rgba(0,0,0,0.6);
      color: #fff;
      font-size: 6.5pt;
      font-weight: 600;
      padding: 0.6mm 2mm;
      border-radius: 10mm;
      letter-spacing: 0.02em;
    }

    /* Card body */
    .card-body { padding: 2.5mm 3mm 3mm; }
    .card-street {
      font-size: 7.5pt;
      font-weight: 700;
      color: #1e1e2e;
      line-height: 1.3;
      margin-bottom: 0.75mm;
    }
    .card-suburb {
      font-family: 'Source Serif 4', Georgia, serif;
      font-style: italic;
      font-size: 7pt;
      color: #CC2229;
      font-weight: 400;
      margin-bottom: 1.5mm;
    }
    .card-feats {
      display: flex;
      align-items: center;
      gap: 1mm;
      font-size: 6.5pt;
      font-weight: 600;
      color: #555;
    }
    .feat-sep { color: #CC2229; font-weight: 300; }

    /* ── Footer ── */
    .page-footer {
      margin-top: 5mm;
      padding-top: 3mm;
      border-top: 0.3mm solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-name { font-size: 8pt; font-weight: 700; color: #1e1e2e; }
    .footer-detail { font-size: 7pt; color: #888; }
    .footer-license { font-size: 6pt; color: #aaa; margin-top: 0.5mm; }

    /* Screen preview wrapper */
    @media screen {
      html { background: #999; }
      body {
        margin: 20px auto;
        box-shadow: 0 4px 40px rgba(0,0,0,0.4);
      }
    }

    @media print {
      body { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>

  <div class="page-header">
    <div>
      <div class="heading-block">
        <span class="heading-our">Our</span>
        <span class="heading-sub">Recent Sales</span>
      </div>
      <p class="heading-tagline">Hibiscus Coast &nbsp;·&nbsp; Orewa · Millwater · Milldale · Red Beach &nbsp;·&nbsp; Latest to oldest</p>
    </div>
    <div class="logo-wrap">
      <svg width="42mm" height="10.5mm" viewBox="0 0 750 187.5">
        <path fill="#1e1e2e" d="M157.07 131V59.13l23.59-.46c19.22-.35 28.77 9.1 28.77 20.73 0 15.77-13.93 24.29-29.82 24.29-2.65 0-5.98-.23-8.51-.46V131zm14.05-65.63v31.32c2.19.46 4.95.7 7.83.7 8.97 0 15.54-6.22 15.54-15.9 0-9.67-6.1-16.12-16.01-16.12zM216.5 131V79.73l12.31-2.88v10.25h.58c3-6.91 7.83-10.59 13.93-10.59 2.65 0 5.18.7 7.37 1.96l-2.3 11.63c-2.07-2.3-4.38-3.68-7.49-3.68-5.41 0-10.24 5.53-12.09 16.8V131zm35.84-25.7c0-16.35 11.17-28.79 28.09-28.79s28.33 11.63 28.33 27.41c0 15.77-11.17 28.78-28.08 28.78-16.92 0-26.34-11.63-26.34-27.4zm41.1.81c0-16-6.33-23.14-14.4-23.14-8.06 0-13.46 7.37-13.46 20.27 0 15.89 6.33 23.14 14.28 23.14s13.58-7.49 13.58-20.27zM316.55 131V84.92h-8.4v-6.68h8.4v-2.54c0-17.38 7.6-24.98 20.49-24.98 5.41 0 10.36 1.96 14.5 4.49l-3.91 8.4c-2.19-3.68-5.76-6.44-9.91-6.44-5.64 0-8.75 4.26-8.75 13.01v8.06h15.19v6.68H328.98V131zm76.52-4.37c-4.49 3.8-10.24 6.1-18.65 6.1-15.54 0-26.47-10.82-26.47-27.41 0-16.58 11.4-28.78 26.36-28.78 14.96 0 22.1 9.1 22.1 21.64 0 1.5-.12 3.8-.46 5.64H361.3c0 12.21 5.75 22.22 16.92 22.22 4.49 0 8.52-1.73 11.86-4.61zM383.75 97.93c0-9.21-3.11-15.08-9.91-15.08-5.41 0-10.59 5.64-12.2 15.08zM405.59 119.8c3.56 4.03 8.51 6.56 14.73 6.56 6.56 0 11.05-2.42 11.05-7.14 0-3.91-3-6.56-11.98-9.44-11.05-3.56-17.6-7.94-17.6-17.27 0-8.63 7.37-16 20.73-16 7.02 0 13.47 1.49 18.77 4.37l-3.68 8.52c-3.56-3.91-8.75-6.56-14.85-6.56-6.45 0-9.68 2.42-9.68 6.33 0 3.68 2.42 5.98 11.17 8.98 12.66 4.37 18.42 8.63 18.42 17.27 0 9.32-7.72 17.27-22.22 17.27-7.02 0-13.47-1.61-18.54-4.38zM450.7 119.8c3.56 4.03 8.51 6.56 14.73 6.56 6.56 0 11.05-2.42 11.05-7.14 0-3.91-3-6.56-11.98-9.44-11.05-3.56-17.6-7.94-17.6-17.27 0-8.63 7.37-16 20.73-16 7.02 0 13.47 1.49 18.77 4.37l-3.68 8.52c-3.56-3.91-8.75-6.56-14.85-6.56-6.45 0-9.68 2.42-9.68 6.33 0 3.68 2.42 5.98 11.17 8.98 12.66 4.37 18.42 8.63 18.42 17.27 0 9.32-7.72 17.27-22.22 17.27-7.02 0-13.47-1.61-18.54-4.38zM494.28 60.28c0-4.49 3.57-8.06 7.83-8.06s7.83 3.57 7.83 8.06-3.57 7.94-7.83 7.94-7.83-3.57-7.83-7.94zm1.61 70.69V79.73l12.43-2.88V131zM516.29 105.3c0-16.35 11.17-28.79 28.09-28.79s28.33 11.63 28.33 27.41c0 15.77-11.17 28.78-28.08 28.78-16.93 0-26.34-11.63-26.34-27.4zm41.1.81c0-16-6.33-23.14-14.4-23.14s-13.47 7.37-13.47 20.27c0 15.89 6.33 23.14 14.28 23.14s13.59-7.49 13.59-20.27zM612.56 131V98.39c0-8.17-2.65-11.75-9.1-11.75-4.49 0-9.21 3.57-12.2 7.37V131H578.94V79.73l12.31-2.88v8.52h.58c5.75-5.64 11.51-8.87 18.42-8.87 10.36 0 14.73 7.72 14.73 17.5V131zM663.98 131v-7.26h-.46c-3.8 5.64-9.1 8.98-16.81 8.98-7.71 0-14.28-5.75-14.28-14.17 0-10.94 10.36-16.47 28.66-20.85l2.89-.69v-2.42c0-8.29-2.3-11.63-9.1-11.63-4.84 0-10.13 3.22-14.5 9.33l-5.07-7.72c7.49-5.87 13.7-8.06 22.45-8.06 13.24 0 18.66 6.68 18.66 21.99V131zm0-28.32-2.77.81c-11.74 3.45-16.23 7.72-16.23 12.55 0 4.84 3.22 7.6 7.37 7.6 4.84 0 8.98-3.11 11.63-6.91zM687.54 131V53.71l12.31-3V131zM711.94 119.8c3.57 4.03 8.51 6.56 14.73 6.56 6.56 0 11.05-2.42 11.05-7.14 0-3.91-3-6.56-11.98-9.44-11.05-3.56-17.61-7.94-17.61-17.27 0-8.63 7.37-16 20.73-16 7.02 0 13.47 1.49 18.77 4.37l-3.68 8.52c-3.57-3.91-8.75-6.56-14.85-6.56-6.45 0-9.68 2.42-9.68 6.33 0 3.68 2.42 5.98 11.17 8.98 12.66 4.37 18.77 8.63 18.77 17.27 0 9.32-7.72 17.27-22.22 17.27-7.02 0-13.47-1.61-18.54-4.38z"/>
        <path fill="#CC2229" d="M60.49 158.32L1 125.72V28.71h61.45c25.23 0 45.77 20.22 45.77 45.06s-20.54 45.67-45.77 45.67H60.49zm-49.02-38.81 38.55 21.12V63.08L11.47 42.65zm49.02-10.54h1.96c19.47 0 35.25-15.79 35.25-35.2S81.9 39.18 62.45 39.18H27.29l33.2 17.61z"/>
      </svg>
      <span class="footer-detail" style="margin-top:1mm">Hibiscus Coast</span>
    </div>
  </div>

  <div class="red-rule"></div>

  <div class="grid">
    ${cards}
  </div>

  <div class="page-footer">
    <div>
      <div class="footer-name">Ed Scanlan &nbsp;·&nbsp; 021 814 578 &nbsp;·&nbsp; ed.scanlan@professionals.co.nz</div>
      <div class="footer-license">Meros Group Realty Ltd Licensed REAA 2008</div>
    </div>
    <div class="footer-detail">edscanlan.co.nz</div>
  </div>

</body>
</html>`;
}

export async function GET() {
  const { data: rawSales } = await supabase.from('recent_sales').select('*');
  const html = generateHtml((rawSales as Sale[]) || []);
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
