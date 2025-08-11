export const CATEGORY_LABEL_MAP: Record<string, string> = {
  Promotions: "CATEGORY_PROMOTIONS",
  Social: "CATEGORY_SOCIAL",
  Forums: "CATEGORY_FORUMS",
  Updates: "CATEGORY_UPDATES",
  Primary: "CATEGORY_PERSONAL",
};

export function toLabelId(labelName: string): string {
  return CATEGORY_LABEL_MAP[labelName] ?? labelName;
}
