"use client";

import { usePathname } from "next/navigation";

import { ContactsSidebar } from "@/app/(authorisedRoute)/contacts/_components/ContactsSidebar";
import { DashboardSidebar } from "@/app/(authorisedRoute)/omni-flow/_components/DashboardSidebar";
import { MarketingSidebar } from "@/app/(authorisedRoute)/omni-reach/_components/MarketingSidebar";
import { ConnectSidebar } from "@/app/(authorisedRoute)/omni-connect/_components/ConnectSidebar";
import { CalendarSidebar } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarSidebar";
import { MomentumSidebar } from "@/app/(authorisedRoute)/omni-momentum/_components/MomentumSidebar";
import { SettingsSidebar } from "@/app/(authorisedRoute)/settings/_components/SettingsSidebar";
import { AnalyticsSidebar } from "@/app/(authorisedRoute)/analytics/AnalyticsSidebar";

export function AppSidebarController(): JSX.Element {
  const pathname = usePathname();

  const getSidebarComponent = (): JSX.Element => {
    if (pathname.startsWith("/omni-flow")) {
      return <DashboardSidebar />;
    }

    if (pathname.startsWith("/contacts")) {
      return <ContactsSidebar />;
    }

    if (pathname.startsWith("/omni-momentum")) {
      return <MomentumSidebar />;
    }

    if (pathname.startsWith("/omni-reach")) {
      return <MarketingSidebar />;
    }

    if (pathname.startsWith("/omni-connect")) {
      return <ConnectSidebar />;
    }

    if (pathname.startsWith("/omni-rhythm")) {
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
