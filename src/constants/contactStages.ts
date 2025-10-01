/**
 * Contact lifecycle stages for the OmniCRM system
 * These stages represent the different phases a contact can be in
 */
export const CONTACT_STAGES = [
  "Prospect",
  "New Client",
  "Core Client",
  "Referring Client",
  "VIP Client",
  "Lost Client",
  "At Risk Client",
] as const;

export type ContactStage = (typeof CONTACT_STAGES)[number];

