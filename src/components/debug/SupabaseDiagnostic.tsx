"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

interface DiagnosticResult {
  envVars: {
    url: string | undefined;
    key: string | undefined;
  };
  clientStatus: "success" | "error";
  clientError?: string;
  authStatus: "loading" | "success" | "error";
  authError?: string;
  authUser?: { id: string; email?: string } | undefined;
}

export function SupabaseDiagnostic(): JSX.Element {
  const [result, setResult] = useState<DiagnosticResult>({
    envVars: {
      url: undefined,
      key: undefined,
    },
    clientStatus: "error",
    authStatus: "loading",
  });

  useEffect(() => {
    async function runDiagnostic(): Promise<void> {
      // Check environment variables
      const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
      const key = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'];

      const newResult: DiagnosticResult = {
        envVars: { url, key },
        clientStatus: "error",
        authStatus: "loading",
      };

      try {
        // Test Supabase client creation
        const client = getSupabaseBrowser();
        newResult.clientStatus = "success";

        // Test auth
        try {
          const { data, error } = await client.auth.getUser();
          if (error) {
            newResult.authStatus = "error";
            newResult.authError = error.message;
          } else {
            newResult.authStatus = "success";
            newResult.authUser = data.user
              ? {
                  id: data.user.id,
                  ...(data.user.email ? { email: data.user.email } : {})
                }
              : undefined;
          }
        } catch (authErr) {
          newResult.authStatus = "error";
          newResult.authError = authErr instanceof Error ? authErr.message : String(authErr);
        }
      } catch (clientErr) {
        newResult.clientStatus = "error";
        newResult.clientError = clientErr instanceof Error ? clientErr.message : String(clientErr);
      }

      setResult(newResult);
    }

    void runDiagnostic();
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return <div className="text-xs text-gray-500">Diagnostics only available in development</div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border text-sm">
      <h3 className="font-semibold mb-3">Supabase Diagnostic</h3>

      <div className="space-y-3">
        {/* Environment Variables */}
        <div>
          <h4 className="font-medium">Environment Variables</h4>
          <div className="mt-1 space-y-1 text-xs">
            <div>
              NEXT_PUBLIC_SUPABASE_URL:{" "}
              <span className={result.envVars.url ? "text-green-600" : "text-red-600"}>
                {result.envVars.url ? "✓ Set" : "✗ Missing"}
              </span>
            </div>
            <div>
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:{" "}
              <span className={result.envVars.key ? "text-green-600" : "text-red-600"}>
                {result.envVars.key ? "✓ Set" : "✗ Missing"}
              </span>
            </div>
          </div>
        </div>

        {/* Client Status */}
        <div>
          <h4 className="font-medium">Client Creation</h4>
          <div className="mt-1 text-xs">
            Status:{" "}
            <span className={result.clientStatus === "success" ? "text-green-600" : "text-red-600"}>
              {result.clientStatus === "success" ? "✓ Success" : "✗ Failed"}
            </span>
            {result.clientError && <div className="text-red-600 mt-1">{result.clientError}</div>}
          </div>
        </div>

        {/* Auth Status */}
        <div>
          <h4 className="font-medium">Authentication</h4>
          <div className="mt-1 text-xs">
            Status:{" "}
            <span
              className={
                result.authStatus === "success"
                  ? "text-green-600"
                  : result.authStatus === "error"
                    ? "text-red-600"
                    : "text-yellow-600"
              }
            >
              {result.authStatus === "success"
                ? "✓ Success"
                : result.authStatus === "error"
                  ? "✗ Failed"
                  : "⏳ Loading"}
            </span>
            {result.authError && <div className="text-red-600 mt-1">{result.authError}</div>}
            {result.authUser && (
              <div className="text-green-600 mt-1">
                User: {result.authUser.email ?? result.authUser.id}
              </div>
            )}
            {result.authStatus === "success" && !result.authUser && (
              <div className="text-yellow-600 mt-1">No authenticated user</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        This diagnostic runs automatically to help debug authentication issues.
      </div>
    </div>
  );
}