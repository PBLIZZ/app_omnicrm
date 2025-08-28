import { getServerUserId } from "@/server/auth/user";
import { DailyFocusDashboard } from "./_components/DailyFocusDashboard";

export default async function DailyFocusPage() {
  const userId = await getServerUserId();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <DailyFocusDashboard
        userId={userId}
        energyLevel={3} // Default energy level, could come from a daily pulse widget
        onNavigateToCalendar={() => {}} // Would redirect to calendar
        onNavigateToContacts={() => {}} // Would redirect to contacts
        onNavigateToChat={() => {}} // Would redirect to chat
        onNavigateToAnalytics={() => {}} // Would redirect to analytics
      />
    </div>
  );
}