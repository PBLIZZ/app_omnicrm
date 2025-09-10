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
import { Home, Users, CheckSquare, Calendar1, Megaphone, Bot, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMomentumCount } from "@/hooks/use-momentum-count";
import { useOmniClientCount } from "@/hooks/use-omni-client-count";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Only include sections that have a page.tsx under (authorisedRoute), excluding Settings
const mainNavItems = [
  { title: "OmniFlow", href: "/omni-flow" as const, icon: Home },
  { title: "OmniClients", href: "/omni-clients" as const, icon: Users },
  { title: "OmniMomentum", href: "/omni-momentum" as const, icon: CheckSquare },
  { title: "OmniRhythm", href: "/omni-rhythm" as const, icon: Calendar1 },
  { title: "OmniConnect", href: "/omni-connect" as const, icon: Mail },
  { title: "OmniBot", href: "/omni-bot" as const, icon: Bot },
  { title: "OmniReach", href: "/omni-reach" as const, icon: Megaphone },
];

export function SidebarMainSectionNav(): JSX.Element {
  const pathname = usePathname() ?? "/";
  const momentumCount = useMomentumCount();
  const omniClientCount = useOmniClientCount();
  const { state } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Main</SidebarGroupLabel>
      <SidebarMenu>
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const count =
            item.href === "/omni-clients"
              ? omniClientCount
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
