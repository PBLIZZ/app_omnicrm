import { Metadata } from "next";
import { OmniRhythmPage } from "./_components/OmniRhythmPage";

export const metadata: Metadata = {
  title: "OmniCRM",
  description: "Rhythm: Intelligent insights about your wellness practice calendar and schedule",
};

export default function Page(): JSX.Element {
  return <OmniRhythmPage />;
}
