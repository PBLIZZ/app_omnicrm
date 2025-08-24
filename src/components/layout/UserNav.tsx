"use client";

import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";

// UI and Icon Imports
import { ChevronsUpDown, Sparkles, Settings, HelpCircle, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui";
import { signOut } from "@/lib/auth/auth-actions";

// Type for user metadata
interface UserMetadata {
  full_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

export function UserNav(): JSX.Element | null {
  // 1. Fetch user data internally using the useAuth hook
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { isMobile } = useSidebar();

  // 2. Handle the loading state gracefully
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // If there's no user, don't render anything
  if (!user) {
    return null;
  }

  // 3. Derive user details from the fetched user object
  const userMetadata = user.user_metadata as UserMetadata;
  const userDetails = {
    name: userMetadata?.full_name ?? user.email ?? "User",
    email: user.email ?? "",
    avatar: userMetadata?.avatar_url ?? "",
  };
  const userInitial = (userDetails.name[0] ?? "U").toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={userDetails.avatar} alt={userDetails.name} />
                <AvatarFallback className="rounded-lg">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userDetails.name}</span>
                <span className="truncate text-xs text-muted-foreground">{userDetails.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg z-50 bg-background border shadow-md text-[0.95rem]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userDetails.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userDetails.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/settings/billing")}>
                <Sparkles />
                Upgrade Plan
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/help")}>
                <HelpCircle />
                Get Help
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={async () => {
                  const { error } = await signOut();
                  if (!error) router.push("/login");
                }}
                className="text-red-400"
              >
                <LogOut />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
