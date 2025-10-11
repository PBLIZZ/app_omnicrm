import type { Metadata } from "next";
import { ContactsPage } from "@/app/(authorisedRoute)/contacts/_components/ContactsPage";

export const metadata: Metadata = {
  title: "Contacts · OmniCRM",
  description:
    "AI-powered OmniClient management with calendar integration and smart insights for wellness practitioners",
};

/**
 * Server Component for Contacts
 * Auth is handled by the (authorisedRoute) layout
 * Renders the ContactsPage component
 */
export default function Page(): React.ReactNode {
  // Auth check is handled by the parent layout
  // All interactive functionality is handled by ContactsPage
  return <ContactsPage />;
}
