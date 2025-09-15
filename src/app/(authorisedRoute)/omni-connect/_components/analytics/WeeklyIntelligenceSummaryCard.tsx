"use client";

import type { JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WeeklyIntelligenceSummaryCard(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 This Week&apos;s Intelligence Summary</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <ul className="list-disc pl-4 space-y-1">
          <li>47 emails processed and categorized</li>
          <li>12 client communications auto-organized</li>
          <li>3 new marketing insights saved to wiki</li>
          <li>2 email sequences running smoothly</li>
        </ul>
        <div className="pt-2">
          <Button size="sm" variant="outline">
            View More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
