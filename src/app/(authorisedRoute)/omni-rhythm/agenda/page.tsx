import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rhythm Agenda - Omni Rhythm",
  description: "Daily agenda view of your wellness practice schedule",
};

export default function RhythmAgendaPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-left space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-teal-900 dark:text-teal-100">
          Rhythm Agenda
        </h1>
        <p className="text-left text-muted-foreground text-lg mx-auto">
          Daily agenda view of your wellness practice schedule
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Rhythm Agenda view coming soon...</p>
          <p className="text-sm text-muted-foreground mt-2">
            This will show your daily schedule in agenda format
          </p>
        </div>
      </div>
    </div>
  );
}