"use client";

import type { JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AIInsightsCard(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>💡 AI Insights</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p>
          Actionable observations based on this week&apos;s communications, prioritized by impact on
          business goals.
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Follow up on 5 high‑value leads with no reply in 3 days.</li>
          <li>Clients mention “evening availability” 12× — consider adding later classes.</li>
          <li>Recurring billing questions up 18% — add a short FAQ to onboarding.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
