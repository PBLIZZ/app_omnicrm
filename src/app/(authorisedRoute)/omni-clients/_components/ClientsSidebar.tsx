"use client";

import { Users, UserPlus, Heart, Brain } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Badge,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui";

export function ClientsSidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  // Handler for selecting "All Clients"
  const handleAllClientsSelect = (): void => {
    router.push("/omni-clients");
  };

  return (
    <SidebarContent>
      {/* OmniClients Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>OmniClients</SidebarGroupLabel>
        <SidebarMenu>
          {/* All Clients link */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleAllClientsSelect}
              isActive={pathname === "/omni-clients"}
              tooltip="All Clients"
              className="justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>All Clients</span>
              </div>
              <Badge
                variant="outline"
                className="ml-auto bg-purple-50 border-purple-200 text-purple-700 text-xs"
              ></Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Add Client */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                // Navigate to main clients page and trigger add client dialog
                router.push("/omni-clients?addClient=true");
              }}
              className="flex items-center w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="font-medium">Add Client</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Wellness Intelligence */}
      <SidebarGroup>
        <SidebarGroupLabel>Client Intelligence</SidebarGroupLabel>
        <SidebarMenu>
          {/* Client Journey */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-clients/journey" className="flex items-center w-full">
                <Heart className="w-4 h-4 mr-2" />
                <span className="font-medium">Wellness Journey</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* AI Insights */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-clients/insights" className="flex items-center w-full">
                <Brain className="w-4 h-4 mr-2" />
                <span className="font-medium">AI Insights</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
