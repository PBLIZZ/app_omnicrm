import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { UpcomingView } from "./_components/UpcomingView";

/**
 * Upcoming Page
 *
 * Shows all tasks due in the next 7 days across all projects and zones.
 * Common productivity view pattern found in most to-do apps.
 */
export default async function UpcomingPage(): Promise<JSX.Element> {
  // Server-side authentication check
  try {
    await getServerUserId();
  } catch {
    redirect("/login?next=/omni-momentum/upcoming");
  }

  return <UpcomingView />;
}
