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
import { Home, Users, Calendar1, Megaphone, Bot, Mail, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOmniClientCount } from "@/hooks/use-omni-client-count";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Only include sections that have a page.tsx under (authorisedRoute), excluding Settings
const mainNavItems = [
  { title: "omniFlow", href: "/omni-flow" as const, icon: Home },
  { title: "omniClients", href: "/omni-clients" as const, icon: Users },
  { title: "omniMomentum", href: "/omni-momentum" as const, icon: Zap },
  { title: "omniRhythm", href: "/omni-rhythm" as const, icon: Calendar1 },
  { title: "omniConnect", href: "/omni-connect" as const, icon: Mail },
  { title: "omniBot", href: "/omni-bot" as const, icon: Bot },
  { title: "omniReach", href: "/omni-reach" as const, icon: Megaphone },
];

export function SidebarMainSectionNav(): JSX.Element {
  const pathname = usePathname() ?? "/";
  const omniClientCount = useOmniClientCount();
  const { state } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Main</SidebarGroupLabel>
      <SidebarMenu>
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const count = item.href === "/omni-clients" ? omniClientCount : 0;
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
