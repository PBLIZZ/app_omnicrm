"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Copy, ExternalLink, Trash2, Clock, Users, AlertCircle } from "lucide-react";
import { get, del } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// Helper function to format token expiry text
function formatTokenExpiry(expiresAt: string): string {
  try {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) {
      return "Invalid date";
    }
    const isExpired = expiryDate < new Date();
    const timeAgo = formatDistanceToNow(expiryDate);
    return isExpired ? `Expired ${timeAgo} ago` : `Expires ${timeAgo} from now`;
  } catch (error) {
    console.error("Date formatting error:", error, "expiresAt:", expiresAt);
    return "Invalid date";
  }
}

// Helper function to format token created date
function formatTokenCreatedAt(createdAt: string | null | undefined): string {
  try {
    if (!createdAt) {
      return "Unknown";
    }
    const createdDate = new Date(createdAt);
    if (isNaN(createdDate.getTime())) {
      return "Invalid date";
    }
    return formatDistanceToNow(createdDate);
  } catch (error) {
    console.error("Date formatting error:", error, "createdAt:", createdAt);
    return "Invalid date";
  }
}

interface OnboardingToken {
  id: string;
  token: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  disabled: boolean;
  createdAt: string | null;
  label: string | null;
}

interface TokensListResponse {
  tokens: OnboardingToken[];
}

export function ActiveTokensList() {
  const queryClient = useQueryClient();
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");

  // Set origin on client side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Fetch active tokens
  const {
    data: tokens = [],
    isLoading,
    error,
  } = useQuery<OnboardingToken[]>({
    queryKey: ["onboarding-tokens"],
    queryFn: async () => {
      const response = await get<TokensListResponse>("/api/onboarding/admin/tokens");
      return response.tokens;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Delete token mutation
  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      await del(`/api/onboarding/admin/tokens/${tokenId}`);
    },
    onMutate: async (tokenId) => {
      setDeletingTokenId(tokenId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-tokens"] });
      toast.success("Onboarding link deleted successfully");
    },
    onError: (error) => {
      console.error("Delete token error:", error);
      toast.error("Failed to delete onboarding link");
    },
    onSettled: () => {
      setDeletingTokenId(null);
    },
  });

  const copyToClipboard = async (token: string) => {
    try {
      if (!origin) {
        toast.error("Unable to generate link - origin not available");
        return;
      }
      const url = `${origin}/onboard/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy link");
    }
  };

  const openInNewTab = (token: string) => {
    if (!origin) {
      toast.error("Unable to open link - origin not available");
      return;
    }
    const url = `${origin}/onboard/${token}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isFullyUsed = (token: OnboardingToken) => {
    return token.usedCount >= token.maxUses;
  };

  const getTokenStatus = (token: OnboardingToken) => {
    if (token.disabled) return { label: "Disabled", variant: "secondary" as const };
    if (isExpired(token.expiresAt)) return { label: "Expired", variant: "destructive" as const };
    if (isFullyUsed(token)) return { label: "Used Up", variant: "outline" as const };
    return { label: "Active", variant: "default" as const };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 border rounded animate-pulse">
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load active links. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active onboarding links</p>
        <p className="text-xs">Generate a link to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tokens.map((token) => {
        const status = getTokenStatus(token);
        const isActive = status.label === "Active";

        return (
          <div
            key={token.id}
            className={cn(
              "p-3 border rounded-lg transition-colors",
              isActive ? "border-green-200 bg-green-50/50" : "border-gray-200",
            )}
          >
            {/* Header with status */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                {isActive && (
                  <span className="text-xs text-muted-foreground">
                    {token.maxUses - token.usedCount} uses left
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isActive && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(token.token)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openInNewTab(token.token)}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTokenMutation.mutate(token.id)}
                  disabled={deletingTokenId === token.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Label */}
            {token.label && (
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-700">{token.label}</span>
              </div>
            )}

            {/* Usage stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>
                  {token.usedCount}/{token.maxUses} used
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTokenExpiry(token.expiresAt)}</span>
              </div>
            </div>

            {/* Created date */}
            <p className="text-xs text-muted-foreground">
              Created {formatTokenCreatedAt(token.createdAt)} ago
            </p>

            {/* Token URL preview (for active tokens only) */}
            {isActive && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono truncate">
                {window.location.origin}/onboard/{token.token}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary footer */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        {tokens.length} total link{tokens.length === 1 ? "" : "s"} •{" "}
        {tokens.filter((t) => getTokenStatus(t).label === "Active").length} active
      </div>
    </div>
  );
}
