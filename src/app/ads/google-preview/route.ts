import { NextResponse } from 'next/server';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Search Listing Preview</title>
  <style>
    body { background: #fff; font-family: Arial, sans-serif; padding: 40px; max-width: 680px; }
    .search-bar { display: flex; align-items: center; border: 1px solid #dfe1e5; border-radius: 24px; padding: 10px 18px; gap: 12px; margin-bottom: 32px; box-shadow: 0 1px 6px rgba(32,33,36,.28); }
    .search-bar svg { color: #9aa0a6; flex-shrink: 0; }
    .search-bar span { font-size: 16px; color: #202124; }
    .label { font-size: 12px; color: #70757a; margin-bottom: 16px; }
    .result { margin-bottom: 8px; }
    .result-url-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
    .favicon { width: 18px; height: 18px; background: #FF4753; border-radius: 50%; flex-shrink: 0; display: flex; }
    .favicon-inner { font-size: 9px; font-weight: 700; color: #fff; margin: auto; }
    .site-name { font-size: 14px; color: #202124; font-weight: 500; }
    .breadcrumb { font-size: 12px; color: #4d5156; }
    .result-title { font-size: 20px; color: #1a0dab; font-weight: 400; line-height: 1.3; cursor: pointer; margin-bottom: 4px; }
    .result-title:hover { text-decoration: underline; }
    .result-desc { font-size: 14px; color: #4d5156; line-height: 1.58; }
    .result-desc strong { color: #202124; font-weight: 700; }
    .sitelinks { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; margin-top: 10px; }
    .sitelink { padding: 8px 12px 8px 0; border-top: 1px solid #ebebeb; }
    .sitelink-title { font-size: 14px; color: #1a0dab; cursor: pointer; display: block; margin-bottom: 2px; }
    .sitelink-title:hover { text-decoration: underline; }
    .sitelink-desc { font-size: 12px; color: #4d5156; line-height: 1.4; }
    .divider { border: none; border-top: 1px solid #ebebeb; margin: 24px 0; }
    .note { font-size: 12px; color: #70757a; background: #f8f9fa; border: 1px solid #ebebeb; border-radius: 8px; padding: 12px 16px; line-height: 1.6; }
    .note strong { color: #202124; }
    code { background: #f1f3f4; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="search-bar">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <span>Ed Scanlan real estate Hibiscus Coast</span>
  </div>
  <div class="label">About 1,240 results (0.42 seconds)</div>
  <div class="result">
    <div class="result-url-row">
      <div class="favicon"><div class="favicon-inner">P</div></div>
      <div>
        <div class="site-name">Ed Scanlan — Professionals Hibiscus Coast</div>
        <div class="breadcrumb">leads.edscanlan.co.nz</div>
      </div>
    </div>
    <div class="result-title">Free Property Appraisal | Ed Scanlan — Hibiscus Coast Real Estate</div>
    <div class="result-desc">
      Get a <strong>free, no-pressure market appraisal</strong> from Ed Scanlan at Professionals Hibiscus Coast.
      Serving <strong>Orewa, Millwater, Milldale</strong> and <strong>Red Beach</strong>.
      20+ years marketing experience, 5-star client reviews.
    </div>
    <div class="sitelinks">
      <div class="sitelink">
        <a class="sitelink-title" href="https://leads.edscanlan.co.nz/#appraisal">Free Market Appraisal</a>
        <div class="sitelink-desc">No pressure. Get your home's estimated selling price instantly.</div>
      </div>
      <div class="sitelink">
        <a class="sitelink-title" href="https://leads.edscanlan.co.nz/#recent-sales">Recent Hibiscus Coast Sales</a>
        <div class="sitelink-desc">See proven local results — Orewa, Millwater, Red Beach &amp; Milldale.</div>
      </div>
      <div class="sitelink">
        <a class="sitelink-title" href="https://leads.edscanlan.co.nz/#about">Real Estate Expertise</a>
        <div class="sitelink-desc">20+ years marketing with NZ Herald &amp; NZME. Local for 17+ years.</div>
      </div>
    </div>
  </div>
  <hr class="divider">
  <div class="note">
    <strong>Note:</strong> Google auto-generates sitelinks based on site structure and click signals — they typically appear within a few weeks of indexing.
    Submit the sitemap at <strong>search.google.com/search-console</strong> to accelerate indexing.
    Validate structured data at <code>search.google.com/test/rich-results</code>.
  </div>
</body>
</html>`;

export async function GET() {
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
