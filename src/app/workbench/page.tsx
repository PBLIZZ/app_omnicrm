// src/app/workbench/page.tsx
import { Metadata } from "next";
import WorkBench from "./_components/WorkBench";

export const metadata: Metadata = {
  title: "Prompt Workbench — AI-Assisted",
  description: "Local prompt builder + library with OpenRouter integration",
};

export default function Page() {
  return <WorkBench />;
}
