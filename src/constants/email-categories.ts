// Email categorization constants for wellness practitioners

export const PRIMARY_CATEGORIES = [
  "client_communication",
  "business_intelligence", 
  "educational",
  "administrative",
  "marketing",
  "personal",
  "spam"
] as const;

export const SUB_CATEGORIES = [
  "marketing",
  "thought_leadership",
  "course_content",
  "client_inquiry",
  "appointment_related",
  "invoice_payment",
  "general_business",
  "newsletter",
  "promotion",
  "personal_note",
  "spam_likely"
] as const;

export const URGENCY_LEVELS = [
  "low",
  "medium", 
  "high",
  "urgent"
] as const;

// TypeScript types derived from the constants

// Category descriptions for prompts
export const PRIMARY_CATEGORY_DESCRIPTIONS = {
  client_communication: "Direct communication from/to clients",
  business_intelligence: "Industry insights, thought leadership, business strategy",
  educational: "Courses, training, certifications, learning materials",
  administrative: "Invoices, payments, legal, compliance, operations",
  marketing: "Promotions, newsletters, advertising materials",
  personal: "Personal messages, social invitations",
  spam: "Obvious spam or irrelevant promotional content"
} as const;

export const SUB_CATEGORY_DESCRIPTIONS = {
  marketing: "Promotional content, deals, advertising",
  thought_leadership: "Industry insights, expert opinions",
  course_content: "Educational materials, training content",
  client_inquiry: "Questions from clients or prospects",
  appointment_related: "Booking, scheduling, appointment management",
  invoice_payment: "Financial transactions, billing",
  general_business: "Other business communications",
  newsletter: "Regular updates, industry news",
  promotion: "Special offers, deals, discounts",
  personal_note: "Personal communications",
  spam_likely: "Likely spam or irrelevant content"
} as const;
