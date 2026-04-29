import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const address = formData.get("address") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // Resize to max 1400px wide, convert to WebP at 82% quality
  const optimized = await sharp(buffer)
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const slug = (address || file.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `${slug}.webp`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("sale-images")
    .upload(fileName, optimized, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("sale-images")
    .getPublicUrl(fileName);

  return NextResponse.json({ publicUrl });
}
