"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { ClientDetailPage } from "../../_components/ClientDetailPage";
import { toast } from "sonner";

interface ClientDetailPageWithNavigationProps {
  clientId: string;
}

interface NavigationContext {
  currentIndex: number;
  totalItems: number;
  contactIds: string[];
  searchQuery?: string;
  filterState?: Record<string, unknown>;
}

/**
 * Enhanced Client Detail Page with Tinder-style navigation
 * Allows browsing through table results without returning to the list
 */
export function ClientDetailPageWithNavigation({
  clientId
}: ClientDetailPageWithNavigationProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [navigationContext, setNavigationContext] = useState<NavigationContext | null>(null);

  // Extract navigation context from localStorage or URL params
  useEffect(() => {
    try {
      // First try to get navigation context from localStorage (set by table)
      const storedContext = localStorage.getItem("omniClientsNavigationContext");
      if (storedContext) {
        const parsed = JSON.parse(storedContext) as NavigationContext;

        // Find current position in the stored list
        const currentIndex = parsed.contactIds.indexOf(clientId);
        if (currentIndex >= 0) {
          setNavigationContext({
            ...parsed,
            currentIndex,
          });
        }
      } else {
        // Fallback: check if we have context in URL params
        const contextParam = searchParams.get("context");
        if (contextParam) {
          const parsed = JSON.parse(decodeURIComponent(contextParam)) as NavigationContext;
          const currentIndex = parsed.contactIds.indexOf(clientId);
          if (currentIndex >= 0) {
            setNavigationContext({
              ...parsed,
              currentIndex,
            });
          }
        }
      }
    } catch (error) {
      console.warn("Failed to parse navigation context:", error);
      // Continue without navigation context
    }
  }, [clientId, searchParams]);

  const handlePrevious = (): void => {
    if (!navigationContext || navigationContext.currentIndex <= 0) {
      toast.error("No previous contact available");
      return;
    }

    const previousId = navigationContext.contactIds[navigationContext.currentIndex - 1];
    if (previousId) {
      // Update navigation context
      const updatedContext = {
        ...navigationContext,
        currentIndex: navigationContext.currentIndex - 1,
      };
      localStorage.setItem("omniClientsNavigationContext", JSON.stringify(updatedContext));

      // Navigate to previous contact
      router.push(`/omni-clients/details?id=${previousId}`);
    }
  };

  const handleNext = (): void => {
    if (!navigationContext || navigationContext.currentIndex >= navigationContext.totalItems - 1) {
      toast.error("No next contact available");
      return;
    }

    const nextId = navigationContext.contactIds[navigationContext.currentIndex + 1];
    if (nextId) {
      // Update navigation context
      const updatedContext = {
        ...navigationContext,
        currentIndex: navigationContext.currentIndex + 1,
      };
      localStorage.setItem("omniClientsNavigationContext", JSON.stringify(updatedContext));

      // Navigate to next contact
      router.push(`/omni-clients/details?id=${nextId}`);
    }
  };

  const handleBackToList = (): void => {
    // Clear navigation context
    localStorage.removeItem("omniClientsNavigationContext");

    // Return to contacts list, preserving any search/filter state
    let returnUrl = "/omni-clients";
    if (navigationContext?.searchQuery) {
      returnUrl += `?search=${encodeURIComponent(navigationContext.searchQuery)}`;
    }

    router.push(returnUrl);
  };

  return (
    <div className="relative">
      {/* Navigation Bar - only show if we have navigation context */}
      {navigationContext && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToList}
                  className="flex items-center"
                >
                  <List className="h-4 w-4 mr-2" />
                  Back to List
                </Button>

                <div className="text-sm text-muted-foreground">
                  {navigationContext.currentIndex + 1} of {navigationContext.totalItems} contacts
                  {navigationContext.searchQuery && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Filtered results
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={navigationContext.currentIndex <= 0}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={navigationContext.currentIndex >= navigationContext.totalItems - 1}
                  className="flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <ClientDetailPage clientId={clientId} />
    </div>
  );
}