import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url, code, color = '#387f73' } = await req.json();
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(color);
  const dark = isValidHex ? color : '#387f73';

  const QRCode = (await import('qrcode')).default;
  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: 512,
    margin: 2,
    color: { dark, light: '#ffffff' },
  });

  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-${code || 'link'}.png"`,
    },
  });
}
