import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // publishable
const secret = env.SUPABASE_SECRET_KEY; // secret (server-only)

// RLS-honoring server client (use in request handlers acting on behalf of a user)
export const supabaseServerPublishable = createClient(url, pub);

// Admin client bypasses RLS. Never expose to client code.
export const supabaseServerAdmin = secret ? createClient(url, secret) : null;
