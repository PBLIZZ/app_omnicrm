import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rhythm Integrations - Omni Rhythm",
  description: "Manage your calendar and wellness platform integrations",
};

export default function RhythmIntegrationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-left space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-teal-900 dark:text-teal-100">
          Rhythm Integrations
        </h1>
        <p className="text-left text-muted-foreground text-lg mx-auto">
          Manage your calendar and wellness platform integrations
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Rhythm Integrations coming soon...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Connect Google Calendar, Apple Calendar, Outlook, and wellness platforms
          </p>
        </div>
      </div>
    </div>
  );
}