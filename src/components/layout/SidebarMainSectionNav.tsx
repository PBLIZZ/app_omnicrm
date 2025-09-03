"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Home, Users, CheckSquare, Calendar, MessageSquare, Megaphone, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContactCount } from "@/hooks/use-contact-count";
import { useMomentumCount } from "@/hooks/use-momentum-count";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Only include sections that have a page.tsx under (authorisedRoute), excluding Settings
const mainNavItems = [
  { title: "Dashboard", href: "/dashboard" as const, icon: Home },
  { title: "Contacts", href: "/contacts" as const, icon: Users },
  { title: "Omni Momentum", href: "/omni-momentum" as const, icon: CheckSquare },
  { title: "Omni Rhythm", href: "/omni-rhythm" as const, icon: Calendar },
  { title: "Omni Connect", href: "/omni-connect" as const, icon: MessageSquare },
  { title: "AI Chat", href: "/chat" as const, icon: Bot },
  { title: "Marketing", href: "/marketing" as const, icon: Megaphone },
];

export function SidebarMainSectionNav(): JSX.Element {
  const pathname = usePathname() ?? "/";
  const contactCount = useContactCount();
  const momentumCount = useMomentumCount();
  const { state } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Main</SidebarGroupLabel>
      <SidebarMenu>
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const count =
            item.href === "/contacts"
              ? contactCount
              : item.href === "/omni-momentum"
                ? momentumCount
                : 0;
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} data-nav="main">
                <Link href={item.href} className="flex items-center w-full">
                  <Icon className="h-4 w-4 mr-3" />
                  <span className="truncate">{item.title}</span>
                  {count > 0 && state === "expanded" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[10px] px-1.5 py-0 h-5 group-data-[collapsible=icon]:hidden"
                        >
                          {count}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
