"use client";

import {
  Inbox,
  Brain,
  Zap,
  Target,
  BarChart3,
  Plus,
  CheckSquare,
  FolderKanban,
  Calendar
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

export function MomentumSidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { data: inboxStats } = useInboxStats();

  // Handler for selecting "Inbox"
  const handleInboxSelect = (): void => {
    router.push("/omni-momentum");
  };

  return (
    <SidebarContent>
      {/* Quick Capture & Inbox */}
      <SidebarGroup>
        <SidebarGroupLabel>Quick Capture</SidebarGroupLabel>
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
                <span>AI Inbox</span>
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

          {/* Quick Add */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/quick-add" className="flex items-center w-full">
                <Plus className="w-4 h-4 mr-2" />
                <span className="font-medium">Quick Add</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Wellness Zones */}
      <SidebarGroup>
        <SidebarGroupLabel>Life-Business Zones</SidebarGroupLabel>
        <SidebarMenu>
          {/* Personal Wellness */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/zones/personal-wellness" className="flex items-center w-full">
                <Target className="w-4 h-4 mr-2" />
                <span className="font-medium">Personal Wellness</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Self Care */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/zones/self-care" className="flex items-center w-full">
                <Zap className="w-4 h-4 mr-2" />
                <span className="font-medium">Self Care</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Client Care */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/zones/client-care" className="flex items-center w-full">
                <CheckSquare className="w-4 h-4 mr-2" />
                <span className="font-medium">Client Care</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Business Development */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/zones/business-development" className="flex items-center w-full">
                <FolderKanban className="w-4 h-4 mr-2" />
                <span className="font-medium">Business Development</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Social Media & Marketing */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/zones/social-media-marketing" className="flex items-center w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span className="font-medium">Marketing</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Admin & Finances */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/omni-momentum/zones/admin-finances" className="flex items-center w-full">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="font-medium">Admin & Finances</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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