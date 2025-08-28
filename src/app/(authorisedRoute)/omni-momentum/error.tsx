"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("Omni-Momentum route error:", error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-red-100 to-orange-100">
              <Zap className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Your momentum hit a bump
          </CardTitle>
          <CardDescription className="text-base">
            Sometimes even the best wellness journeys encounter obstacles. Let's get you back on track.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">What happened?</h3>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while loading your Omni-Momentum dashboard. 
              This could be due to a temporary network issue or a problem with loading your wellness data.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2 text-blue-800">💡 Wellness Tip</h3>
            <p className="text-sm text-blue-700">
              Just like in your wellness practice, sometimes we need to pause, breathe, and begin again. 
              This moment of disruption is an opportunity to reset with intention.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Restore My Momentum
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Return to Dashboard</a>
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Technical Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-muted rounded text-xs font-mono">
                <p><strong>Error:</strong> {error.message}</p>
                {error.digest && <p><strong>Digest:</strong> {error.digest}</p>}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Calming background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-100/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}