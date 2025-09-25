import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { type ContactDTO } from "@omnicrm/contracts";
import { ClientDetailPageWithNavigation } from "./_components/ClientDetailPageWithNavigation";
import { ContactsRepository } from "@repo";

interface ClientDetailProps {
  searchParams: Promise<{ id?: string }>;
}

/**
 * Fetch client data by ID
 */
async function getClientById(userId: string, clientId: string): Promise<ContactDTO> {
  const contact = await ContactsRepository.getContactById(userId, clientId);

  if (!contact) {
    notFound();
  }

  return contact;
}

/**
 * Server Component for OmniClient Detail with ID-based URLs
 * Handles server-side authentication and fetches client data by ID
 * Renders the ClientDetailPageWithNavigation component with simplified routing
 */
export default async function Page({ searchParams }: ClientDetailProps): Promise<React.ReactNode> {
  // Server-side authentication check
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch {
    redirect("/login?next=/omni-clients/details");
  }

  // Await params and validate ID
  const { id } = await searchParams;
  if (!id || typeof id !== "string") {
    notFound();
  }

  // Fetch client data by ID
  const client = await getClientById(userId, id);

  // Server component renders ClientDetailPageWithNavigation component
  // All interactive functionality is handled by the client component
  return <ClientDetailPageWithNavigation clientId={client.id} />;
}

/**
 * Generate dynamic metadata for better SEO
 */
export async function generateMetadata({ searchParams }: ClientDetailProps): Promise<Metadata> {
  try {
    const userId = await getServerUserId();
    const { id } = await searchParams;

    if (!id) {
      return { title: "Client Not Found · OmniCRM" };
    }

    const client = await getClientById(userId, id);

    return {
      title: `${client.displayName} | OmniClients · OmniCRM`,
      description: `Contact details and wellness insights for ${client.displayName}. Manage interactions, notes, and client relationship data.`,
      openGraph: {
        title: `${client.displayName} | OmniClients`,
        description: `Contact details for ${client.displayName}`,
      },
    };
  } catch {
    return {
      title: "Client Detail · OmniCRM",
      description: "Client details and wellness insights",
    };
  }
}
