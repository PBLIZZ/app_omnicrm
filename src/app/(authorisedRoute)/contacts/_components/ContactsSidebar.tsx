"use client";

import { Users, UserPlus, LayoutGrid, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui";
import { useContacts } from "@/hooks/use-contacts";

export function ContactsSidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: contactsData } = useContacts("");

  // Extract contactId from pathname if on contact details page
  const contactIdMatch = pathname.match(/^\/contacts\/([^\/]+)$/);
  const contactId = contactIdMatch ? contactIdMatch[1] : null;
  const currentTab = searchParams.get("tab") || "overview";

  const handleTabChange = (tab: string): void => {
    if (contactId) {
      router.push(`/contacts/${contactId}?tab=${tab}`);
    }
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
                {contactsData?.total !== undefined && (
                  <Badge
                    variant="default"
                    className="ml-auto bg-purple-50 border-purple-200 text-purple-700 text-xs"
                  >
                    {contactsData.total}
                  </Badge>
                )}
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

      {/* Contact Detail Views - Only show when viewing a contact */}
      {contactId && (
        <SidebarGroup>
          <SidebarGroupLabel>Contact Views</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={currentTab === "overview"}
                onClick={() => handleTabChange("overview")}
                tooltip="Overview"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                <span>Overview</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={currentTab === "notes"}
                onClick={() => handleTabChange("notes")}
                tooltip="All Notes"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>All Notes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={currentTab === "details"}
                onClick={() => handleTabChange("details")}
                tooltip="Contact Details"
              >
                <User className="w-4 h-4 mr-2" />
                <span>Contact Details</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      )}
    </SidebarContent>
  );
}
