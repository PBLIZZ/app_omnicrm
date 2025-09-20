import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { MomentumPageLayout } from "./_components/MomentumPageLayout";

export const metadata: Metadata = {
  title: "OmniMomentum · OmniCRM",
  description:
    "AI-powered productivity suite for wellness practitioners. Dump everything, let AI organize into life-business zones with intelligent task prioritization.",
};

/**
 * Server Component for OmniMomentum Productivity Suite
 *
 * Handles server-side authentication and provides the foundation for
 * the wellness practitioner's AI-powered task management system.
 *
 * Research-driven design:
 * - Progressive disclosure interface to prevent overwhelm
 * - Wellness-appropriate terminology (Pathways, Pulse, Journey)
 * - Mobile-first for between-session task capture
 * - Invisible AI integration for seamless categorization
 */
export default async function Page(): Promise<React.ReactNode> {
  // Server-side authentication check
  try {
    await getServerUserId();
  } catch {
    redirect("/login?next=/omni-momentum");
  }

  // Server component renders the layout with static elements
  // All interactive functionality handled by client components within
  return <MomentumPageLayout />;
}