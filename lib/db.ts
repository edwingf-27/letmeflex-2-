import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key for direct DB access
// This bypasses RLS and works over HTTP (no IPv4/IPv6 issues)

let _db: SupabaseClient | null = null;

function requireEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value || value === "placeholder") {
    throw new Error(`[DB_CONFIG_ERROR] Missing required env var: ${name}`);
  }
  return value;
}

function getDb(): SupabaseClient {
  if (!_db) {
    _db = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );
  }
  return _db;
}

// Export as `any` to avoid TypeScript errors with untyped tables
// All our tables (User, Generation, CreditLog, etc.) are custom and
// not in the generated Supabase types
export const db: any = new Proxy(
  {},
  {
    get(_target, prop) {
      return (getDb() as any)[prop];
    },
  }
);

// Helper to generate cuid-like IDs
export function generateId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 6)
  );
}
