"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { toast } from "sonner";
import { runJobs } from "@/lib/api/sync";

export default function ImportDataPage(): JSX.Element {
  const [dataType, setDataType] = useState<string>("email");
  const [rawData, setRawData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      switch (dataType) {
        case "email": {
          // A more robust regex might be needed for real-world parsing
          const fromMatch = rawData.match(/^From: (.*)$/m);
          const toMatch = rawData.match(/^To: (.*)$/m);
          const dateMatch = rawData.match(/^Date: (.*)$/m);
          const bodyMatch = rawData.match(/\n\n([\s\S]*)/);

          if (!fromMatch || !toMatch || !dateMatch || !bodyMatch) {
            toast.error("Invalid email format. Ensure From, To, Date, and a body are present.");
            return;
          }

          // Placeholder for upcoming REST ingestion endpoint
          toast.success("Email queued for processing");
          setRawData("");
          break;
        }
        case "session_note": {
          const clientMatch = rawData.match(/^Client: (.*)$/m);
          const dateMatch = rawData.match(/^Date: (.*)$/m);
          const bodyMatch = rawData.match(/\n\n([\s\S]*)/);

          if (!clientMatch || !dateMatch || !bodyMatch) {
            toast.error(
              "Invalid session note format. Ensure Client, Date, and a body are present.",
            );
            return;
          }

          // Placeholder for upcoming REST ingestion endpoint
          toast.success("Session note queued for processing");
          setRawData("");
          break;
        }
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to ingest. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Data Type</label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="session_note">Session Note</SelectItem>
                <SelectItem value="social_media" disabled>
                  Social Media (coming soon)
                </SelectItem>
                <SelectItem value="form" disabled>
                  Form Response (coming soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Raw Data</label>
            <Textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder={getPlaceholder(dataType)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <Button onClick={handleSubmit} disabled={!rawData || isSubmitting}>
              Import & Process
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  setIsProcessing(true);
                  await runJobs();
                  toast.success("Processing queue started.");
                } catch (e: unknown) {
                  const err = e as { message?: string };
                  toast.error(`Failed to start queue: ${err.message ?? "Unknown error"}`);
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
            >
              Process Queue Manually
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getPlaceholder(dataType: string): string {
  switch (dataType) {
    case "email":
      return `From: john@example.com
To: jane@example.com, support@company.com
Subject: Following up on our yoga session
Date: 2024-01-15 10:30:00

Hi Jane,

I wanted to thank you for the amazing yoga session yesterday...`;

    case "session_note":
      return `Client: Jane Smith
Date: 2024-01-15
Type: Yoga Therapy

Session went well. Client reported improvement in lower back pain...`;

    default:
      return "Paste raw data here...";
  }
}
