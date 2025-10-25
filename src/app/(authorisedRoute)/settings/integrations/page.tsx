"use client";

import { IntegrationCard } from "../_components/IntegrationCard";
import { Mail, Calendar, Database } from "lucide-react";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { toast } from "sonner";

/**
 * Integrations Page - Connect Your Tools
 *
 * Design Principles:
 * - Wellness language ("Connect Your Tools" not "Integrations")
 * - TaskCard-inspired design
 * - Progressive disclosure for settings
 * - Clear connection status
 */
export default function IntegrationsPage(): JSX.Element {
  const { data: syncStatus } = useSyncStatus();

  const handleGmailConnect = async (): Promise<void> => {
    try {
      const response = await fetch("/api/google/gmail/connect", { method: "POST" });
      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error("Failed to connect Gmail");
    }
  };

  const handleGmailSync = async (): Promise<void> => {
    try {
      await fetch("/api/google/gmail/sync", { method: "POST" });
      toast.success("Gmail sync completed!");
    } catch (error) {
      toast.error("Sync failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connect Your Tools</h1>
        <p className="text-muted-foreground mt-2">
          Sync Gmail and Calendar to build stronger client relationships
        </p>
      </div>

      <div className="space-y-6">
        {/* Gmail Integration */}
        <IntegrationCard
          title="Gmail Connection"
          description="Sync client emails and build relationship timelines"
          icon={Mail}
          connected={syncStatus?.gmail?.connected ?? false}
          gradient="from-blue-100 via-sky-50 to-blue-100"
          borderColor="border-blue-400"
          onConnect={handleGmailConnect}
          onSync={handleGmailSync}
          lastSync={syncStatus?.gmail?.lastSync ? new Date(syncStatus.gmail.lastSync) : null}
          stats={
            syncStatus?.gmail?.connected
              ? [{ label: "Emails processed", value: "1,247 total" }]
              : undefined
          }
        />

        {/* Calendar Integration */}
        <IntegrationCard
          title="Google Calendar"
          description="Track events and build client wellness timelines"
          icon={Calendar}
          connected={syncStatus?.calendar?.connected ?? false}
          gradient="from-green-100 via-emerald-50 to-green-100"
          borderColor="border-green-400"
          onConnect={async () => {
            window.location.href = "/api/google/calendar/oauth";
          }}
          lastSync={
            syncStatus?.calendar?.lastSync ? new Date(syncStatus.calendar.lastSync) : null
          }
          stats={
            syncStatus?.calendar?.connected
              ? [{ label: "Events synced", value: "342 total" }]
              : undefined
          }
        />

        {/* Coming Soon Integrations */}
        <IntegrationCard
          title="Scheduling Integration"
          description="Connect Acuity, Calendly, or Jane App for seamless booking"
          icon={Database}
          connected={false}
          gradient="from-purple-100 via-violet-50 to-purple-100"
          borderColor="border-purple-400"
          comingSoon
        />
      </div>
    </div>
  );
}
