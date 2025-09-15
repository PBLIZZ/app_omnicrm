"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Search, Users, Briefcase, Megaphone, Settings } from "lucide-react";

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} size="sm">
        <Link href={href} className="flex items-center w-full">
          {children}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function ConnectSidebar(): JSX.Element {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "emails";
  const section = searchParams.get("section");
  const filter = searchParams.get("filter");

  return (
    <SidebarContent>
      <SidebarSeparator />

      {/* Smart Emails (filters for Emails tab) */}
      <SidebarGroup>
        <SidebarGroupLabel>Smart Emails</SidebarGroupLabel>
        <SidebarMenu>
          <NavLink
            href="/omni-connect?view=emails&filter=client"
            isActive={view === "emails" && filter === "client"}
          >
            <Users className="h-4 w-4 mr-2" />
            <span>Client Emails</span>
          </NavLink>
          <NavLink
            href="/omni-connect?view=emails&filter=business"
            isActive={view === "emails" && filter === "business"}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            <span>Business Emails</span>
          </NavLink>
          <NavLink
            href="/omni-connect?view=emails&filter=marketing"
            isActive={view === "emails" && filter === "marketing"}
          >
            <Megaphone className="h-4 w-4 mr-2" />
            <span>Marketing & Reach</span>
          </NavLink>
          <NavLink
            href="/omni-connect?view=emails&filter=admin"
            isActive={view === "emails" && filter === "admin"}
          >
            <Settings className="h-4 w-4 mr-2" />
            <span>Admin</span>
          </NavLink>
        </SidebarMenu>
      </SidebarGroup>

      {/* Semantic Search */}
      <SidebarGroup>
        <SidebarGroupLabel>Semantic Search</SidebarGroupLabel>
        <SidebarMenu>
          <NavLink href="/omni-connect?view=search" isActive={view === "search"}>
            <Search className="h-4 w-4 mr-2" />
            <span>Search</span>
          </NavLink>
        </SidebarMenu>
      </SidebarGroup>

      {/* Business Analytics */}
      <SidebarGroup>
        <SidebarGroupLabel>Business Analytics</SidebarGroupLabel>
        <SidebarMenu>
          <NavLink
            href="/omni-connect?view=intelligence&section=categorization"
            isActive={view === "intelligence" && section === "categorization"}
          >
            <span className="ml-6">Categorization Status</span>
          </NavLink>
          <NavLink
            href="/omni-connect?view=intelligence&section=summary"
            isActive={view === "intelligence" && section === "summary"}
          >
            <span className="ml-6">Weekly Summary</span>
          </NavLink>
          <NavLink
            href="/omni-connect?view=intelligence&section=insights"
            isActive={view === "intelligence" && section === "insights"}
          >
            <span className="ml-6">AI Insights</span>
          </NavLink>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
