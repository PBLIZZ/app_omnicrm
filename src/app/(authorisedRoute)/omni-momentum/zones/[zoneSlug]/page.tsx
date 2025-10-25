import { notFound } from "next/navigation";
import { ZoneView } from "../_components/ZoneView";
import { getZoneBySlug } from "@/server/services/zones.service";

interface ZonePageProps {
  params: {
    zoneSlug: string;
  };
}

/**
 * Dynamic Zone Page
 *
 * Each zone gets its own dedicated workspace with:
 * - All tasks in that zone
 * - Zone-specific analytics and insights
 * - Focused task management tools
 * - Context switching for efficiency
 */
export default async function ZonePage({ params }: ZonePageProps): Promise<JSX.Element> {
  const { zoneSlug } = params;

  // Get zone data
  const zone = await getZoneBySlug(zoneSlug);

  if (!zone) {
    notFound();
  }

  return <ZoneView zone={zone} />;
}

// Generate static params for known zones
export async function generateStaticParams() {
  const zones = [
    "personal-wellness",
    "self-care",
    "client-care",
    "business-development",
    "social-media-marketing",
    "admin-finances",
  ];

  return zones.map((slug) => ({
    zoneSlug: slug,
  }));
}
