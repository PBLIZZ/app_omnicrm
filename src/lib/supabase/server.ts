import { createClient } from "@supabase/supabase-js";
// Avoid importing env at module load to prevent build-time validation

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const pub = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"] ?? ""; // publishable
const secret = process.env["SUPABASE_SECRET_KEY"] ?? ""; // secret (server-only)

// RLS-honoring server client (use in request handlers acting on behalf of a user)
export const supabaseServerPublishable = createClient(url, pub);

// Admin client bypasses RLS. Never expose to client code.
export const supabaseServerAdmin = secret ? createClient(url, secret) : null;
