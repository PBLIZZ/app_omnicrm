/**
 * Hook for managing intelligent inbox processing
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface IntelligentProcessingStats {
  pendingApprovals: number;
  totalProcessed: number;
  averageConfidence: number;
  isAvailable: boolean;
}

interface ApprovalItem {
  inboxItem: any;
  processingResult: any;
}

export function useIntelligentInbox() {
  const [stats, setStats] = useState<IntelligentProcessingStats | null>(null);
  const [pendingItems, setPendingItems] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if intelligent processing is available
  const checkAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/omni-momentum/inbox/approval?action=stats");
      if (response.ok) {
        const data = await response.json();
        setIsAvailable(data.isAvailable);
        return data.isAvailable;
      }
    } catch (error) {
      console.error("Failed to check availability:", error);
    }
    return false;
  }, []);

  // Load pending approval items
  const loadPendingItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/omni-momentum/inbox/approval?action=list");
      if (response.ok) {
        const data = await response.json();
        setPendingItems(data.items || []);
      } else {
        throw new Error("Failed to load pending items");
      }
    } catch (error) {
      console.error("Failed to load pending items:", error);
      toast.error("Failed to load pending approval items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load processing statistics
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/omni-momentum/inbox/approval?action=stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  // Process intelligent quick capture
  const processIntelligentCapture = useCallback(
    async (rawText: string, enableIntelligentProcessing = true) => {
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
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to process intelligent capture");
        }

        const result = await response.json();

        if (result.requiresApproval) {
          toast.success(result.message);
          // Reload pending items to show the new one
          await loadPendingItems();
        } else {
          toast.success(result.message);
        }

        return result;
      } catch (error) {
        console.error("Failed to process intelligent capture:", error);
        toast.error("Failed to process intelligent capture");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadPendingItems],
  );

  // Process approval
  const processApproval = useCallback(
    async (approvalData: any) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/omni-momentum/inbox/approval", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(approvalData),
        });

        if (!response.ok) {
          throw new Error("Failed to process approval");
        }

        const result = await response.json();
        toast.success(result.processingSummary);

        // Reload pending items and stats
        await Promise.all([loadPendingItems(), loadStats()]);

        return result;
      } catch (error) {
        console.error("Failed to process approval:", error);
        toast.error("Failed to process approval");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadPendingItems, loadStats],
  );

  // Reject intelligent processing
  const rejectProcessing = useCallback(
    async (inboxItemId: string) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/omni-momentum/inbox/approval", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inboxItemId }),
        });

        if (!response.ok) {
          throw new Error("Failed to reject processing");
        }

        toast.success("Intelligent processing rejected, reverted to manual processing");

        // Reload pending items and stats
        await Promise.all([loadPendingItems(), loadStats()]);
      } catch (error) {
        console.error("Failed to reject processing:", error);
        toast.error("Failed to reject processing");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadPendingItems, loadStats],
  );

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      await checkAvailability();
      await loadStats();
      await loadPendingItems();
    };

    initialize();
  }, [checkAvailability, loadStats, loadPendingItems]);

  return {
    stats,
    pendingItems,
    isLoading,
    isAvailable,
    processIntelligentCapture,
    processApproval,
    rejectProcessing,
    loadPendingItems,
    loadStats,
    checkAvailability,
  };
}
