"use client";

import { OmniBot } from "@/components/omni-bot/OmniBot";
import { Button } from "@/components/ui";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * OmniBotFloat provides a global Floating Action Button (FAB) that opens
 * the OmniBot AI assistant in a floating side panel.
 */
export function OmniBotFloat(): JSX.Element {
  return (
    // The Sheet component manages the open/closed state of the panel.
    <Sheet>
      {/* 1. The Floating Action Button (FAB) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              size="icon"
              aria-label="OmniBot Assistant"
              title="OmniBot Assistant"
              className={cn(
                "size-12 fixed bottom-30 right-10 z-50 jiggle-60s", // Positioning and timed jiggle
                "bg-secondary text-secondary-foreground hover:bg-accent/80", // Styling
              )}
            >
              <Bot className="size-6" />
              <span className="sr-only">OmniBot Assistant</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>OmniBot Assistant</TooltipContent>
      </Tooltip>

      {/* 2. The Floating Sidebar Panel */}
      <SheetContent
        side="right"
        // This is the key to the custom styling. We override the default sheet styles.
        className={cn(
          // Reset default sheet styles
          "h-auto w-auto p-0 border-none bg-transparent shadow-none",
          // Positioning and Sizing
          "fixed inset-y-6 right-6 flex",
          // Set a max-height to prevent overflow and a width for the panel
          "max-h-[calc(100vh-3rem)] w-[600px]",
        )}
      >
        {/* The visible container for the panel content */}
        <div
          className={cn(
            "flex flex-col w-full h-full",
            "bg-card text-card-foreground border rounded-xl shadow-2xl",
          )}
        >
          {/* You can add an optional header here if you like */}
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Bot className="h-5 w-5" />
              OmniBot Assistant
            </h3>
          </div>

          {/* Render the actual OmniBot component inside */}
          <div className="flex-1 p-4 overflow-y-auto">
            <OmniBot />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
