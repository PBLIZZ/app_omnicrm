"use client";

// 1. Import the placeholder navigation components from the v0 block
// These will be replaced later with real, data-driven components.
import { NavMain } from "@/components/layout/QuickLinksNav";
//import { NavProjects } from '@/components/layout/ProjectLinksNav';
// Import the types needed for the navigation components
import { NavItem } from "@/components/layout/QuickLinksNav";
//import { ProjectItem } from '@/components/layout/ProjectLinksNav';

// Import the structural primitives from our sidebar system
import { SidebarContent } from "@/components/ui/sidebar";

import { Settings2, CloudLightning } from "lucide-react";

// This is the demo data required by the placeholder nav components.
// We keep it here temporarily for the demo to function.
// In a real implementation, this data would be fetched or passed via props.

// Define your actual navigation structure
const quickLinksData: NavItem[] = [
  {
    title: "Quick Actions",
    url: "#",
    icon: CloudLightning,
    isActive: true,
    items: [
      {
        title: "Add Contact",
        url: "/contacts/new",
      },
      {
        title: "Add Task",
        url: "/tasks/new",
      },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [
      {
        title: "👤 Account Settings",
        url: "/settings/account",
      },
    ],
  },
];
export function DashboardSidebar(): JSX.Element {
  //const { projects, loading } = useProjects();

  return (
    <SidebarContent>
      {/* Quick Links Navigation */}
      <NavMain items={quickLinksData} />
    </SidebarContent>
  );
}
