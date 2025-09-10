"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

/**
 * DashboardWidgets component displays a grid of widgets on the dashboard.
 * It combines all the individual widget components into a responsive layout.
 */
export function DashboardWidgets(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Top Row - 3 equal widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>AI Client Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Placeholder widget.</p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Daily Inspiration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Placeholder widget.</p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Therapist Check-In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Placeholder widget.</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Calendar Preview and AI Task Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Calendar Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Placeholder widget.</p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>AI Task Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Placeholder widget.</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Business Metrics (full width) */}
      <Card>
        <CardHeader>
          <CardTitle>Business Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Placeholder widget.</p>
        </CardContent>
      </Card>

      {/* Quick Actions Row */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Placeholder actions.</p>
        </CardContent>
      </Card>
    </div>
  );
}
