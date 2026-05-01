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
const SUBURBS = ['Orewa', 'Millwater', 'Milldale', 'Red Beach'] as const;
type Suburb = typeof SUBURBS[number];

const PROXIMITY: Record<Suburb, Suburb[]> = {
  'Orewa':     ['Orewa', 'Red Beach', 'Millwater', 'Milldale'],
  'Millwater': ['Millwater', 'Milldale', 'Orewa', 'Red Beach'],
  'Milldale':  ['Milldale', 'Millwater', 'Orewa', 'Red Beach'],
  'Red Beach': ['Red Beach', 'Orewa', 'Millwater', 'Milldale'],
};

const QR_MAP: Record<Suburb, { id: string; url: string }> = {
  'Orewa':     { id: 'pr-qr-orewa',     url: 'https://edscanlan.co.nz?suburb=Orewa&utm_medium=print' },
  'Millwater': { id: 'pr-qr-millwater', url: 'https://edscanlan.co.nz?suburb=Millwater&utm_medium=print' },
  'Milldale':  { id: 'pr-qr-milldale',  url: 'https://edscanlan.co.nz?suburb=Milldale&utm_medium=print' },
  'Red Beach': { id: 'pr-qr-redbeach',  url: 'https://edscanlan.co.nz?suburb=Red+Beach&utm_medium=print' },
};

const BED_ICON  = `<svg style="width:4.5mm;height:4.5mm;vertical-align:middle;margin-right:0.75mm;display:inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17V9.5A1.5 1.5 0 013.5 8h17A1.5 1.5 0 0122 9.5V17"/><path d="M2 13h20"/><path d="M6 13V10a1 1 0 011-1h4a1 1 0 011 1v3"/><line x1="4" y1="17" x2="4" y2="19"/><line x1="20" y1="17" x2="20" y2="19"/></svg>`;
const BATH_ICON = `<svg style="width:4.5mm;height:4.5mm;vertical-align:middle;margin-right:0.75mm;display:inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5" r="1" fill="currentColor" stroke="none"/><path d="M8 6v3"/><path d="M6 9h4"/><line x1="5" y1="11" x2="5" y2="12"/><line x1="7" y1="12" x2="7" y2="13"/><line x1="9" y1="11" x2="9" y2="12"/><path d="M2 16h20v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1z"/><line x1="5" y1="19" x2="5" y2="21"/><line x1="19" y1="19" x2="19" y2="21"/></svg>`;
const CAR_ICON  = `<svg style="width:4.5mm;height:4.5mm;vertical-align:middle;margin-right:0.75mm;display:inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l1.8-5.4A2 2 0 018.7 6h6.6a2 2 0 011.9 1.6L19 13"/><rect x="2" y="13" width="20" height="5" rx="1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><line x1="9" y1="18" x2="15" y2="18"/><path d="M9 9.5h6"/></svg>`;

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function detectSuburb(address: string): string {
  const l = address.toLowerCase();
  if (l.includes('red beach'))  return 'Red Beach';
  if (l.includes('orewa'))      return 'Orewa';
  if (l.includes('millwater'))  return 'Millwater';
  if (l.includes('milldale'))   return 'Milldale';
  return 'Other';
}

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

function getSalesForSuburb(sales: Sale[], suburb: Suburb): Sale[] {
  const order = PROXIMITY[suburb];
  const result: Sale[] = [];
  const used = new Set<number>();
  for (const s of order) {
    if (result.length >= 3) break;
    for (const sale of sales) {
      if (result.length >= 3) break;
      if (!used.has(sale.id) && detectSuburb(sale.address) === s) {
        result.push(sale);
        used.add(sale.id);
      }
    }
  }
  return result;
}

function renderSaleTile(sale: Sale | null): string {
  if (!sale) return `<div class="sale-tile"></div>`;

  const lastComma = sale.address.lastIndexOf(',');
  const street = lastComma > 0 ? sale.address.slice(0, lastComma).trim() : sale.address;
  const suburb = lastComma > 0 ? sale.address.slice(lastComma + 1).trim() : '';

  const feats: string[] = [];
  if (sale.beds)    feats.push(`<span class="feat">${BED_ICON}${esc(String(sale.beds))}</span>`);
  if (sale.baths)   feats.push(`<span class="feat">${BATH_ICON}${esc(String(sale.baths))}</span>`);
  if (sale.parking) feats.push(`<span class="feat">${CAR_ICON}${esc(String(sale.parking))}</span>`);

  return `<div class="sale-tile">
    <div class="tile-img-wrap">
      ${sale.image ? `<img class="tile-img" src="${esc(sale.image)}" alt="${esc(sale.address)}">` : ''}
      <div class="sold-wrap"><div class="sold-band"><span class="sold-text">Sold</span></div></div>
      ${sale.days ? `<div class="tile-month-pill">${esc(sale.days)}</div>` : ''}
    </div>
    <div class="tile-content">
      <p class="tile-addr">${esc(street)}${suburb ? `,<br><span class="tile-sub">${esc(suburb)}</span>` : ''}</p>
      ${feats.length ? `<div class="tile-feats">${feats.join('<span class="feat-sep">|</span>')}</div>` : ''}
    </div>
  </div>`;
}

function renderFront(suburb: Suburb, idx: number): string {
  const qr = QR_MAP[suburb];
  const qrId = `${qr.id}-${idx}`;
  return `<div class="dle dle-front">
    <div class="col-agent">
      <img class="agent-img" src="https://edscanlan.co.nz/agent_transparent.webp" alt="Ed Scanlan">
    </div>
    <div class="col-content">
      <div class="headline-block">
        <span class="check-your">Check Your</span>
        <span class="suburb-name">${esc(suburb)}</span>
        <span class="selling-price">Home&rsquo;s Estimated Selling Price</span>
      </div>
      <div class="red-rule"></div>
      <div class="quote-block">
        <p class="quote">Free Market Appraisal</p>
        <span class="quote-body">No Pressure. Just Real, Local Insight.</span>
      </div>
      <div class="logo-area">
        <svg aria-label="Professionals Hibiscus Coast" style="width:71mm;height:18mm;display:block"><use href="#prof-logo"/></svg>
      </div>
    </div>
    <div class="col-qr">
      <div class="qr-wrap"><div id="${qrId}"></div></div>
      <span class="qr-cta">Scan to find your<br>home&rsquo;s value</span>
      <div class="contact-block">
        <span class="contact-name">Ed Scanlan</span>
        <span class="contact-phone">021 814 578</span>
        <span class="contact-license">Meros Group Realty Licenced REAA (2008)</span>
      </div>
    </div>
  </div>`;
}

function renderBack(suburb: Suburb, sales: Sale[]): string {
  const tiles = [0, 1, 2].map(i => renderSaleTile(sales[i] ?? null)).join('<div class="tile-sep"></div>');
  return `<div class="dle dle-back">
    <div class="back-header">
      <div class="bh-heading">
        <span class="bh-suburb">Hibiscus Coast</span>
        <span class="bh-title">Recent Results</span>
      </div>
      <div class="bh-spacer"></div>
      <div class="bh-tagline">Proven local results by Ed Scanlan &middot; 021 814 578</div>
    </div>
    <div class="back-red-rule"></div>
    <div class="sales-row">${tiles}</div>
  </div>`;
}

function a4Page(dles: string[], isFirst: boolean): string {
  const pageBreak = isFirst ? '' : 'page-break';
  return `<div class="a4 ${pageBreak}">
    ${dles.join('\n')}
    <div class="crop-line" style="top:99mm"></div>
    <div class="crop-line" style="top:198mm"></div>
  </div>`;
}

function generateHtml(sales: Sale[]): string {
  const sorted = sortSales(sales.filter(s => s.image));

  // 2 A4 pages per suburb: 3× front then 3× back
  const pages = SUBURBS.flatMap((suburb, i) => {
    const fronts = [0, 1, 2].map(idx => renderFront(suburb, idx));
    const back   = renderBack(suburb, getSalesForSuburb(sorted, suburb));
    return [
      a4Page(fronts, i === 0),
      a4Page([back, back, back], false),
    ];
  });

  const pagesHtml = pages.join('\n');

  const qrScript = SUBURBS.flatMap(s => {
    const qr = QR_MAP[s];
    return [0, 1, 2].map(idx => `makeQR('${qr.id}-${idx}', '${qr.url}');`);
  }).join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ed Scanlan DLE Flyers — Print Ready</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&family=Source+Serif+4:ital,opsz,wght@1,8,400;1,8,700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Screen wrapper ── */
    body {
      background: #222;
      font-family: 'Poppins', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: 40px 0;
    }

    .screen-header {
      color: #aaa;
      font-size: 12px;
      text-align: center;
      margin-bottom: 24px;
      line-height: 1.8;
    }
    .screen-header strong { color: #FF4753; }
    .screen-header code { background: #333; color: #FF4753; padding: 1px 6px; border-radius: 3px; font-size: 11px; }

    /* ── A4 page container ── */
    .a4 {
      width: 210mm;
      height: 297mm;
      background: #fff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      margin-bottom: 24px;
    }

    .page-label {
      position: absolute;
      top: -22px;
      left: 0;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #666;
    }

    /* ── Crop marks ── */
    .crop-line {
      position: absolute;
      left: 0;
      width: 210mm;
      height: 0;
      border-top: 0.3mm dashed rgba(0,0,0,0.25);
      pointer-events: none;
    }

    /* ══════════════════════════════════
       DLE — 210mm × 99mm
    ══════════════════════════════════ */
    .dle {
      width: 210mm;
      height: 99mm;
      flex-shrink: 0;
      overflow: hidden;
      position: relative;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .dle-empty { background: #f8f8f8; }

    /* ── FRONT: layout ── */
    .dle-front {
      display: flex;
      flex-direction: row;
      background: #373D40;
    }

    .col-agent {
      width: 62mm;
      flex-shrink: 0;
      overflow: hidden;
      background: #373D40;
    }
    .agent-img { width: 100%; height: 100%; object-fit: cover; object-position: 60% top; display: block; }

    .col-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 6.75mm 5.25mm 6mm 6.75mm;
      overflow: hidden;
    }
    .headline-block { display: flex; flex-direction: column; }
    .check-your    { font-size: 10.5pt; font-weight: 400; color: #fff; letter-spacing: 0.04em; line-height: 1.6; }
    .suburb-name   { font-family: 'Source Serif 4', Georgia, serif; font-size: 42pt; font-weight: 700; font-style: italic; color: #FF4753; letter-spacing: -0.01em; line-height: 1; white-space: nowrap; }
    .selling-price { font-size: 9.5pt; font-weight: 700; color: #fff; line-height: 1.35; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 1.5mm; }
    .red-rule      { width: 100%; height: 0.75mm; background: #FF4753; flex-shrink: 0; }
    .quote-block   { display: flex; flex-direction: column; }
    .quote         { font-size: 11.5pt; font-weight: 700; color: #FF4753; font-family: 'Source Serif 4', Georgia, serif; font-style: italic; line-height: 1.3; }
    .quote-body    { font-family: 'Poppins', sans-serif; font-style: normal; font-weight: 400; font-size: 10pt; color: #fff; display: block; margin-top: 1mm; line-height: 1.5; }
    .logo-area     { flex-shrink: 0; }

    .col-qr {
      width: 55.5mm;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2.5mm;
      padding: 5.25mm;
      background: rgba(0,0,0,0.22);
      border-left: 0.375mm solid rgba(255,255,255,0.06);
    }
    .qr-wrap { background: #fff; border-radius: 2.25mm; padding: 2.25mm; display: inline-flex; flex-shrink: 0; }
    .qr-wrap svg, .qr-wrap img { display: block; width: 28.5mm; height: 28.5mm; }
    .qr-cta { font-size: 9.5pt; font-weight: 700; color: #FF4753; font-family: 'Source Serif 4', Georgia, serif; font-style: italic; text-align: center; line-height: 1.4; }
    .contact-block { width: 100%; border-top: 0.375mm solid rgba(255,255,255,0.1); padding-top: 2.625mm; display: flex; flex-direction: column; align-items: center; gap: 0.375mm; }
    .contact-name  { font-size: 10.5pt; font-weight: 700; color: #fff; text-align: center; }
    .contact-phone { font-size: 10.5pt; font-weight: 600; color: #fff; text-align: center; }
    .contact-license { font-size: 6pt; font-weight: 400; color: #fff; text-align: center; line-height: 1.4; margin-top: 0.375mm; white-space: nowrap; }

    /* ── BACK: layout ── */
    .dle-back {
      display: flex;
      flex-direction: column;
      background: #373D40;
    }

    .back-header {
      height: 17mm;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      padding: 0 5.25mm;
      gap: 3.75mm;
      background: rgba(0,0,0,0.2);
    }
    .bh-heading  { display: flex; flex-direction: column; gap: 0.375mm; }
    .bh-suburb   { font-family: 'Source Serif 4', Georgia, serif; font-style: italic; font-weight: 700; font-size: 18pt; color: #FF4753; line-height: 1; }
    .bh-title    { font-size: 9pt; font-weight: 600; color: #fff; letter-spacing: 0.1em; text-transform: uppercase; }
    .bh-spacer   { flex: 1; }
    .bh-tagline  { font-size: 9.5pt; color: #fff; text-align: right; line-height: 1; font-weight: 400; white-space: nowrap; }

    .back-red-rule { width: 100%; height: 0.75mm; background: #FF4753; flex-shrink: 0; }

    .sales-row { display: flex; flex: 1; min-height: 0; padding: 2.25mm; gap: 1.875mm; }

    .sale-tile { flex: 1; background: #373D40; overflow: hidden; display: flex; flex-direction: column; min-width: 0; }
    .tile-sep  { width: 0.375mm; background: rgba(255,255,255,0.25); align-self: stretch; flex-shrink: 0; }

    .tile-img-wrap { position: relative; flex: 0 0 58%; overflow: hidden; }
    .tile-img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .sold-wrap { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    .sold-band {
      position: absolute;
      background: #FF4753;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 220%;
      height: 15mm;
      top: 2%;
      left: -30%;
      transform: rotate(45deg);
    }
    .sold-text { font-family: 'Source Serif 4', Georgia, serif; font-style: italic; font-weight: 400; font-size: 17pt; color: #fff; letter-spacing: 0.02em; }

    .tile-month-pill {
      position: absolute; top: 1.875mm; left: 1.875mm;
      background: #FF4753; border-radius: 7.5mm;
      padding: 1.125mm 3mm;
      font-family: 'Source Serif 4', Georgia, serif; font-style: italic; font-weight: 400; font-size: 9.5pt; color: #fff;
    }

    .tile-content { flex: 1; padding: 3.75mm 3mm 2.25mm; display: flex; flex-direction: column; justify-content: flex-start; gap: 1.5mm; }
    .tile-addr  { font-size: 10.5pt; font-weight: 700; color: #fff; line-height: 1.3; }
    .tile-sub   { font-family: 'Source Serif 4', Georgia, serif; font-style: italic; font-weight: 400; color: #FF4753; }
    .tile-feats { display: flex; align-items: center; gap: 1.125mm; font-size: 9.5pt; font-weight: 600; color: #fff; flex-wrap: nowrap; }
    .feat       { display: flex; align-items: center; }
    .feat-sep   { color: #FF4753; font-weight: 300; font-size: 11pt; line-height: 1; }

    /* ── Print ── */
    @page { size: A4 portrait; margin: 0; }

    @media print {
      body { background: none; padding: 0; gap: 0; }
      .screen-header { display: none; }
      .a4 { box-shadow: none; margin-bottom: 0; break-after: page; }
      .page-label { display: none; }
      .dle, .dle-front, .dle-back {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

<svg style="display:none" aria-hidden="true">
  <defs>
    <symbol id="prof-logo" viewBox="0 0 750 187.5" preserveAspectRatio="xMidYMid meet">
      <path fill="#fff" d="M157.07 131V59.13l23.59-.46c19.22-.35 28.77 9.1 28.77 20.73 0 15.77-13.93 24.29-29.82 24.29-2.65 0-5.98-.23-8.51-.46V131zm14.05-65.63v31.32c2.19.46 4.95.7 7.83.7 8.97 0 15.54-6.22 15.54-15.9 0-9.67-6.1-16.12-16.01-16.12zM216.5 131V79.73l12.31-2.88v10.25h.58c3-6.91 7.83-10.59 13.93-10.59 2.65 0 5.18.7 7.37 1.96l-2.3 11.63c-2.07-2.3-4.38-3.68-7.49-3.68-5.41 0-10.24 5.53-12.09 16.8V131zm35.84-25.7c0-16.35 11.17-28.79 28.09-28.79s28.33 11.63 28.33 27.41c0 15.77-11.17 28.78-28.08 28.78-16.92 0-26.34-11.63-26.34-27.4zm41.1.81c0-16-6.33-23.14-14.4-23.14-8.06 0-13.46 7.37-13.46 20.27 0 15.89 6.33 23.14 14.28 23.14s13.58-7.49 13.58-20.27zM316.55 131V84.92h-8.4v-6.68h8.4v-2.54c0-17.38 7.6-24.98 20.49-24.98 5.41 0 10.36 1.96 14.5 4.49l-3.91 8.4c-2.19-3.68-5.76-6.44-9.91-6.44-5.64 0-8.75 4.26-8.75 13.01v8.06h15.19v6.68H328.98V131zm76.52-4.37c-4.49 3.8-10.24 6.1-18.65 6.1-15.54 0-26.47-10.82-26.47-27.41 0-16.58 11.4-28.78 26.36-28.78 14.96 0 22.1 9.1 22.1 21.64 0 1.5-.12 3.8-.46 5.64H361.3c0 12.21 5.75 22.22 16.92 22.22 4.49 0 8.52-1.73 11.86-4.61zM383.75 97.93c0-9.21-3.11-15.08-9.91-15.08-5.41 0-10.59 5.64-12.2 15.08zM405.59 119.8c3.56 4.03 8.51 6.56 14.73 6.56 6.56 0 11.05-2.42 11.05-7.14 0-3.91-3-6.56-11.98-9.44-11.05-3.56-17.6-7.94-17.6-17.27 0-8.63 7.37-16 20.73-16 7.02 0 13.47 1.49 18.77 4.37l-3.68 8.52c-3.56-3.91-8.75-6.56-14.85-6.56-6.45 0-9.68 2.42-9.68 6.33 0 3.68 2.42 5.98 11.17 8.98 12.66 4.37 18.42 8.63 18.42 17.27 0 9.32-7.72 17.27-22.22 17.27-7.02 0-13.47-1.61-18.54-4.38zM450.7 119.8c3.56 4.03 8.51 6.56 14.73 6.56 6.56 0 11.05-2.42 11.05-7.14 0-3.91-3-6.56-11.98-9.44-11.05-3.56-17.6-7.94-17.6-17.27 0-8.63 7.37-16 20.73-16 7.02 0 13.47 1.49 18.77 4.37l-3.68 8.52c-3.56-3.91-8.75-6.56-14.85-6.56-6.45 0-9.68 2.42-9.68 6.33 0 3.68 2.42 5.98 11.17 8.98 12.66 4.37 18.42 8.63 18.42 17.27 0 9.32-7.72 17.27-22.22 17.27-7.02 0-13.47-1.61-18.54-4.38zM494.28 60.28c0-4.49 3.57-8.06 7.83-8.06s7.83 3.57 7.83 8.06-3.57 7.94-7.83 7.94-7.83-3.57-7.83-7.94zm1.61 70.69V79.73l12.43-2.88V131zM516.29 105.3c0-16.35 11.17-28.79 28.09-28.79s28.33 11.63 28.33 27.41c0 15.77-11.17 28.78-28.08 28.78-16.93 0-26.34-11.63-26.34-27.4zm41.1.81c0-16-6.33-23.14-14.4-23.14s-13.47 7.37-13.47 20.27c0 15.89 6.33 23.14 14.28 23.14s13.59-7.49 13.59-20.27zM612.56 131V98.39c0-8.17-2.65-11.75-9.1-11.75-4.49 0-9.21 3.57-12.2 7.37V131H578.94V79.73l12.31-2.88v8.52h.58c5.75-5.64 11.51-8.87 18.42-8.87 10.36 0 14.73 7.72 14.73 17.5V131zM663.98 131v-7.26h-.46c-3.8 5.64-9.1 8.98-16.81 8.98-7.71 0-14.28-5.75-14.28-14.17 0-10.94 10.36-16.47 28.66-20.85l2.89-.69v-2.42c0-8.29-2.3-11.63-9.1-11.63-4.84 0-10.13 3.22-14.5 9.33l-5.07-7.72c7.49-5.87 13.7-8.06 22.45-8.06 13.24 0 18.66 6.68 18.66 21.99V131zm0-28.32-2.77.81c-11.74 3.45-16.23 7.72-16.23 12.55 0 4.84 3.22 7.6 7.37 7.6 4.84 0 8.98-3.11 11.63-6.91zM687.54 131V53.71l12.31-3V131zM711.94 119.8c3.57 4.03 8.51 6.56 14.73 6.56 6.56 0 11.05-2.42 11.05-7.14 0-3.91-3-6.56-11.98-9.44-11.05-3.56-17.61-7.94-17.61-17.27 0-8.63 7.37-16 20.73-16 7.02 0 13.47 1.49 18.77 4.37l-3.68 8.52c-3.57-3.91-8.75-6.56-14.85-6.56-6.45 0-9.68 2.42-9.68 6.33 0 3.68 2.42 5.98 11.17 8.98 12.66 4.37 18.77 8.63 18.77 17.27 0 9.32-7.72 17.27-22.22 17.27-7.02 0-13.47-1.61-18.54-4.38z"/>
      <path fill="#FF4753" d="M60.49 158.32L1 125.72V28.71h61.45c25.23 0 45.77 20.22 45.77 45.06s-20.54 45.67-45.77 45.67H60.49zm-49.02-38.81 38.55 21.12V63.08L11.47 42.65zm49.02-10.54h1.96c19.47 0 35.25-15.79 35.25-35.2S81.9 39.18 62.45 39.18H27.29l33.2 17.61z"/>
    </symbol>
  </defs>
</svg>

<div class="screen-header">
  <strong>Ed Scanlan DLE — Print-Ready A4 PDF</strong><br>
  8 pages &nbsp;·&nbsp; 3-up per A4 &nbsp;·&nbsp; Front then back per suburb &nbsp;·&nbsp; Dashed lines = cut marks<br>
  <strong>To export:</strong> File → Print → Save as PDF &nbsp;·&nbsp; Enable <code>Background graphics</code> in More settings
</div>

${pagesHtml}

<script>
  function makeQR(elementId, url) {
    var qr = qrcode(0, 'H');
    qr.addData(url);
    qr.make();
    var el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    var svg = el.querySelector('svg');
    if (svg) { svg.style.width = '28.5mm'; svg.style.height = '28.5mm'; }
  }
  ${qrScript}
</script>

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
