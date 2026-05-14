import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const FILE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "jpg",
  "image/heif": "jpg",
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    // Accepte "file" ou "image" comme nom de champ
    const file = (formData.get("file") ?? formData.get("image")) as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // HEIC peut être déclaré comme application/octet-stream sur certains appareils
    const isHeic = file.name?.toLowerCase().endsWith(".heic") || file.name?.toLowerCase().endsWith(".heif");
    const effectiveType = isHeic ? "image/heic" : file.type;

    if (!ALLOWED_TYPES.includes(effectiveType) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: jpeg, png, webp, heic" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const timestamp = Date.now();
    const extension = FILE_EXT_BY_TYPE[effectiveType] ?? FILE_EXT_BY_TYPE[file.type] ?? "jpg";
    const path = `${userId}/${timestamp}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // HEIC → on force le content-type en jpeg pour compatibilité FAL
    const uploadContentType = isHeic ? "image/jpeg" : (file.type || "image/jpeg");

    const { error: uploadError } = await supabaseAdmin.storage
      .from("source-images")
      .upload(path, buffer, {
        contentType: uploadContentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[SOURCE_IMAGE_UPLOAD_ERROR]", uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
  .from("source-images")
  .getPublicUrl(path);

return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error: any) {
    console.error("[SOURCE_IMAGE_ROUTE_ERROR]", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
