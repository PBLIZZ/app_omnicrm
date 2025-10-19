/**
 * Intelligent Inbox Widget for OmniMomentum
 *
 * This component provides a quick capture interface with intelligent processing
 * and approval workflow integration.
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Brain, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { useIntelligentInbox } from "@/hooks/use-intelligent-inbox";
import { IntelligentProcessingApproval } from "@/components/inbox/IntelligentProcessingApproval";

export function IntelligentInboxWidget(): JSX.Element {
  const [rawText, setRawText] = useState("");
  const [enableIntelligentProcessing, setEnableIntelligentProcessing] = useState(true);
  const [showApproval, setShowApproval] = useState(false);

  const {
    stats,
    pendingItems,
    isLoading,
    isAvailable,
    processIntelligentCapture,
    loadPendingItems,
  } = useIntelligentInbox();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawText.trim()) {
      return;
    }

    try {
      const result = await processIntelligentCapture(rawText, enableIntelligentProcessing);

      if (result.requiresApproval) {
        setShowApproval(true);
      }

      setRawText("");
    } catch (error) {
      console.error("Failed to process:", error);
    }
  };

  const handleApprovalComplete = () => {
    setShowApproval(false);
    loadPendingItems();
  };

  if (showApproval) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Review AI Suggestions</h2>
          <Button variant="outline" onClick={() => setShowApproval(false)}>
            Back to Capture
          </Button>
        </div>
        <IntelligentProcessingApproval
          items={pendingItems}
          onApprovalComplete={handleApprovalComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
                  <div className="text-xs text-muted-foreground">Pending Approval</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalProcessed}</div>
                  <div className="text-xs text-muted-foreground">Total Processed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(stats.averageConfidence * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Confidence</div>
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
            Intelligent Quick Capture
          </CardTitle>
          <CardDescription>
            Dump everything here and let AI intelligently break it down into tasks, projects, and
            categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Dump everything here... e.g., 'Need to call John about the project proposal, finish the quarterly report by Friday, book dentist appointment, and organize the team meeting for next week'"
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
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Process
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pending Approvals Alert */}
      {pendingItems.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {pendingItems.length} item{pendingItems.length !== 1 ? "s" : ""} pending
            approval.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => setShowApproval(true)}
            >
              Review now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Intelligent Processing Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">🤖 AI Analysis</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Splits bulk input into individual tasks</li>
                <li>• Categorizes by zones (Life, Business, etc.)</li>
                <li>• Suggests project groupings</li>
                <li>• Detects task hierarchies</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">👤 Human Review</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Review and modify AI suggestions</li>
                <li>• Approve or reject individual items</li>
                <li>• Adjust priorities and due dates</li>
                <li>• Final approval before creation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
