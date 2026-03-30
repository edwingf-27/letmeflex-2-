import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient;
let _supabase: SupabaseClient;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
    );
  }
  return _supabaseAdmin;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
    );
  }
  return _supabase;
}

// Lazy proxies
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export async function uploadGeneratedImage(
  userId: string,
  generationId: string,
  imageBuffer: Buffer
): Promise<string> {
  const path = `${userId}/${generationId}.webp`;

  const { error } = await supabaseAdmin.storage
    .from("generations")
    .upload(path, imageBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage
    .from("generations")
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadFaceInput(
  userId: string,
  imageBuffer: Buffer
): Promise<string> {
  const path = `${userId}/latest.jpg`;

  const { error } = await supabaseAdmin.storage
    .from("face-inputs")
    .upload(path, imageBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error(`Face upload failed: ${error.message}`);

  const { data } = await supabaseAdmin.storage
    .from("face-inputs")
    .createSignedUrl(path, 3600); // 1hr expiry

  if (!data) throw new Error("Failed to create signed URL");
  return data.signedUrl;
}

export async function deleteGeneratedImage(
  userId: string,
  generationId: string
): Promise<void> {
  const path = `${userId}/${generationId}.webp`;
  await supabaseAdmin.storage.from("generations").remove([path]);
}
