"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function AuthHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <div className="w-full border-b p-3 text-sm flex items-center justify-between">
      <div>OmniCRM</div>
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
          <a className="px-2 py-1 border rounded" href="/login">
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}
