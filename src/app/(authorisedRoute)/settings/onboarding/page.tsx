import { Suspense, memo } from "react";
import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenGeneratorSection } from "./_components/TokenGeneratorSection";
import { ActiveTokensList } from "./_components/ActiveTokensList";

export const metadata: Metadata = {
  title: "Client Onboarding | Settings",
  description: "Generate secure onboarding links for new clients",
};

export default function OnboardingSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client Onboarding</h1>
        <p className="text-muted-foreground mt-2">
          Generate secure links for new clients to complete their intake forms and upload photos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Token Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Link</CardTitle>
            <CardDescription>Create a secure onboarding link for a new client</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<TokenGeneratorSkeleton />}>
              <TokenGeneratorSection />
            </Suspense>
          </CardContent>
        </Card>

        {/* Active Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Active Links</CardTitle>
            <CardDescription>Manage and track your active onboarding links</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ActiveTokensSkeleton />}>
              <ActiveTokensList />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">1</span>
              </div>
              <h3 className="font-medium">Generate Link</h3>
              <p className="text-sm text-muted-foreground">
                Create a secure, time-limited onboarding link for your client.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">2</span>
              </div>
              <h3 className="font-medium">Share with Client</h3>
              <p className="text-sm text-muted-foreground">
                Send the link via email, text, or share it directly with your client.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">3</span>
              </div>
              <h3 className="font-medium">Client Completes</h3>
              <p className="text-sm text-muted-foreground">
                Your client fills out their information and uploads a photo securely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading skeletons - memoized to prevent unnecessary re-creation
const TokenGeneratorSkeleton = memo(function TokenGeneratorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
});

const ActiveTokensSkeleton = memo(function ActiveTokensSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 p-3 border rounded">
          <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
});
