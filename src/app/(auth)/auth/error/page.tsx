"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "Invalid authentication request. Please try again.",
  access_denied: "Access was denied. Please try again or contact support.",
  server_error: "A server error occurred. Please try again later.",
  temporarily_unavailable: "The service is temporarily unavailable. Please try again later.",
  oauth_init_failed: "Failed to initialize authentication. Please try again.",
  oauth_failed: "Authentication failed. Please try again.",
  server_misconfigured: "Server configuration error. Please contact support.",
};

export default function AuthErrorPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>("An authentication error occurred.");

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorDescription) {
      setErrorMessage(errorDescription);
    } else if (error && ERROR_MESSAGES[error]) {
      setErrorMessage(ERROR_MESSAGES[error]);
    } else if (error) {
      setErrorMessage(`Authentication error: ${error}`);
    }
  }, [searchParams]);

  const handleRetry = (): void => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-teal-50 p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-center text-sm text-gray-600">{errorMessage}</p>

          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full" variant="default">
              Return to Login
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500">
            If this problem persists, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
