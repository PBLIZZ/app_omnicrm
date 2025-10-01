"use client";

import { Users, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Badge,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui";

export function ContactsSidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SidebarContent>
      {/* Contacts Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>Contacts</SidebarGroupLabel>
        <SidebarMenu>
          {/* All Contacts link */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/contacts"}
              tooltip="All Contacts"
              className="justify-between w-full"
            >
              <Link href="/contacts">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>All Contacts</span>
                </div>
                <Badge
                  variant="default"
                  className="ml-auto bg-purple-50 border-purple-200 text-purple-700 text-xs"
                ></Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Add Contact */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                // Navigate to main contacts page and trigger add contact dialog
                router.push("/contacts?addContact=true");
              }}
              className="flex items-center w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="font-medium">Add Contact</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
