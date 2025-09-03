import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rhythm Schedule - Omni Rhythm",
  description: "Calendar schedule view of your wellness practice",
};

export default function RhythmSchedulePage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-left space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-teal-900 dark:text-teal-100">
          Rhythm Schedule
        </h1>
        <p className="text-left text-muted-foreground text-lg mx-auto">
          Calendar schedule view of your wellness practice
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Rhythm Schedule view coming soon...</p>
          <p className="text-sm text-muted-foreground mt-2">
            This will show your calendar in schedule format with time slots
          </p>
        </div>
      </div>
    </div>
  );
}