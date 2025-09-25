// Validation utilities for clients domain

export type ClientStage =
  | "Prospect"
  | "New Client"
  | "Core Client"
  | "Referring Client"
  | "VIP Client"
  | "Lost Client"
  | "At Risk Client";

export type WellnessTag = "Yoga" | "Massage";

export function validateStage(stage: string): ClientStage {
  const validStages: ClientStage[] = [
    "Prospect",
    "New Client",
    "Core Client",
    "Referring Client",
    "VIP Client",
    "Lost Client",
    "At Risk Client",
  ];
  return validStages.includes(stage as ClientStage) ? (stage as ClientStage) : "Prospect";
}

export function validateTags(tags: string[]): WellnessTag[] {
  const validTags: WellnessTag[] = ["Yoga", "Massage"];
  return tags.filter((tag) => validTags.includes(tag as WellnessTag)).slice(0, 8) as WellnessTag[];
}
