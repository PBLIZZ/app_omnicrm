import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { type Contact } from "@/server/db/business-schemas/contacts";
import { ContactDetailPageWithNavigation } from "@/app/(authorisedRoute)/contacts/_components/ContactDetailPageWithNavigation";
import { ContactsRepository } from "@repo";
import { isOk, isErr } from "@/lib/utils/result";

interface ContactDetailProps {
  searchParams: Promise<{ id?: string }>;
}

/**
 * Fetch contact data by ID
 */
async function getContactById(userId: string, contactId: string): Promise<Contact> {
  const result = await ContactsRepository.getContactById(userId, contactId);

  if (isErr(result)) {
    console.error("Failed to fetch contact:", result.error);
    notFound();
  }

  if (!isOk(result)) {
    console.error("Invalid result state");
    notFound();
  }

  if (result.data === null) {
    notFound();
  }

  return result.data;
}

/**
 * Server Component for Contact Detail with ID-based URLs
 * Handles server-side authentication and fetches contact data by ID
 * Renders the ContactDetailPageWithNavigation component with simplified routing
 */
export default async function Page({ searchParams }: ContactDetailProps): Promise<React.ReactNode> {
  // Await params and validate ID first
  const { id } = await searchParams;
  if (!id || typeof id !== "string") {
    notFound();
  }

  // Server-side authentication check
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch {
    // Build the full path with contact ID and URL-encode it
    const fullPath = `/contacts/details/${id}`;
    const encodedPath = encodeURIComponent(fullPath);
    redirect(`/login?next=${encodedPath}`);
  }

  // Fetch contact data by ID
  const contact = await getContactById(userId, id);

  // Server component renders ContactDetailPageWithNavigation component
  // All interactive functionality is handled by the client component
  return <ContactDetailPageWithNavigation contactId={contact.id} />;
}

/**
 * Generate dynamic metadata for better SEO
 */
export async function generateMetadata({ searchParams }: ContactDetailProps): Promise<Metadata> {
  try {
    const userId = await getServerUserId();
    const { id } = await searchParams;

    if (!id) {
      return { title: "Contact Not Found · OmniCRM" };
    }

    const contact = await getContactById(userId, id);

    return {
      title: `${contact.displayName} | Contacts · OmniCRM`,
      description: `Contact details and wellness insights for ${contact.displayName}. Manage interactions, notes, and contact relationship data.`,
      openGraph: {
        title: `${contact.displayName} | Contacts`,
        description: `Contact details for ${contact.displayName}`,
      },
    };
  } catch {
    return {
      title: "Contact Detail · OmniCRM",
      description: "Contact details and wellness insights",
    };
  }
}
