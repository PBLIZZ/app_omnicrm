import { createClient } from "@supabase/supabase-js";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const pub = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]!;
const secret = process.env["SUPABASE_SECRET_KEY"];

export const supabaseServerPublishable = createClient(url, pub); // honors RLS

export const supabaseServerAdmin = secret
  ? createClient(url, secret) // bypasses RLS; use sparingly (backfills, system jobs)
  : null;
