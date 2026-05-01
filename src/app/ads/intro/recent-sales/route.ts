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

const BED_ICON  = `<svg style="width:3.2mm;height:3.2mm;vertical-align:middle;margin-right:0.8mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17V9.5A1.5 1.5 0 013.5 8h17A1.5 1.5 0 0122 9.5V17"/><path d="M2 13h20"/><path d="M6 13V10a1 1 0 011-1h4a1 1 0 011 1v3"/><line x1="4" y1="17" x2="4" y2="19"/><line x1="20" y1="17" x2="20" y2="19"/></svg>`;
const BATH_ICON = `<svg style="width:3.2mm;height:3.2mm;vertical-align:middle;margin-right:0.8mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5" r="1" fill="currentColor" stroke="none"/><path d="M8 6v3"/><path d="M6 9h4"/><path d="M2 16h20v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1z"/><line x1="5" y1="19" x2="5" y2="21"/><line x1="19" y1="19" x2="19" y2="21"/></svg>`;
const CAR_ICON  = `<svg style="width:3.2mm;height:3.2mm;vertical-align:middle;margin-right:0.8mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l1.8-5.4A2 2 0 018.7 6h6.6a2 2 0 011.9 1.6L19 13"/><rect x="2" y="13" width="20" height="5" rx="1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

function renderCard(sale: Sale): string {
  const lastComma = sale.address.lastIndexOf(',');
  const street = lastComma > 0 ? sale.address.slice(0, lastComma).trim() : sale.address;
  const suburb = lastComma > 0 ? sale.address.slice(lastComma + 1).trim() : '';

  const feats: string[] = [];
  if (sale.beds)    feats.push(`${BED_ICON}${sale.beds}`);
  if (sale.baths)   feats.push(`${BATH_ICON}${sale.baths}`);
  if (sale.parking) feats.push(`${CAR_ICON}${sale.parking}`);

  return `<div class="card">
    <img class="card-img" src="${esc(sale.image!)}" alt="${esc(sale.address)}">
    <div class="sold-wrap"><div class="sold-band"><span class="sold-text">Sold</span></div></div>
    <div class="card-content">
      <p class="card-street">${esc(street)}</p>
      ${suburb ? `<p class="card-suburb">${esc(suburb)}</p>` : ''}
      ${feats.length ? `<div class="card-feats">${feats.join('<span class="feat-sep"> | </span>')}</div>` : ''}
    </div>
  </div>`;
}

function generateHtml(sales: Sale[]): string {
  const sorted = sortSales(sales.filter(s => s.image)).slice(0, 6);
  const cards  = sorted.map(s => renderCard(s)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Recent Sales — Ed Scanlan</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Source+Serif+4:ital,opsz,wght@0,8,400;1,8,400;1,8,700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4 portrait; margin: 0; }

    html, body {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
    }

    body {
      font-family: 'Poppins', sans-serif;
      background: #fff;
      color: #252525;
      display: flex;
      flex-direction: column;
      padding: 12mm 12mm 10mm;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* ── Pill tag — matches "Meet The Team" style from INTRO p.3 ── */
    .pill {
      display: inline-flex;
      align-items: center;
      background: #CC2229;
      padding: 1.5mm 5mm;
      margin-bottom: 4mm;
      flex-shrink: 0;
      align-self: flex-start;
    }
    .pill-text {
      font-family: 'Source Serif 4', Georgia, serif;
      font-style: italic;
      font-weight: 400;
      font-size: 11pt;
      color: #fff;
      letter-spacing: 0.02em;
    }

    /* ── Main heading — large, bold, two lines, no italic ── */
    .heading {
      flex-shrink: 0;
      margin-bottom: 6mm;
    }
    .heading-line {
      font-size: 52pt;
      font-weight: 800;
      color: #252525;
      line-height: 1.0;
      letter-spacing: -0.02em;
      display: block;
    }

    /* ── 2×3 card grid ── */
    .grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(3, 1fr);
      gap: 5mm;
      min-height: 0;
    }

    /* ── Card: cream background, diagonal-clipped image ── */
    .card {
      position: relative;
      background: #f2ede8;
      overflow: hidden;
    }

    /* Full-bleed image clipped diagonally — left cuts higher, right cuts lower */
    .card-img {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      clip-path: polygon(0 0, 100% 0, 100% 72%, 0 54%);
    }

    /* Sold diagonal band — top-right corner */
    .sold-wrap {
      position: absolute;
      top: 0; right: 0;
      width: 100%; height: 100%;
      overflow: hidden;
      pointer-events: none;
    }
    .sold-band {
      position: absolute;
      background: #CC2229;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 55%;
      height: 8mm;
      top: 8%;
      right: -14%;
      transform: rotate(35deg);
    }
    .sold-text {
      font-family: 'Source Serif 4', Georgia, serif;
      font-style: italic;
      font-weight: 400;
      font-size: 9pt;
      color: #fff;
      letter-spacing: 0.06em;
    }

    /* Content sits on the cream bg at the bottom of the card */
    .card-content {
      position: absolute;
      bottom: 0; left: 0;
      width: 55%;
      padding: 0 4mm 3.5mm;
    }
    .card-street {
      font-size: 8pt;
      font-weight: 700;
      color: #252525;
      line-height: 1.3;
      margin-bottom: 1mm;
    }
    .card-suburb {
      font-family: 'Source Serif 4', Georgia, serif;
      font-style: italic;
      font-size: 8pt;
      color: #CC2229;
      line-height: 1.2;
      margin-bottom: 1.5mm;
    }
    .card-feats {
      font-size: 7pt;
      font-weight: 500;
      color: #444;
      display: flex;
      align-items: center;
    }
    .feat-sep { color: #CC2229; margin: 0 1.5mm; font-weight: 300; }

    /* ── Footer tagline ── */
    .footer {
      flex-shrink: 0;
      margin-top: 5mm;
      text-align: right;
      font-size: 9pt;
      font-weight: 700;
      color: #252525;
      line-height: 1.4;
    }
    .footer em {
      color: #CC2229;
      font-style: normal;
    }

    /* Screen preview */
    @media screen {
      html { background: #888; min-height: 100vh; }
      body { margin: 20px auto; box-shadow: 0 4px 40px rgba(0,0,0,0.4); }
    }
    @media print {
      html, body { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>

  <div class="pill"><span class="pill-text">Sold Nearby</span></div>

  <div class="heading">
    <span class="heading-line">Recent</span>
    <span class="heading-line">Sales</span>
  </div>

  <div class="grid">
    ${cards}
  </div>

  <div class="footer">
    when results matter, trust someone who <em>delivers them.</em>
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
