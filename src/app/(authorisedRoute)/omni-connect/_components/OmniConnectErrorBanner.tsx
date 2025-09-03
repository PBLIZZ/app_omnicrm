"use client";

import { AlertCircle } from "lucide-react";

interface OmniConnectErrorBannerProps {
  error: string | null;
}

export function OmniConnectErrorBanner({ error }: OmniConnectErrorBannerProps): JSX.Element | null {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
      <AlertCircle className="h-5 w-5 text-red-600" />
      <span className="text-red-700">{error}</span>
    </div>
  );
}
