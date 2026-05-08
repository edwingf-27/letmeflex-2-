import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient;
let _supabase: SupabaseClient;

function requireEnv(
  name:
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "SUPABASE_SERVICE_ROLE_KEY"
    | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
): string {
  const value = process.env[name];
  if (!value || value === "placeholder") {
    throw new Error(`[SUPABASE_CONFIG_ERROR] Missing required env var: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
  }
  return _supabaseAdmin;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
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

export async function uploadGeneratedImages(
  userId: string,
  generationId: string,
  imageBuffers: Buffer[]
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < imageBuffers.length; i++) {
    const path = `${userId}/${generationId}-${i}.webp`;

    const { error } = await supabaseAdmin.storage
      .from("generations")
      .upload(path, imageBuffers[i], {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) throw new Error(`Upload failed for image ${i}: ${error.message}`);

    const { data } = supabaseAdmin.storage
      .from("generations")
      .getPublicUrl(path);

    urls.push(data.publicUrl);
  }

  return urls;
}

export async function deleteGeneratedImage(
  userId: string,
  generationId: string
): Promise<void> {
  const path = `${userId}/${generationId}.webp`;
  await supabaseAdmin.storage.from("generations").remove([path]);
}
