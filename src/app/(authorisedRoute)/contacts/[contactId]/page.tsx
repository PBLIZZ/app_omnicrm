import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getServerUserId } from "@/server/auth/user";
import { type Contact } from "@/server/db/schema";
import { ContactDetailsNavWrapper } from "@/app/(authorisedRoute)/contacts/_components/ContactDetailsNavWrapper";
import { ContactsRepository } from "@repo";
import { isOk, isErr } from "@/lib/utils/result";

interface ContactDetailProps {
  params: Promise<{ contactId: string }>;
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
 * Server Component for Contact Detail with dynamic route
 * URL pattern: /contacts/[contactId]
 * Handles server-side authentication and fetches contact data
 */
export default async function ContactDetailPage({
  params,
}: ContactDetailProps): Promise<React.ReactNode> {
  // Await params and validate contactId
  const { contactId } = await params;
  if (!contactId || typeof contactId !== "string") {
    notFound();
  }

  // Server-side authentication check
  let userId: string;
  try {
    const cookieStore = await cookies();
    userId = await getServerUserId(cookieStore);
  } catch {
    // Build the full path with contact ID and URL-encode it
    const fullPath = `/contacts/${contactId}`;
    const encodedPath = encodeURIComponent(fullPath);
    redirect(`/login?next=${encodedPath}`);
  }

  // Fetch contact data by ID
  const contact = await getContactById(userId, contactId);

  // Server component renders ContactDetailsNavWrapper component
  // All interactive functionality is handled by the client component
  return <ContactDetailsNavWrapper contactId={contact.id} />;
}

/**
 * Generate dynamic metadata for better SEO
 */
export async function generateMetadata({ params }: ContactDetailProps): Promise<Metadata> {
  try {
    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);
    const { contactId } = await params;

    if (!contactId) {
      return { title: "Contact Not Found · OmniCRM" };
    }

    const contact = await getContactById(userId, contactId);

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
