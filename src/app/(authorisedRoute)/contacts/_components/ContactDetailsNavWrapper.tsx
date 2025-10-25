"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ChevronLeft, ChevronRight, List, ChevronDown, Clock, Edit, Trash2 } from "lucide-react";
import { ContactDetailsCard } from "./ContactDetailsCard";
import { toast } from "sonner";
import type { ContactSearchFilters } from "./types";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContact, useDeleteContact } from "@/hooks/use-contacts";

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

  // Fetch contact data
  const { data: contact, isLoading: contactLoading } = useContact(contactId);
  const deleteContactMutation = useDeleteContact();

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

  const handleDelete = (): void => {
    if (contact && confirm(`Are you sure you want to delete ${contact.displayName}?`)) {
      deleteContactMutation.mutate(contactId, {
        onSuccess: () => {
          router.push("/contacts");
        },
      });
    }
  };

  return (
    <div className="relative">
      {/* Combined Navigation + Contact Header Row */}
      {navigationContext && contact && !contactLoading && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-3">
            {/* Single row: Contact on left, Navigation on right */}
            <div className="flex items-center justify-between gap-6">
              {/* Left: Contact Info (Photo + 3-line details) */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <AvatarImage
                  src={contact.photoUrl}
                  alt={contact.displayName}
                  size="lg"
                  className="h-16 w-16 flex-shrink-0"
                />

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  {/* Line 1: Name + Edit/Delete icons */}
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight truncate">
                      {contact.displayName}
                    </h1>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/contacts/${contactId}/edit`)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Contact</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete Contact</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Line 2: Lifecycle Stage + Referral */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {contact.lifecycleStage && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {contact.lifecycleStage}
                      </Badge>
                    )}

                    {contact.referralSource && (
                      <Badge variant="outline" className="text-xs">
                        Ref: {contact.referralSource}
                      </Badge>
                    )}
                  </div>

                  {/* Line 3: Date Added timestamp */}
                  {contact.createdAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Added {new Date(contact.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: All Navigation Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToList}
                  className="flex items-center h-9"
                >
                  <List className="h-4 w-4 mr-2" />
                  Back to List
                </Button>

                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {navigationContext.currentIndex + 1} of {navigationContext.contactIds.length}
                </span>

                {showFilters && navigationContext.filterState && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer inline-flex items-center gap-1"
                      >
                        Filtered
                        <ChevronDown className="h-3 w-3" />
                      </Badge>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto" side="bottom" align="start">
                      <FilterHoverContent filterState={navigationContext.filterState} />
                    </HoverCardContent>
                  </HoverCard>
                )}

                <div className="h-6 w-px bg-border" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={navigationContext.currentIndex <= 0}
                  className="flex items-center h-8"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={navigationContext.currentIndex >= navigationContext.totalItems - 1}
                  className="flex items-center h-8"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - ContactDetailsCard now won't show its own header since we're showing it above */}
      <ContactDetailsCard contactId={contactId} />
    </div>
  );
}
