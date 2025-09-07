import { Metadata } from "next";
import { OmniRhythmPage } from "./_components/OmniRhythmPage";

export const metadata: Metadata = {
  title: "Omni Rhythm",
  description: "Intelligent insights about your wellness practice calendar and schedule",
};

const Header = (): JSX.Element => (
  <div className="text-left space-y-4 mb-8">
    <h1 className="text-4xl font-bold tracking-tight text-teal-900 dark:text-teal-100">
      Omni Rhythm
    </h1>
    <p className="text-left text-muted-foreground text-lg mx-auto">
      Intelligent insights about your wellness practice calendar and schedule
    </p>
  </div>
);

export default function Page(): JSX.Element {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <Header />
      <OmniRhythmPage />
    </div>
  );
}
