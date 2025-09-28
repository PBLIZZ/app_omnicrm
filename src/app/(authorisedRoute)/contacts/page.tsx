import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { OmniClientsPage } from "./_components/OmniClientsPage";

export const metadata: Metadata = {
  title: "OmniClients · OmniCRM",
  description:
    "AI-powered OmniClient management with calendar integration and smart insights for wellness practitioners",
};

/**
 * Server Component for OmniClients
 * Handles server-side authentication and initial data setup
 * Renders the OmniClientsPage component
 */
export default async function Page(): Promise<React.ReactNode> {
  // Server-side authentication check
  try {
    await getServerUserId();
  } catch {
    redirect("/login?next=/omni-clients");
  }

  // Server component renders OmniClientsPage component
  // All interactive functionality is handled by OmniClientsPage
  return <OmniClientsPage />;
}
