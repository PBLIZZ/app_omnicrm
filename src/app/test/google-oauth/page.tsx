export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Google OAuth Test Page - Temporarily Disabled
 *
 * This test page has been temporarily disabled because the Google OAuth
 * components it depends on have been removed from the codebase.
 */
export default function GoogleOAuthTestPage(): JSX.Element {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-4 w-4" aria-label="warning">
              ⚠️
            </span>
            Google OAuth Test Page - Temporarily Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This test interface has been temporarily disabled because the Google OAuth components it
            depends on have been removed from the codebase.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">What happened:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Google OAuth components were relocated or refactored</li>
              <li>• Test dependencies are no longer available at their previous paths</li>
              <li>• This page needs to be updated to reflect the new architecture</li>
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">For developers:</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              To re-enable this test interface, update the imports to reference the current Google
              OAuth component locations, or implement new testing components as needed.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/settings">Go to Settings</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
