import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
  labels: string[];
}

interface PreviewRange {
  from: string;
  to: string;
}

interface RawEmailData {
  id?: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
  hasAttachments?: boolean;
  labels?: string[];
}

interface EmailSubjectData {
  id?: string;
  subject?: string;
  from?: string;
  date?: string;
}

interface GmailPreviewResponse {
  sampleEmails?: RawEmailData[];
  sampleSubjects?: EmailSubjectData[];
  dateRange?: { from: string; to: string };
}

export function useGmailEmails(
  isConnected: boolean,
  refreshTrigger?: number,
): {
  emails: EmailPreview[];
  previewRange: PreviewRange | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data: emailsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["gmail-emails", refreshTrigger],
    queryFn: async (): Promise<{ emails: EmailPreview[]; previewRange: PreviewRange | null }> => {
      const data = await apiClient.post<GmailPreviewResponse>("/api/sync/preview/gmail", {});

      let emails: EmailPreview[] = [];
      let previewRange: PreviewRange | null = null;

      // Handle rich emails format (from GmailConnectionCard)
      const richEmails: RawEmailData[] = Array.isArray(data.sampleEmails) ? data.sampleEmails : [];
      if (richEmails.length > 0) {
        emails = richEmails.slice(0, 5).map((e: RawEmailData, index: number) => ({
          id: e?.id ?? `email-${index}`,
          subject: e?.subject ?? `Email ${index + 1}`,
          from: e?.from ?? "Sample Sender",
          date: e?.date ?? new Date(Date.now() - index * 86400000).toISOString(),
          snippet: e?.snippet ?? "",
          hasAttachments: Boolean(e?.hasAttachments),
          labels: Array.isArray(e?.labels) ? e.labels : [],
        }));
      }
      // Handle sample subjects format (from OmniConnectPage)
      else if (
        data?.sampleSubjects &&
        Array.isArray(data.sampleSubjects) &&
        data.sampleSubjects.length > 0
      ) {
        emails = data.sampleSubjects
          .slice(0, 5)
          .map((emailObj: EmailSubjectData, index: number) => ({
            id: emailObj.id ?? `email-${index}`,
            subject: emailObj.subject ?? `Email ${index + 1}`,
            from: emailObj.from ?? "Sample Sender",
            date: emailObj.date ?? new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
            snippet: `This is a preview of email ${index + 1}...`,
            hasAttachments: false,
            labels: ["INBOX"],
          }));
      }

      // Compute preview range if emails exist
      if (emails.length > 0) {
        const from =
          data?.dateRange?.from ??
          new Date(
            Math.min(...emails.map((e) => new Date(e.date).getTime() || Date.now())),
          ).toISOString();
        const to =
          data?.dateRange?.to ??
          new Date(
            Math.max(...emails.map((e) => new Date(e.date).getTime() || Date.now())),
          ).toISOString();
        previewRange = { from, to };
      }

      return { emails, previewRange };
    },
    enabled: isConnected,
    retry: 2,
    staleTime: 60000, // 1 minute
  });

  return {
    emails: emailsData?.emails ?? [],
    previewRange: emailsData?.previewRange ?? null,
    isLoading,
    error,
    refetch,
  };
}
