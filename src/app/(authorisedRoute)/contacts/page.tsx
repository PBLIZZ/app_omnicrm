import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { ContactsPage } from "@/app/(authorisedRoute)/contacts/_components/ContactsPage";

export const metadata: Metadata = {
  title: "Contacts · OmniCRM",
  description:
    "AI-powered OmniClient management with calendar integration and smart insights for wellness practitioners",
};

/**
 * Server Component for Contacts
 * Handles server-side authentication and initial data setup
 * Renders the ContactsPage component
 */
export default async function Page(): Promise<React.ReactNode> {
  // Server-side authentication check
  try {
    await getServerUserId();
  } catch {
    redirect("/login?next=/contacts");
  }

  // Server component renders ContactsPage component
  // All interactive functionality is handled by ContactsPage
  return <ContactsPage />;
}
