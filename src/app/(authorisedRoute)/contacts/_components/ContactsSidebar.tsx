"use client";

import { Users, UserPlus, Upload } from "lucide-react";
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

export function ContactsSidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  // Handler for selecting "All Contacts"
  const handleAllContactsSelect = (): void => {
    router.push("/contacts");
  };

  return (
    <SidebarContent>
      {/* Contacts Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>Contacts</SidebarGroupLabel>
        <SidebarMenu>
          {/* All Contacts link */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleAllContactsSelect}
              isActive={pathname === "/contacts"}
              tooltip="All Contacts"
              className="justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>All Contacts</span>
              </div>
              <Badge
                variant="outline"
                className="ml-auto bg-teal-50 border-teal-200 text-teal-700 text-xs"
              ></Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Add Contact */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/contacts/new" className="flex items-center w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="font-medium">Add Contact</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Connect Data Sources */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/contacts/connect" className="flex items-center w-full">
                <Upload className="w-4 h-4 mr-2" />
                <span className="font-medium">Connect Data</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
