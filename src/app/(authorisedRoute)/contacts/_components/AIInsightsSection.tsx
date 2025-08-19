"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  contactId: string;
}

export function AIInsightsSection({ contactId }: Props): JSX.Element {
  const [tab, setTab] = useState<"summary" | "next" | "risk" | "persona">("summary");

  return (
    <Card className="border-violet-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>Analysis for contact {contactId}</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            Refresh
          </Button>
        </div>
        <div className="flex items-center border rounded-lg p-1 w-fit mt-3">
          {(
            [
              { k: "summary", l: "Summary" },
              { k: "next", l: "Next Steps" },
              { k: "risk", l: "Risk" },
              { k: "persona", l: "Client Profile" },
            ] as Array<{ k: "summary" | "next" | "risk" | "persona"; l: string }>
          ).map((t) => (
            <Button
              key={t.k}
              size="sm"
              variant={tab === t.k ? "default" : "ghost"}
              onClick={() => setTab(t.k)}
              className="h-8"
            >
              {t.l}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Insights will appear here once generated.
        </div>
      </CardContent>
    </Card>
  );
}
