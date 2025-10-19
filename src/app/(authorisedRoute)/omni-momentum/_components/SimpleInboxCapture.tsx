/**
 * Simple Inbox Capture Component
 *
 * This component provides a simple interface for users to dump their thoughts
 * and queue them for background intelligent processing.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Brain, CheckCircle, AlertTriangle, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

interface QueueStats {
  totalQueued: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  isAvailable: boolean;
}

export function SimpleInboxCapture(): JSX.Element {
  const [rawText, setRawText] = useState("");
  const [enableIntelligentProcessing, setEnableIntelligentProcessing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Load queue stats and availability
  const loadStats = async () => {
    try {
      const response = await fetch("/api/omni-momentum/inbox/queue");
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data);
        setIsAvailable(data.isAvailable);
      }
    } catch (error) {
      console.error("Failed to load queue stats:", error);
    }
  };

  // Load availability status
  const loadAvailability = async () => {
    try {
      const response = await fetch("/api/omni-momentum/inbox/queue?action=status");
      if (response.ok) {
        const data = await response.json();
        setIsAvailable(data.isAvailable);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
    }
  };

  useEffect(() => {
    loadStats();
    loadAvailability();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawText.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/omni-momentum/inbox/intelligent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText,
          enableIntelligentProcessing,
          priority: "medium",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to queue item for processing");
      }

      const result = await response.json();

      if (result.queued) {
        toast.success(result.message);
        setRawText("");
        // Reload stats to show updated queue
        await loadStats();
      } else {
        toast.success(result.message);
        setRawText("");
      }
    } catch (error) {
      console.error("Failed to queue item:", error);
      toast.error("Failed to queue item for processing");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Stats Overview */}
      {queueStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{queueStats.totalQueued}</div>
                  <div className="text-xs text-muted-foreground">Items Queued</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{queueStats.highPriority}</div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{queueStats.mediumPriority}</div>
                  <div className="text-xs text-muted-foreground">Medium Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {isAvailable ? (
                  <Zap className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <div className="text-2xl font-bold">{isAvailable ? "ON" : "OFF"}</div>
                  <div className="text-xs text-muted-foreground">AI Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Capture Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Dump Everything Here
          </CardTitle>
          <CardDescription>
            Just dump your thoughts and let AI intelligently organize them into tasks and projects.
            Processing happens in the background - you'll see your organized tasks tomorrow!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Dump everything here... e.g., 'Call John about project proposal, finish quarterly report by Friday, book dentist appointment, organize team meeting for next week, need to buy groceries, schedule car maintenance'"
                className="min-h-[120px] resize-none"
                disabled={isLoading}
              />
              <div className="text-xs text-muted-foreground">{rawText.length} characters</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="intelligent-processing"
                  checked={enableIntelligentProcessing}
                  onCheckedChange={setEnableIntelligentProcessing}
                  disabled={!isAvailable || isLoading}
                />
                <label htmlFor="intelligent-processing" className="text-sm font-medium">
                  Enable AI Processing
                </label>
                {!isAvailable && (
                  <Badge variant="destructive" className="text-xs">
                    AI Unavailable
                  </Badge>
                )}
              </div>

              <Button
                type="submit"
                disabled={
                  !rawText.trim() || isLoading || (!isAvailable && enableIntelligentProcessing)
                }
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Dump & Queue
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Processing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">🤖 Background Processing</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Items are queued for AI processing</li>
                <li>• Processing happens twice daily</li>
                <li>• Tasks appear in your dashboard tomorrow</li>
                <li>• No need to wait or approve</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">📋 What AI Does</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Splits bulk input into individual tasks</li>
                <li>• Categorizes by zones (Life, Business, etc.)</li>
                <li>• Groups related tasks into projects</li>
                <li>• Sets priorities and due dates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status Alert */}
      {queueStats && queueStats.totalQueued > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You have {queueStats.totalQueued} item{queueStats.totalQueued !== 1 ? "s" : ""} queued
            for processing. They will be processed in the next batch run.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
