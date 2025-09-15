"use client";

import type { JSX } from "react";
import { GmailEmailPreview } from "./GmailEmailPreview";
import type { EmailPreview, PreviewRange } from "./types";

interface EmailsSliceProps {
  emails: {
    emails: EmailPreview[];
    previewRange: PreviewRange | null;
    isLoading: boolean;
    error: Error | null;
  };
}

export function EmailsView({ emails }: EmailsSliceProps): JSX.Element {
  return (
    <div className="space-y-6">
      <GmailEmailPreview
        emails={emails.emails}
        isLoading={emails.isLoading}
        previewRange={emails.previewRange}
        error={emails.error}
      />
    </div>
  );
}
