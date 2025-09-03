"use client";

import { RefreshCw, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OmniConnectHeaderProps {
  isSyncing: boolean;
  isEmbedding: boolean;
  onSync: () => void;
  onGenerateEmbeddings: () => void;
  onLoadInsights: () => void;
}

export function OmniConnectHeader({
  isSyncing,
  isEmbedding,
  onSync,
  onGenerateEmbeddings,
  onLoadInsights,
}: OmniConnectHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">OmniConnect</h1>
        <p className="text-muted-foreground">
          Gmail integration for intelligent client communication tracking
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSync} disabled={isSyncing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          Sync Now
        </Button>
        <Button onClick={onGenerateEmbeddings} disabled={isEmbedding} variant="outline">
          <Brain className={`h-4 w-4 mr-2 ${isEmbedding ? "animate-spin" : ""}`} />
          Generate AI Embeddings
        </Button>
        <Button onClick={onLoadInsights} variant="outline">
          <Zap className="h-4 w-4 mr-2" />
          Insights
        </Button>
      </div>
    </div>
  );
}
