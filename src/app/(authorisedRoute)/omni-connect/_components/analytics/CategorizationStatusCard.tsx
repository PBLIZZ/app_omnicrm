"use client";

import type { JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CategorizationStatusCard(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🤖 Email Categorization Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between border rounded p-2">
          <span>✅ Client Communications</span>
          <span>23 emails • 94% conf</span>
        </div>
        <div className="flex justify-between border rounded p-2">
          <span>✅ Business Intelligence</span>
          <span>15 emails • 91% conf</span>
        </div>
        <div className="flex justify-between border rounded p-2">
          <span>✅ Educational Content</span>
          <span>31 emails • 87% conf</span>
        </div>
        <div className="flex justify-between border rounded p-2">
          <span>⏳ Pending Review</span>
          <span>7 emails • 65% conf</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline">
            🔍 Review Pending
          </Button>
          <Button size="sm" variant="secondary">
            📈 View Trends
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
