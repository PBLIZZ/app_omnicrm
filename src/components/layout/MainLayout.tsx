"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui";
import { AppSidebarController } from "./AppSidebarController";
import { UserNav } from "./UserNav";
// import { OmniBotFloat } from "./OmniBotFloat";
import { DynamicBreadcrumb } from "./DynamicBreadcrumb";
import { SidebarBrandHeader } from "./SidebarBrandHeader";
import { SidebarMainSectionNav } from "./SidebarMainSectionNav";
import { Button } from "@/components/ui/button";
import { Bot, Zap, Home, Settings } from "lucide-react";
import Link from "next/link";
// import { SearchModal } from "@/components/SearchModal"; // Temporarily disabled
import { toast } from "sonner";
import { useHeaderControls } from "@/hooks/use-header-controls";
import { post } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RapidNoteModal } from "@/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/RapidNoteModal";

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout - Modern application layout using shadcn sidebar components
 *
 * Layout Structure:
 * - SidebarProvider manages sidebar state
 * - Sidebar contains header, content (route-based), and footer (user nav)
 * - SidebarInset contains the main content with trigger and breadcrumbs
 * - Mobile-responsive with built-in sidebar behavior
 */
export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  const {
    mounted,
    theme,
    setTheme,
    // notificationCount,
    // handleSearch, // Temporarily disabled
  } = useHeaderControls();

  // State for rapid note modal
  const [isRapidNoteModalOpen, setIsRapidNoteModalOpen] = useState(false);

  // Note: ContactSearchCombobox handles its own data fetching

  // Handle rapid note modal closing
  const handleCloseRapidNoteModal = (): void => {
    setIsRapidNoteModalOpen(false);
  };

  // Handle rapid note save
  const handleSaveRapidNote = async (noteData: {
    contactId: string;
    content: string;
    sourceType: "typed" | "voice";
  }): Promise<{ success: boolean }> => {
    try {
      await post("/api/notes", {
        contactId: noteData.contactId,
        contentPlain: noteData.content,
        sourceType: noteData.sourceType,
      });

      toast.success("Note saved successfully!");
      setIsRapidNoteModalOpen(false);
      return { success: true };
    } catch (error) {
      console.error("Failed to save note:", error);
      // Error toast is already shown by the API client
      return { success: false };
    }
  };

  // Handle rapid note modal opening
  const handleRapidNote = (): void => {
    setIsRapidNoteModalOpen(true);
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isModifierPressed = isMac ? event.metaKey : event.ctrlKey;

      if (isModifierPressed && event.shiftKey && event.key === "N") {
        event.preventDefault();
        handleRapidNote();
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // CSRF token preflight - ensure tokens exist before user actions
  useEffect(() => {
    // Trigger middleware to issue CSRF tokens via any safe GET request
    fetch("/api/health", {
      method: "GET",
      credentials: "same-origin",
    }).catch(() => {
      // Silent fail - tokens will be issued on first mutation attempt
    });
  }, []);

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <Sidebar collapsible="icon" variant="floating">
          <SidebarHeader>
            <SidebarBrandHeader />
          </SidebarHeader>

          <SidebarContent>
            <SidebarMainSectionNav />
            <AppSidebarController />
          </SidebarContent>

          <SidebarFooter>
            <UserNav />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" variant="ghost" size="icon" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb />
            <div className="flex-1" />

            {/* Quick Navigation Icons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-9 w-9"
                title="Dashboard"
                aria-label="Go to Dashboard"
              >
                <Link href="/omni-flow">
                  <Home className="h-5 w-5" />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-9 w-9"
                title="Settings"
                aria-label="Go to Settings"
              >
                <Link href="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>

              <Separator orientation="vertical" className="mx-2 h-4" />
            </div>

            {/* Right Side - AI, Rapid Note, Theme */}
            <div className="flex items-center gap-2">
              {/* Global Search - Temporarily disabled */}
              {/* TODO: Implement unified search for clients, tasks, notes, etc.
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-2 min-w-[200px] justify-start text-muted-foreground"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Search clients, tasks, notes...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>

              <Button variant="ghost" size="sm" className="md:hidden" onClick={handleSearch}>
                <Search className="h-5 w-5" />
              </Button>
              */}

              {/* AI Assistant Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="relative hover-glow"
                aria-label="AI Assistant"
                title="AI Assistant"
                onClick={() => {
                  toast.info("AI Assistant coming soon! Track progress at GitHub Issues.");
                }}
              >
                <Bot className="h-6 w-6" />
              </Button>

              {/* Rapid Note Button */}
              <Button
                variant="ghost"
                size="sm"
                className="relative hover-glow"
                aria-label="Rapid Note"
                title="Rapid Note"
                onClick={handleRapidNote}
              >
                <Zap className="h-6 w-6" />
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle mounted={mounted} theme={theme} setTheme={setTheme} />
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">{children}</main>
        </SidebarInset>
      </div>

      {/* Rapid Note Modal */}
      <RapidNoteModal
        isOpen={isRapidNoteModalOpen}
        onClose={handleCloseRapidNoteModal}
        onSave={handleSaveRapidNote}
      />
    </SidebarProvider>
  );
}
