"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ChevronLeft, ChevronRight, List, ChevronDown } from "lucide-react";
import { ContactDetailsCard } from "./ContactDetailsCard";
import { toast } from "sonner";
import type { ContactSearchFilters } from "./types";

interface ContactDetailsNavWrapperProps {
  contactId: string;
}

interface NavigationContext {
  currentIndex: number;
  totalItems: number;
  contactIds: string[];
  searchQuery?: string;
  filterState?: ContactSearchFilters;
}

/**
 * Check if any filters are active
 */
function hasActiveFilters(filterState?: ContactSearchFilters): boolean {
  if (!filterState) return false;

  return !!(
    filterState.lifecycleStage?.length ||
    filterState.tags?.length ||
    filterState.source?.length ||
    filterState.dateRange ||
    filterState.query ||
    filterState.search
  );
}

/**
 * Render filter details in hover card
 */
function FilterHoverContent({ filterState }: { filterState: ContactSearchFilters }): JSX.Element {
  return (
    <div className="space-y-3 min-w-[250px]">
      <div className="font-semibold text-sm">Active Filters</div>

      {filterState.lifecycleStage && filterState.lifecycleStage.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Lifecycle Stage</div>
          <div className="flex flex-wrap gap-1">
            {filterState.lifecycleStage.map((stage) => (
              <Badge key={stage} variant="secondary" className="text-xs">
                {stage}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {filterState.tags && filterState.tags.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Tags</div>
          <div className="flex flex-wrap gap-1">
            {filterState.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {filterState.dateRange && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Date Range</div>
          <div className="text-sm">
            {filterState.dateRange.from && filterState.dateRange.to
              ? `${filterState.dateRange.from.toLocaleDateString()} - ${filterState.dateRange.to.toLocaleDateString()}`
              : filterState.dateRange.from
                ? `From ${filterState.dateRange.from.toLocaleDateString()}`
                : filterState.dateRange.to
                  ? `Until ${filterState.dateRange.to.toLocaleDateString()}`
                  : ""}
          </div>
        </div>
      )}

      {(filterState.query || filterState.search) && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Search</div>
          <div className="text-sm italic">"{filterState.query || filterState.search}"</div>
        </div>
      )}
    </div>
  );
}

/**
 * Navigation wrapper for contact details with filter context
 * Allows browsing through table results without returning to the list
 */
export function ContactDetailsNavWrapper({
  contactId,
}: ContactDetailsNavWrapperProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [navigationContext, setNavigationContext] = useState<NavigationContext | null>(null);

  // Extract navigation context from localStorage or URL params
  useEffect(() => {
    try {
      // First try to get navigation context from localStorage (set by table)
      const storedContext = localStorage.getItem("contactsNavigationContext");
      if (storedContext) {
        const parsed = JSON.parse(storedContext);

        // Validate parsed context structure
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray(parsed.contactIds) &&
          typeof parsed.currentIndex === "number" &&
          parsed.contactIds.every((id: unknown) => typeof id === "string")
        ) {
          // Find current position in the stored list
          const currentIndex = parsed.contactIds.indexOf(contactId);
          if (currentIndex >= 0 && currentIndex < parsed.contactIds.length) {
            setNavigationContext({
              ...parsed,
              currentIndex,
            });
          }
        }
      } else {
        // Fallback: check if we have context in URL params
        const contextParam = searchParams.get("context");
        if (contextParam) {
          const parsed = JSON.parse(decodeURIComponent(contextParam));

          // Validate parsed context structure
          if (
            parsed &&
            typeof parsed === "object" &&
            Array.isArray(parsed.contactIds) &&
            typeof parsed.currentIndex === "number" &&
            parsed.contactIds.every((id: unknown) => typeof id === "string")
          ) {
            const currentIndex = parsed.contactIds.indexOf(contactId);
            if (currentIndex >= 0 && currentIndex < parsed.contactIds.length) {
              setNavigationContext({
                ...parsed,
                currentIndex,
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn("Failed to parse navigation context:", error);
      // Continue without navigation context
    }
  }, [contactId, searchParams]);

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
      try {
        localStorage.setItem("contactsNavigationContext", JSON.stringify(updatedContext));
      } catch (error) {
        console.warn("Failed to save navigation context to localStorage:", error);
        // Continue without persisting navigation context
      }

      // Navigate to previous contact
      router.push(`/contacts/${previousId}`);
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
      try {
        localStorage.setItem("contactsNavigationContext", JSON.stringify(updatedContext));
      } catch (error) {
        console.warn("Failed to save navigation context to localStorage:", error);
        // Continue without persisting navigation context
      }

      // Navigate to next contact
      router.push(`/contacts/${nextId}`);
    }
  };

  const handleBackToList = (): void => {
    // Clear navigation context
    localStorage.removeItem("contactsNavigationContext");

    // Return to contacts list, preserving any search/filter state
    let returnUrl = "/contacts";
    if (navigationContext?.searchQuery) {
      returnUrl += `?search=${encodeURIComponent(navigationContext.searchQuery)}`;
    }

    router.push(returnUrl);
  };

  const showFilters = hasActiveFilters(navigationContext?.filterState);

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
                  {navigationContext.currentIndex + 1} of {navigationContext.contactIds.length}{" "}
                  contacts
                  {showFilters && navigationContext.filterState && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Badge variant="secondary" className="ml-2 cursor-pointer inline-flex items-center gap-1">
                          Filtered
                          <ChevronDown className="h-3 w-3" />
                        </Badge>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto" side="bottom" align="start">
                        <FilterHoverContent filterState={navigationContext.filterState} />
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
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
      <ContactDetailsCard contactId={contactId} />
    </div>
  );
}
