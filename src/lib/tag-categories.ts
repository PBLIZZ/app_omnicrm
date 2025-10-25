/**
 * Tag Category Configuration - Wellness Practitioner Edition
 * Updated: 2025-10-24
 *
 * Semantic categories for wellness practice tags.
 * Tags are universal - same tag (e.g., "Reiki") can be used across
 * tasks, notes, goals, and contacts with consistent color.
 *
 * 70+ starter tags across 6 semantic categories
 * Chakra-aligned color scheme: Crown → Throat → Heart → Solar Plexus → Sacral → Root
 */

export type TagCategory =
  | "services_modalities"
  | "client_demographics"
  | "schedule_attendance"
  | "health_wellness"
  | "marketing_engagement"
  | "emotional_mental";

export interface CategoryConfig {
  name: string;
  emoji: string;
  color: string;
  description: string;
  examples: string[];
}

/**
 * Default category colors - desaturated Tailwind colors (50-level)
 * Chakra-aligned: Crown (violet) → Throat (sky) → Heart (teal) → Solar Plexus (yellow) → Sacral (orange) → Root (rose)
 */
export const TAG_CATEGORY_COLORS: Record<TagCategory, string> = {
  services_modalities: "#f5f3ff", // violet-50 - Crown Chakra - for treatment/service types
  schedule_attendance: "#f0f9ff", // sky-50 - Throat Chakra - for booking patterns
  health_wellness: "#f0fdfa", // teal-50 - Heart Chakra - for health objectives
  client_demographics: "#fefce8", // yellow-50 - Solar Plexus Chakra - for client characteristics
  marketing_engagement: "#fff7ed", // orange-50 - Sacral Chakra - for marketing and social media
  emotional_mental: "#fff1f2", // rose-50 - Root Chakra - for mental health focus
};

/**
 * Border colors (300-level) for each category
 */
export const TAG_CATEGORY_BORDER_COLORS: Record<TagCategory, string> = {
  services_modalities: "#c4b5fd", // violet-300
  schedule_attendance: "#7dd3fc", // sky-300
  health_wellness: "#5eead4", // teal-300
  client_demographics: "#fde047", // yellow-300
  marketing_engagement: "#fdba74", // orange-300
  emotional_mental: "#fda4af", // rose-300
};

/**
 * Text colors (850-level) for each category
 */
export const TAG_CATEGORY_TEXT_COLORS: Record<TagCategory, string> = {
  services_modalities: "#4c1d95", // violet-850 approximation
  schedule_attendance: "#075985", // sky-850 approximation
  health_wellness: "#134e4a", // teal-850 approximation
  client_demographics: "#713f12", // yellow-850 approximation
  marketing_engagement: "#7c2d12", // orange-850 approximation
  emotional_mental: "#881337", // rose-850 approximation
};

/**
 * Card border colors (200-level) for each category
 */
export const TAG_CATEGORY_CARD_BORDER_COLORS: Record<TagCategory, string> = {
  services_modalities: "#ddd6fe", // violet-200
  schedule_attendance: "#bae6fd", // sky-200
  health_wellness: "#99f6e4", // teal-200
  client_demographics: "#fef08a", // yellow-200
  marketing_engagement: "#fed7aa", // orange-200
  emotional_mental: "#fecdd3", // rose-200
};

/**
 * Category metadata for UI display
 * Chakra-aligned order: Crown → Throat → Heart → Solar Plexus → Sacral → Root
 * Each emoji represents the chakra's traditional symbolism
 */
export const TAG_CATEGORIES: Record<TagCategory, CategoryConfig> = {
  services_modalities: {
    name: "Services & Modalities",
    emoji: "👑", // Crown Chakra - consciousness, spirituality
    color: TAG_CATEGORY_COLORS.services_modalities,
    description: "Treatment and service types",
    examples: ["Yoga", "Pilates", "Massage Therapy", "Reiki", "Acupuncture"],
  },
  schedule_attendance: {
    name: "Schedule & Attendance",
    emoji: "🗣️", // Throat Chakra - communication, expression
    color: TAG_CATEGORY_COLORS.schedule_attendance,
    description: "Booking patterns and attendance",
    examples: ["Weekday AM", "Weekends", "Package Holder", "No Show"],
  },
  health_wellness: {
    name: "Health & Wellness Goals",
    emoji: "💚", // Heart Chakra - love, healing, compassion
    color: TAG_CATEGORY_COLORS.health_wellness,
    description: "Client health objectives",
    examples: ["Stress Relief", "Pain Management", "Flexibility", "Weight Loss"],
  },
  client_demographics: {
    name: "Client Demographics",
    emoji: "☀️", // Solar Plexus Chakra - personal power, confidence
    color: TAG_CATEGORY_COLORS.client_demographics,
    description: "Client types and life stages",
    examples: ["New Client", "Regular Client", "Athletes", "Seniors", "Expecting Mum"],
  },
  marketing_engagement: {
    name: "Marketing & Engagement",
    emoji: "⚡", // Sacral Chakra - creativity, passion, energy
    color: TAG_CATEGORY_COLORS.marketing_engagement,
    description: "Marketing channels and client engagement",
    examples: ["Instagram", "Newsletter", "Referral Source", "Testimonial", "Workshop"],
  },
  emotional_mental: {
    name: "Emotional & Mental Focus",
    emoji: "🐍", // Root Chakra - kundalini serpent, grounding, foundation
    color: TAG_CATEGORY_COLORS.emotional_mental,
    description: "Mental health and emotional wellbeing",
    examples: ["Anxiety", "Burnout", "Confidence", "Mindfulness Practice"],
  },
};

/**
 * Additional colors for user-created custom tags
 */
export const ADDITIONAL_TAG_COLORS = [
  "#5eead4", // Teal
  "#fca5a5", // Coral
  "#6ee7b7", // Emerald
  "#c084fc", // Purple
  "#fde047", // Yellow
  "#f472b6", // Pink
];

/**
 * Get color for a tag based on its category
 * Falls back to category default color
 */
export function getTagColor(
  category: TagCategory,
  customColor?: string | null,
): string {
  return customColor ?? TAG_CATEGORY_COLORS[category];
}

/**
 * Get all available tag colors (category colors + additional colors)
 */
export function getAllTagColors(): string[] {
  return [...Object.values(TAG_CATEGORY_COLORS), ...ADDITIONAL_TAG_COLORS];
}

/**
 * Format tag display text with count when needed
 * Shows max 2 tags, then "+ n more" indicator
 */
export function formatTagDisplay(
  tags: Array<{ name: string; color: string }>,
  maxVisible: number = 2,
): {
  visible: Array<{ name: string; color: string }>;
  remainingCount: number;
} {
  if (tags.length <= maxVisible) {
    return {
      visible: tags,
      remainingCount: 0,
    };
  }

  return {
    visible: tags.slice(0, maxVisible),
    remainingCount: tags.length - maxVisible,
  };
}

/**
 * 70+ Wellness Starter Tags organized by category
 * Chakra-aligned categories with comprehensive marketing tags
 */
export const WELLNESS_STARTER_TAGS: Record<
  TagCategory,
  Array<{ name: string; slug: string }>
> = {
  services_modalities: [
    { name: "Yoga", slug: "yoga" },
    { name: "Pilates", slug: "pilates" },
    { name: "Meditation", slug: "meditation" },
    { name: "Mindfulness", slug: "mindfulness" },
    { name: "Massage Therapy", slug: "massage-therapy" },
    { name: "Deep Tissue", slug: "deep-tissue" },
    { name: "Sports Massage", slug: "sports-massage" },
    { name: "Aromatherapy", slug: "aromatherapy" },
    { name: "Reiki", slug: "reiki" },
    { name: "Acupuncture", slug: "acupuncture" },
  ],
  schedule_attendance: [
    { name: "Weekday AM", slug: "weekday-am" },
    { name: "Weekday PM", slug: "weekday-pm" },
    { name: "Weekends", slug: "weekends" },
    { name: "Mornings Only", slug: "mornings-only" },
    { name: "Evenings Only", slug: "evenings-only" },
    { name: "Irregular Attendance", slug: "irregular-attendance" },
    { name: "Cancelled Session", slug: "cancelled-session" },
    { name: "No Show", slug: "no-show" },
    { name: "Late Arrival", slug: "late-arrival" },
    { name: "Package Holder", slug: "package-holder" },
    { name: "Follow-up", slug: "follow-up" },
    { name: "Renewal Due", slug: "renewal-due" },
    { name: "Membership Expired", slug: "membership-expired" },
  ],
  health_wellness: [
    { name: "Stress Relief", slug: "stress-relief" },
    { name: "Pain Management", slug: "pain-management" },
    { name: "Muscle Tension", slug: "muscle-tension" },
    { name: "Sleep Improvement", slug: "sleep-improvement" },
    { name: "Energy Boost", slug: "energy-boost" },
    { name: "Injury Rehab", slug: "injury-rehab" },
    { name: "Weight Loss", slug: "weight-loss" },
    { name: "Flexibility", slug: "flexibility" },
    { name: "Posture Correction", slug: "posture-correction" },
    { name: "Mobility", slug: "mobility" },
    { name: "Assessment", slug: "assessment" },
  ],
  client_demographics: [
    { name: "New Client", slug: "new-client" },
    { name: "Returning Client", slug: "returning-client" },
    { name: "Regular Client", slug: "regular-client" },
    { name: "Trial Session", slug: "trial-session" },
    { name: "Expecting Mum", slug: "expecting-mum" },
    { name: "Postpartum", slug: "postpartum" },
    { name: "Seniors", slug: "seniors" },
    { name: "Athletes", slug: "athletes" },
    { name: "Fitness Buffs", slug: "fitness-buffs" },
    { name: "Office Workers", slug: "office-workers" },
    { name: "Intro Session", slug: "intro-session" },
    { name: "Feedback Requested", slug: "feedback-requested" },
    { name: "Referral Given", slug: "referral-given" },
    { name: "Upsell Opportunity", slug: "upsell-opportunity" },
    { name: "Membership Active", slug: "membership-active" },
    { name: "Gift Voucher", slug: "gift-voucher" },
  ],
  marketing_engagement: [
    { name: "Instagram", slug: "instagram" },
    { name: "Facebook", slug: "facebook" },
    { name: "TikTok", slug: "tiktok" },
    { name: "YouTube", slug: "youtube" },
    { name: "Newsletter", slug: "newsletter" },
    { name: "Blog Reader", slug: "blog-reader" },
    { name: "Referral Source", slug: "referral-source" },
    { name: "Word of Mouth", slug: "word-of-mouth" },
    { name: "Workshop", slug: "workshop" },
    { name: "Retreat", slug: "retreat" },
    { name: "Testimonial", slug: "testimonial" },
    { name: "Review Given", slug: "review-given" },
    { name: "Photo Consent", slug: "photo-consent" },
    { name: "Social Media Opt-In", slug: "social-media-opt-in" },
  ],
  emotional_mental: [
    { name: "Anxiety", slug: "anxiety" },
    { name: "Burnout", slug: "burnout" },
    { name: "Emotional Release", slug: "emotional-release" },
    { name: "Confidence", slug: "confidence" },
    { name: "Focus", slug: "focus" },
    { name: "Relaxation", slug: "relaxation" },
    { name: "Motivation", slug: "motivation" },
    { name: "Mindfulness Practice", slug: "mindfulness-practice" },
    { name: "Self Care", slug: "self-care" },
    { name: "Trauma Informed", slug: "trauma-informed" },
  ],
};
