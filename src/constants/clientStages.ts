/**
 * Client lifecycle stages for the OmniCRM system
 * These stages represent the different phases a client can be in
 */
export const CLIENT_STAGES = [
  "Prospect",
  "New Client",
  "Core Client",
  "Referring Client",
  "VIP Client",
  "Lost Client",
  "At Risk Client",
] as const;

export type ClientStage = (typeof CLIENT_STAGES)[number];
