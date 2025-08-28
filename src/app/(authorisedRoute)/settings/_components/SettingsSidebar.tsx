"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Icons for the settings navigation
import { User, CreditCard, Bell, Mail, Calendar as CalendarIcon } from "lucide-react";
import { getSyncStatus } from "@/lib/api/sync";

// Navigation items for the settings section
const settingsNavItems = [
  { title: "Account", href: "/settings/account", icon: User },
  { title: "Billing", href: "/settings/billing", icon: CreditCard },
  { title: "Notifications", href: "/settings/notifications", icon: Bell },
];

export function SettingsSidebar(): JSX.Element {
  const pathname = usePathname();
  const { data: syncStatus } = useQuery({
    queryKey: ["sync", "status"],
    queryFn: getSyncStatus,
    staleTime: 30_000,
  });

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Settings</SidebarGroupLabel>
        <SidebarMenu>
          {settingsNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={{ pathname: item.href }} className="flex items-center w-full">
                  <item.icon className="w-4 h-4 mr-3" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Integrations</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-md">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-3" />
                <span>Gmail</span>
              </div>
              <div className="text-xs">
                {syncStatus?.serviceTokens?.gmail ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <a href="/api/google/gmail/oauth" className="text-blue-600 hover:underline">
                    Connect
                  </a>
                )}
              </div>
            </div>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-md">
              <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-3" />
                <span>Calendar</span>
              </div>
              <div className="text-xs">
                {syncStatus?.serviceTokens?.calendar ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <a href="/api/calendar/oauth" className="text-blue-600 hover:underline">
                    Connect
                  </a>
                )}
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
