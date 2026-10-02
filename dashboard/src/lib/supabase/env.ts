// Inlined at build time, so both the server and the browser bundle can read them.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnv = () => {
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in dashboard/.env.local (see .env.example).",
    );
  }
  return { url, key };
};

/** Bucket holding the uploaded tariff book PDFs (created by supabase/schema.sql). */
export const TARIFF_BUCKET = "tariff-books";
