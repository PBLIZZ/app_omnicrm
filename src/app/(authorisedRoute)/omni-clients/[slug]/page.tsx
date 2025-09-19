import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { type ContactDTO } from "@omnicrm/contracts";
import { ClientDetailPage } from "./_components/ClientDetailPage";
import { ContactsRepository } from "@repo";

interface ClientDetailProps {
  params: Promise<{ slug: string }>;
}

/**
 * Fetch client data by slug
 */
async function getClientBySlug(userId: string, slug: string): Promise<ContactDTO> {
  const contact = await ContactsRepository.getBySlug(userId, slug);

  if (!contact) {
    notFound();
  }

  return contact;
}

/**
 * Server Component for OmniClient Detail with Slug-based URLs
 * Handles server-side authentication and fetches client data by slug
 * Renders the ClientDetailPage component with clean URLs like /omni-clients/sarah-johnson
 */
export default async function Page({ params }: ClientDetailProps): Promise<React.ReactNode> {
  // Server-side authentication check
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch {
    const { slug } = await params;
    redirect(`/login?next=/omni-clients/${slug}`);
  }

  // Await params and validate slug
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    notFound();
  }

  // Fetch client data by slug
  const client = await getClientBySlug(userId, slug);

  // TypeScript doesn't understand that getClientBySlug throws via notFound()
  // so we add an explicit check even though it's technically unreachable
  if (!client) {
    notFound();
  }

  // Server component renders ClientDetailPage component
  // All interactive functionality is handled by ClientDetailPage
  return <ClientDetailPage clientId={client.id} />;
}

/**
 * Generate dynamic metadata for better SEO
 */
export async function generateMetadata({ params }: ClientDetailProps): Promise<Metadata> {
  try {
    const userId = await getServerUserId();
    const { slug } = await params;

    if (!slug) {
      return { title: "Client Not Found · OmniCRM" };
    }

    const client = await getClientBySlug(userId, slug);

    // TypeScript doesn't understand that getClientBySlug throws via notFound()
    // so we add an explicit check even though it's technically unreachable
    if (!client) {
      return { title: "Client Not Found · OmniCRM" };
    }

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
