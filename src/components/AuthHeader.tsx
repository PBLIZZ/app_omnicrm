"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function AuthHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }: { data: { user: { email?: string } | null } }) =>
        setEmail(data.user?.email ?? null),
      );
  }, []);

  return (
    <div className="w-full border-b p-3 text-sm flex items-center justify-between">
      <div className="font-semibold">OmniCRM</div>
      <nav className="hidden sm:flex items-center gap-4 text-muted-foreground">
        <Link href="/" className="hover:underline">
          Dashboard
        </Link>
        <Link href="/contacts" className="hover:underline">
          Contacts
        </Link>

        <Link href="/settings/sync" className="hover:underline">
          Settings
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        {email ? (
          <>
            <span>{email}</span>
            <button
              className="px-2 py-1 border rounded"
              onClick={() =>
                getSupabaseBrowser()
                  .auth.signOut()
                  .then(() => location.reload())
              }
            >
              Sign out
            </button>
          </>
        ) : (
          <Link className="px-2 py-1 border rounded" href="/login">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
