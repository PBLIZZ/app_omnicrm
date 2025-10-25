"use client";

import {
  Inbox,
  Brain,
  Target,
  BarChart3,
  CheckSquare,
  FolderKanban,
  Calendar,
  CalendarClock,
  CalendarDays,
  Zap,
} from "lucide-react";
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
import { useInboxStats } from "@/hooks/use-inbox";
import { useZones } from "@/hooks/use-zones";
import { ProjectsSidebar } from "./ProjectsSidebar";
import type { Project, Task } from "@/server/db/schema";

export function MomentumSidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { data: inboxStats } = useInboxStats();
  const { zones, isLoading: zonesLoading } = useZones();

  // Handlers for navigation
  const handleInboxSelect = (): void => {
    router.push("/omni-momentum");
  };

  const handleProjectSelect = (project: Project): void => {
    router.push(`/omni-momentum/projects/${project.id}`);
  };

  const handleTaskSelect = (task: Task): void => {
    // Open task detail sheet or navigate to task
    console.log("Task selected:", task);
  };

  return (
    <SidebarContent className="overflow-y-auto">
      {/* Dynamic Productivity Views */}
      <SidebarGroup>
        <SidebarGroupLabel>Views</SidebarGroupLabel>
        <SidebarMenu>
          {/* AI Inbox */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleInboxSelect}
              isActive={pathname === "/omni-momentum" || pathname === "/omni-momentum/inbox"}
              tooltip="AI-Powered Inbox"
              className="justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4" />
                <span>Inbox</span>
              </div>
              {inboxStats?.unprocessed && inboxStats.unprocessed > 0 && (
                <Badge
                  variant="outline"
                  className="ml-auto bg-amber-50 border-amber-200 text-amber-700 text-xs"
                >
                  {inboxStats?.unprocessed}
                </Badge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Due Today */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/due-today" className="flex items-center w-full">
                <CalendarClock className="w-4 h-4 mr-2" />
                <span className="font-medium">Due Today</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Upcoming */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/upcoming" className="flex items-center w-full">
                <CalendarDays className="w-4 h-4 mr-2" />
                <span className="font-medium">Upcoming</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Life-Business Zones */}
      <SidebarGroup>
        <SidebarGroupLabel>Get into the Zone</SidebarGroupLabel>
        <SidebarMenu>
          {zonesLoading ? (
            // Loading state
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <span>Loading zones...</span>
              </div>
            </SidebarMenuItem>
          ) : (
            zones.slice(0, 6).map((zone) => {
              // Convert zone name to slug
              const zoneSlug = zone.name.toLowerCase().replace(/\s+/g, "-");
              const isActive = pathname === `/omni-momentum/zones/${zoneSlug}`;

              // Get appropriate icon based on zone name
              const getZoneIcon = (zoneName: string) => {
                const name = zoneName.toLowerCase();
                if (name.includes("personal") || name.includes("wellness")) return Target;
                if (name.includes("self") || name.includes("care")) return Zap;
                if (name.includes("client")) return CheckSquare;
                if (name.includes("business") || name.includes("development")) return FolderKanban;
                if (name.includes("marketing") || name.includes("social")) return BarChart3;
                if (name.includes("admin") || name.includes("finance")) return Calendar;
                return Target; // Default icon
              };

              const IconComponent = getZoneIcon(zone.name);

              return (
                <SidebarMenuItem key={zone.uuidId}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={`/omni-momentum/zones/${zoneSlug}`}
                      className={`flex items-center w-full ${isActive ? "bg-blue-50 text-blue-700" : ""}`}
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      <span className="font-medium">{zone.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroup>

      {/* Projects */}
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <div className="px-2">
          <ProjectsSidebar
            onProjectSelect={handleProjectSelect}
            onTaskSelect={handleTaskSelect}
          />
        </div>
      </SidebarGroup>

      {/* Planning & Analytics */}
      <SidebarGroup>
        <SidebarGroupLabel>Wellness Intelligence</SidebarGroupLabel>
        <SidebarMenu>
          {/* AI Insights */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/insights" className="flex items-center w-full">
                <Brain className="w-4 h-4 mr-2" />
                <span className="font-medium">AI Insights</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Daily Pulse */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/pulse" className="flex items-center w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span className="font-medium">Daily Pulse</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
