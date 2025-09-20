"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
// Import type definitions for strict type safety
import { SelfCareModal } from "./SelfCareModal";
import { SessionModal } from "./SessionModal";
import { Calendar, CalendarDays, Clock } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CalendarEventCreateData, getHtmlLink, safeParseApiData } from "./types";
import { fetchPost } from "@/lib/api";

export function CalendarSidebar(): JSX.Element {
  const pathname = usePathname();

  const handleCreateEvent = async (eventData: CalendarEventCreateData): Promise<void> => {
    try {
      const result = await fetchPost<unknown>("/api/google/calendar/create", eventData);
      const parsedData = safeParseApiData(result);
      const htmlLink = getHtmlLink(parsedData.data);
      alert(`Event created successfully! View in Google Calendar: ${htmlLink}`);
    } catch (error) {
      console.error("Failed to create event:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create event. Please try again.";
      alert(errorMessage);
    }
  };

  return (
    <SidebarContent>
      {/* Calendar Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>Smart Scheduling</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/omni-rhythm"}>
              <Link href="/omni-rhythm" className="flex items-center w-full">
                <Calendar className="w-4 h-4 mr-3" />
                <span>Insights</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-rhythm/availability" className="flex items-center w-full">
                <CalendarDays className="w-4 h-4 mr-3" />
                <span>Availability</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-rhythm/prep" className="flex items-center w-full">
                <Clock className="w-4 h-4 mr-3" />
                <span>Prep</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Quick Actions */}
      <SidebarGroup>
        <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <SelfCareModal onCreateEvent={handleCreateEvent} />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <SessionModal onCreateEvent={handleCreateEvent} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
