import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";
import { DueTodayView } from "./_components/DueTodayView";

/**
 * Due Today Page
 *
 * Shows all tasks due today across all projects and zones.
 * Common productivity view pattern found in most to-do apps.
 */
export default async function DueTodayPage(): Promise<JSX.Element> {
  // Server-side authentication check
  try {
    await getServerUserId();
  } catch {
    redirect("/login?next=/omni-momentum/due-today");
  }

  return <DueTodayView />;
}
