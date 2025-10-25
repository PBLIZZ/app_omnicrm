"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Circle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { LucideIcon } from "lucide-react";

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  connected: boolean;
  gradient: string;
  borderColor: string;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  onSync?: () => Promise<void>;
  lastSync?: Date | null;
  stats?: Array<{ label: string; value: string }>;
  advancedSettings?: React.ReactNode;
  comingSoon?: boolean;
}

/**
 * IntegrationCard - TaskCard-inspired integration connection card
 *
 * Features:
 * - Clear connection status
 * - Progressive disclosure for details
 * - Sync functionality
 * - Advanced settings (collapsed by default)
 * - Wellness-friendly messaging
 * - Loading states
 */
export function IntegrationCard({
  title,
  description,
  icon: Icon,
  connected,
  gradient,
  borderColor,
  onConnect,
  onDisconnect,
  onSync,
  lastSync,
  stats,
  advancedSettings,
  comingSoon = false,
}: IntegrationCardProps): JSX.Element {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConnect = async (): Promise<void> => {
    if (!onConnect) return;
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    if (!onDisconnect) return;
    setIsConnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async (): Promise<void> => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  return (
    <Card
      className={`bg-gradient-to-br ${gradient} border-l-4 ${borderColor} ${comingSoon ? "opacity-60" : ""}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          {/* Left side: Icon + Title + Description */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`p-3 rounded-full ${comingSoon ? "bg-gray-100" : "bg-white/60 backdrop-blur-sm"}`}
            >
              <Icon className={`h-6 w-6 ${comingSoon ? "text-gray-400" : "text-gray-700"}`} />
            </div>

            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm mt-1">{description}</CardDescription>
            </div>
          </div>

          {/* Right side: Connection Status or Badge */}
          <div className="flex-shrink-0 ml-3">
            {comingSoon ? (
              <Badge variant="outline" className="bg-white/60">
                Coming Soon
              </Badge>
            ) : connected ? (
              <Badge className="bg-green-500">
                <Circle className="w-2 h-2 fill-white mr-1" />
                Connected
              </Badge>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                size="sm"
                className="min-w-[100px]"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>Connect →</>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Progressive disclosure - only show if connected */}
      {connected && !comingSoon && (
        <CardContent className="space-y-4">
          {/* Stats */}
          {stats && stats.length > 0 && (
            <div className="space-y-2">
              {stats.map((stat, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-medium">{stat.value}</span>
                </div>
              ))}

              {lastSync && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last synced</span>
                  <span className="font-medium">{formatRelativeTime(lastSync)}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>Sync Now</>
                )}
              </Button>
            )}

            {onDisconnect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isConnecting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Disconnect
              </Button>
            )}
          </div>

          {/* Advanced Settings - Collapsed by default */}
          {advancedSettings && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span>Advanced Settings</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">{advancedSettings}</CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      )}
    </Card>
  );
}
