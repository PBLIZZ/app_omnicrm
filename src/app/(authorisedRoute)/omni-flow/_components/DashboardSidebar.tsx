"use client";

// Import the structural primitives from our sidebar system
import { SidebarContent } from "@/components/ui/sidebar";

export function DashboardSidebar(): JSX.Element {
  return (
    <SidebarContent>
      {/* Sidebar content removed as requested - Quick Links and Settings sections not needed */}
      <div className="p-4 text-sm text-muted-foreground">
        Dashboard sidebar content will be added as features are developed.
      </div>
    </SidebarContent>
  );
}
