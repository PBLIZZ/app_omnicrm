"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatWidget } from "@/components/chat/ChatWidget";

export default function Home() {
  const router = useRouter();
  return (
    <div className="px-6 py-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to OmniCRM</CardTitle>
            <CardDescription>
              Get started by connecting Google and previewing a sync, or open the AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => router.push("/settings/sync")}>Open Sync Settings</Button>
              <Button asChild variant="outline">
                <Link href="/test/google-oauth">Test Google OAuth</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Contacts</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">No contacts to display yet.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>Connect accounts and run syncs from settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Status panel coming soon.</div>
            </CardContent>
          </Card>
        </div>

        <ChatWidget />
      </div>
    </div>
  );
}
