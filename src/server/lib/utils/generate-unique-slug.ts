import slugify from "slugify";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";

/**
 * SERVER-ONLY: Generate a unique slug for a client based on their display name
 * This function requires database access and should NEVER be imported in client code
 *
 * @param displayName - The client's display name to convert to a slug
 * @param userId - The user ID to scope the uniqueness check
 * @param excludeId - Optional contact ID to exclude from uniqueness check (for updates)
 * @returns Promise<string> - A unique slug
 */
export async function generateUniqueSlug(
  displayName: string,
  userId: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = slugify(displayName, {
    lower: true, // convert to lower case
    strict: true, // remove special characters
    trim: true, // trim leading/trailing spaces
  });

  // If the base slug is empty or too short, use a default
  if (!baseSlug || baseSlug.length < 2) {
    return `client-${Date.now()}`;
  }

  const db = await getDb();
  let slug = baseSlug;
  let suffix = 1;

  // Check if the slug already exists for this user
  while (true) {
    const whereClause = excludeId
      ? and(eq(contacts.userId, userId), eq(contacts.slug, slug), ne(contacts.id, excludeId))
      : and(eq(contacts.userId, userId), eq(contacts.slug, slug));

    const existingClient = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(whereClause)
      .limit(1);

    if (existingClient.length === 0) {
      break; // Slug is unique
    }

    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  return slug;
}
