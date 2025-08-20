"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  BarChart3,
  Users,
  CheckSquare,
  Zap,
  Settings,
  LogOut,
  HelpCircle,
  Bot,
  CreditCard,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchModal } from "@/components/SearchModal";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useContactCount } from "@/hooks/use-contact-count";
import { useTaskCount } from "@/hooks/use-task-count";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  tooltipText?: string;
}

const getNavigationItems = (contactCount: number, taskCount: number): NavigationItem[] => [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    id: "contacts",
    label: "Contacts",
    href: "/contacts",
    icon: Users,
    badge: contactCount,
    tooltipText: `Total contacts in your CRM: ${contactCount}`,
  },
  {
    id: "tasks",
    label: "Tasks & Approvals",
    href: "/tasks",
    icon: CheckSquare,
    badge: taskCount,
    tooltipText: `Pending tasks and approvals: ${taskCount}`,
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/integrations",
    icon: Zap,
  },
];

export default function AuthHeader(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount] = useState(3); // Example notification count
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Get dynamic counts for badges
  const contactCount = useContactCount();
  const taskCount = useTaskCount();

  const navigationItems = getNavigationItems(contactCount, taskCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      try {
        const { data, error } = await getSupabaseBrowser().auth.getUser();
        if (error) throw error;
        setUser(data.user);
      } catch {
        // Silent error - just set user to null for auth state
        setUser(null);
      }
    };
    void initAuth();
  }, []);

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      const { error } = await getSupabaseBrowser().auth.signOut();
      if (error) {
        toast.error("There was an issue signing out. Please try again.");
        return;
      }
      // Clear local state
      setUser(null);
      toast.success("You have been signed out successfully.");
      // Redirect to login
      window.location.href = "/login";
    } catch {
      toast.error("There was an issue signing out. Please try again.");
      // Force local cleanup and redirect even on error
      setUser(null);
      window.location.href = "/login";
    }
  }, []);

  const getInitials = (user: User | null): string => {
    // First try to get name from user_metadata
    const name = user?.user_metadata?.["name"] as string | undefined;
    if (name && typeof name === "string") {
      return name
        .split(" ")
        .map((n) => n[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }

    // Fallback to first part of email before @ symbol
    if (user?.email) {
      const emailName = user.email.split("@")[0];
      if (emailName && emailName.length >= 2) {
        return emailName.slice(0, 2).toUpperCase();
      }
      return emailName?.[0]?.toUpperCase() ?? "U";
    }

    return "U";
  };

  const isActiveRoute = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchShortcut = useCallback((event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      setIsSearchOpen(true);
    }
  }, []);

  const handleSearch = (): void => setIsSearchOpen(true);

  useEffect(() => {
    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, [handleSearchShortcut]);

  return (
    <header className="glass-navbar sticky top-0 z-50 h-16 w-full">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Omnipotency Logo"
              width={32}
              height={32}
              className="h-8 w-8 logo-glow"
            />
            <div className="hidden sm:block">
              <div className="typography-h3 text-slate-900">OmniCRM</div>
              <div className="text-xs text-teal-400 -mt-1">by Omnipotency.ai</div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <TooltipProvider>
          <nav className="hidden lg:flex items-center gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                    isActive
                      ? "wellness-active"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:!text-white dark:hover:!text-white dark:hover:bg-slate-700",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge && item.tooltipText ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="ml-1 h-5 px-1.5 text-xs hover:ring-1 hover:ring-slate-300 transition-all cursor-help"
                        >
                          {item.badge}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.tooltipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : item.badge ? (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 px-1.5 text-xs hover:ring-1 hover:ring-slate-300 transition-all"
                    >
                      {item.badge}
                    </Badge>
                  ) : null}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-wellness-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </TooltipProvider>

        {/* Right Side - Search, AI, Notifications, User */}
        <div className="flex items-center gap-2">
          {/* Global Search */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 min-w-[200px] justify-start text-muted-foreground"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search clients, tasks, notes...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>

          {/* Mobile Search */}
          <Button variant="ghost" size="sm" className="md:hidden" onClick={handleSearch}>
            <Search className="h-5 w-5" />
          </Button>

          {/* AI Assistant Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="relative hover-glow"
            onClick={() => {
              toast.info("AI Assistant coming soon! Track progress at GitHub Issues.");
            }}
          >
            <Bot className="h-6 w-6" />
          </Button>

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                {!mounted ? (
                  <Monitor className="h-5 w-5" />
                ) : theme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : theme === "light" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center pulse"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2">
                <h4 className="font-medium">Notifications</h4>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2 rounded border-l-2 border-green-500">
                    <div className="text-green-500 mt-1">🟢</div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Appointment confirmed</p>
                      <p className="text-xs text-muted-foreground">Sarah M. - Tomorrow 3:00 PM</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded border-l-2 border-blue-500">
                    <div className="text-blue-500 mt-1">🤖</div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">AI approval ready</p>
                      <p className="text-xs text-muted-foreground">3 email drafts need review</p>
                      <p className="text-xs text-muted-foreground">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded border-l-2 border-orange-500">
                    <div className="text-orange-500 mt-1">📧</div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">New client message</p>
                      <p className="text-xs text-muted-foreground">John D. asked about pricing</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Mark all as read
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  View all
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        (user.user_metadata?.["avatar_url"] as string | undefined) ??
                        (user.user_metadata?.["picture"] as string | undefined)
                      }
                      alt={
                        (user.user_metadata?.["name"] as string | undefined) ?? user.email ?? "User"
                      }
                    />
                    <AvatarFallback className="bg-wellness-primary text-white text-sm">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2 text-sm">
                  <div className="font-medium">
                    {(user.user_metadata?.["name"] as string | undefined) ??
                      user.email?.split("@")[0] ??
                      "User"}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/billing" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Upgrade plan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Get Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TooltipProvider>
            <nav className="flex flex-col p-4 gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "wellness-active"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:!text-white dark:hover:!text-white dark:hover:bg-slate-700",
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                    {item.badge && item.tooltipText ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="ml-auto hover:ring-1 hover:ring-slate-300 transition-all cursor-help"
                          >
                            {item.badge}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.tooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : item.badge ? (
                      <Badge
                        variant="secondary"
                        className="ml-auto hover:ring-1 hover:ring-slate-300 transition-all"
                      >
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </TooltipProvider>
        </div>
      )}

      <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>
  );
}
