"use client";

import { SettingsCategoryCard } from "./_components/SettingsCategoryCard";
import { User, CreditCard, Bell, Tag, Sparkles, FileText, Plug } from "lucide-react";
import { useSyncStatus } from "@/hooks/use-sync-status";

/**
 * Settings Hub - Card-based navigation using progressive disclosure
 *
 * Design Principles:
 * - TaskCard-inspired gradient cards
 * - Wellness-friendly language
 * - Clear visual hierarchy
 * - Status indicators
 * - No hidden functionality (tabs removed)
 */
export default function SettingsPage(): JSX.Element {
  const { data: syncStatus } = useSyncStatus();

  // Calculate integration connection status
  const hasAnyIntegration = syncStatus?.gmail?.connected || syncStatus?.calendar?.connected;
  const integrationStatus = hasAnyIntegration ? "connected" : "disconnected";

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your practice, connect your tools, and customize your experience
        </p>
      </div>

      {/* Settings Categories Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Practice Profile */}
        <SettingsCategoryCard
          title="Practice Profile"
          description="Name, organization, photo for client communications"
          icon={User}
          href="/settings/profile"
          gradient="from-violet-100 via-purple-50 to-violet-100"
          borderColor="border-violet-400"
        />

        {/* Account & Security */}
        <SettingsCategoryCard
          title="Account & Security"
          description="Email, password, data management"
          icon={User}
          href="/settings/account"
          gradient="from-indigo-100 via-purple-50 to-indigo-100"
          borderColor="border-indigo-400"
        />

        {/* Plans & Payments */}
        <SettingsCategoryCard
          title="Plans & Payments"
          description="Subscription, billing, and usage tracking"
          icon={CreditCard}
          href="/settings/billing"
          gradient="from-amber-100 via-yellow-50 to-amber-100"
          borderColor="border-amber-400"
          badge="Free Plan"
        />

        {/* Connect Your Tools */}
        <SettingsCategoryCard
          title="Connect Your Tools"
          description="Gmail, Calendar, and integrations"
          icon={Plug}
          href="/settings/integrations"
          gradient="from-sky-100 via-blue-50 to-sky-100"
          borderColor="border-sky-400"
          status={integrationStatus}
        />

        {/* Stay Informed */}
        <SettingsCategoryCard
          title="Stay Informed"
          description="Alerts, reminders, and notifications"
          icon={Bell}
          href="/settings/notifications"
          gradient="from-rose-100 via-pink-50 to-rose-100"
          borderColor="border-rose-400"
        />

        {/* Label Your Work */}
        <SettingsCategoryCard
          title="Label Your Work"
          description="Organize with wellness tags"
          icon={Tag}
          href="/settings/tags"
          gradient="from-teal-100 via-cyan-50 to-teal-100"
          borderColor="border-teal-400"
        />

        {/* Getting Started Guide */}
        <SettingsCategoryCard
          title="Getting Started"
          description="Welcome guide and setup assistance"
          icon={Sparkles}
          href="/settings/welcome-guide"
          gradient="from-green-100 via-emerald-50 to-green-100"
          borderColor="border-green-400"
        />

        {/* Client Intake */}
        <SettingsCategoryCard
          title="Client Intake"
          description="Generate secure onboarding links"
          icon={FileText}
          href="/settings/onboarding"
          gradient="from-blue-100 via-indigo-50 to-blue-100"
          borderColor="border-blue-400"
        />
      </div>

      {/* Quick Tips Section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold mb-3">Quick Tips</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>Start with Your Practice:</strong> Complete your profile so clients can
              recognize you
            </p>
            <p>
              • <strong>Connect Gmail:</strong> Sync your emails to build stronger client
              relationships
            </p>
            <p>
              • <strong>Use Tags:</strong> Label clients and tasks with wellness categories for
              better organization
            </p>
            <p>
              • <strong>Stay Free:</strong> OmniCRM is free forever for wellness practitioners -
              enjoy unlimited clients
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
