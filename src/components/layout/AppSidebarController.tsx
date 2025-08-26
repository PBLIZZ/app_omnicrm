"use client";

import { usePathname } from "next/navigation";

import { ContactsSidebar } from "@/app/(authorisedRoute)/contacts/_components/ContactsSidebar";
import { DashboardSidebar } from "@/app/(authorisedRoute)/dashboard/_components/DashboardSidebar";
import { TasksSidebar } from "@/app/(authorisedRoute)/tasks/_components/TasksSidebar";
import { MarketingSidebar } from "@/app/(authorisedRoute)/marketing/_components/MarketingSidebar";
import { MessagesSidebar } from "@/app/(authorisedRoute)/messages/_components/MessagesSidebar";
import { CalendarSidebar } from "@/app/(authorisedRoute)/calendar/_components/CalendarSidebar";
import { SettingsSidebar } from "@/app/(authorisedRoute)/settings/_components/SettingsSidebar";
import { AnalyticsSidebar } from "@/app/(authorisedRoute)/analytics/AnalyticsSidebar";

export function AppSidebarController(): JSX.Element {
  const pathname = usePathname();

  const getSidebarComponent = (): JSX.Element => {
    if (pathname.startsWith("/dashboard")) {
      return <DashboardSidebar />;
    }

    if (pathname.startsWith("/contacts")) {
      return <ContactsSidebar />;
    }

    if (pathname.startsWith("/tasks")) {
      return <TasksSidebar />;
    }

    if (pathname.startsWith("/marketing")) {
      return <MarketingSidebar />;
    }

    if (pathname.startsWith("/messages")) {
      return <MessagesSidebar />;
    }

    if (pathname.startsWith("/calendar")) {
      return <CalendarSidebar />;
    }

    if (pathname.startsWith("/settings")) {
      return <SettingsSidebar />;
    }

    if (pathname.startsWith("/analytics")) {
      return <AnalyticsSidebar />;
    }

    return <DashboardSidebar />;
  };

  return <>{getSidebarComponent()}</>;
}
