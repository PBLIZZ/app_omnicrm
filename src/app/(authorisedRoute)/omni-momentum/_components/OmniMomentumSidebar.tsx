"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  TrendingUp,
  Inbox,
  MapPin,
  Activity,
  Heart,
  Target,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Workflow,
  BarChart3,
  Zap,
  UserPlus,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export function OmniMomentumSidebar() {
  // For now, we'll use overview as default and handle view switching in the client wrapper
  const activeView = "overview";
  // Core OmniMomentum navigation items
  const coreNavItems = [
    {
      id: "clarity",
      label: "Daily Clarity",
      icon: TrendingUp,
      description: "Today's focus & priorities",
      badge: null,
    },
    {
      id: "inbox",
      label: "Quick Capture",
      icon: Inbox,
      description: "Rapid thought collection",
      badge: { value: 3, variant: "default" as const },
    },
  ];

  // Productivity suite sections
  const pathwaysItems = [
    {
      id: "active-pathways",
      label: "Active Pathways",
      icon: MapPin,
      badge: { value: 4, variant: "secondary" as const },
      subItems: [
        { id: "client-programs", label: "Client Programs", icon: Users },
        { id: "content-creation", label: "Content Pipeline", icon: BookOpen },
        { id: "business-growth", label: "Business Growth", icon: BarChart3 },
      ],
    },
    {
      id: "workflows",
      label: "Smart Workflows",
      icon: Workflow,
      subItems: [
        { id: "client-onboarding", label: "Client Onboarding", icon: UserPlus },
        { id: "session-prep", label: "Session Preparation", icon: Calendar },
        { id: "follow-ups", label: "Follow-up Sequences", icon: Clock },
      ],
    },
  ];

  const habitFlowItems = [
    {
      id: "daily-practices",
      label: "Daily Practices",
      icon: Activity,
      subItems: [
        { id: "morning-routine", label: "Morning Flow", icon: Zap },
        { id: "client-energy", label: "Client Energy", icon: Heart },
        { id: "evening-review", label: "Evening Review", icon: CheckCircle2 },
      ],
    },
    {
      id: "wellness-goals",
      label: "Wellness Goals",
      icon: Target,
      badge: { value: 2, variant: "outline" as const },
    },
  ];

  const pulseItems = [
    {
      id: "momentum-insights",
      label: "Momentum Insights",
      icon: BarChart3,
      description: "Progress & patterns",
    },
    {
      id: "energy-tracking",
      label: "Energy Tracking",
      icon: Heart,
      description: "Personal wellness pulse",
    },
  ];

  const handleNavClick = (itemId: string) => {
    // For now, just show a placeholder - view switching will be implemented later
    console.log("Navigate to:", itemId);
  };

  const renderMenuItem = (item: any, isSubItem = false) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;

    const ButtonComponent = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;
    const ItemComponent = isSubItem ? SidebarMenuSubItem : SidebarMenuItem;

    return (
      <ItemComponent key={item.id}>
        <ButtonComponent
          onClick={() => handleNavClick(item.id)}
          className={`w-full ${isActive ? "bg-primary text-primary-foreground" : ""}`}
          title={item.description}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge
              variant={item.badge.variant}
              className="ml-auto h-5 px-1.5 
  text-xs"
            >
              {item.badge.value}
            </Badge>
          )}
        </ButtonComponent>

        {/* Render sub-items if they exist */}
        {item.subItems && !isSubItem && (
          <SidebarMenuSub>
            {item.subItems.map((subItem: any) => renderMenuItem(subItem, true))}
          </SidebarMenuSub>
        )}
      </ItemComponent>
    );
  };

  return (
    <>
      {/* Focus Section */}
      <Collapsible className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              Focus
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>{coreNavItems.map((item) => renderMenuItem(item))}</SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      {/* Pathways Section */}
      <Collapsible className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              Pathways
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>{pathwaysItems.map((item) => renderMenuItem(item))}</SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      {/* Journey Section (formerly Habit Flow) */}
      <Collapsible className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              Journey
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>{habitFlowItems.map((item) => renderMenuItem(item))}</SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      {/* Pulse Section */}
      <Collapsible className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              Pulse
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>{pulseItems.map((item) => renderMenuItem(item))}</SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </>
  );
}
