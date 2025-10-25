"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Icons for the settings navigation
import {
  User,
  CreditCard,
  Bell,
  Mail,
  Calendar as CalendarIcon,
  FileText,
  Tag,
  Sparkles,
  Plug,
} from "lucide-react";
import { useSyncStatus } from "@/hooks/use-sync-status";

// Navigation items for the settings section - Wellness-friendly language
const settingsNavItems = [
  { title: "Practice Profile", href: "/settings/profile", icon: User },
  { title: "Account & Security", href: "/settings/account", icon: User },
  { title: "Plans & Payments", href: "/settings/billing", icon: CreditCard },
  { title: "Connect Your Tools", href: "/settings/integrations", icon: Plug },
  { title: "Stay Informed", href: "/settings/notifications", icon: Bell },
  { title: "Label Your Work", href: "/settings/tags", icon: Tag },
  { title: "Getting Started", href: "/settings/welcome-guide", icon: Sparkles },
  { title: "Client Intake", href: "/settings/onboarding", icon: FileText },
];

export function SettingsSidebar(): JSX.Element {
  const pathname = usePathname();

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
    </SidebarContent>
  );
}
