/**
 * Color Contrast Utility Functions
 * WCAG 2.1 compliant color contrast calculations
 */

import { WELLNESS_COLORS } from "./design-system";

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result?.[1] || !result[2] || !result[3]) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (lightest + 0.05) / (darkest + 0.05);
}

export function meetsWCAGContrast(
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA",
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return level === "AA" ? ratio >= 4.5 : ratio >= 7;
}

export function getAccessibleTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return WELLNESS_COLORS.slate[900];

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5 ? WELLNESS_COLORS.slate[900] : WELLNESS_COLORS.slate[50];
}

export function getDarkModeColor(
  lightColor: keyof typeof WELLNESS_COLORS,
  lightShade: keyof typeof WELLNESS_COLORS.teal,
): string {
  const colorScale = WELLNESS_COLORS[lightColor];
  const shadeNumber = parseInt(lightShade.toString());

  // For dark mode, use lighter shades for darker base colors
  if (shadeNumber >= 500) {
    const darkShade = Math.max(200, shadeNumber - 200);
    return colorScale[darkShade as keyof typeof colorScale] ?? colorScale["400"];
  }

  return colorScale[lightShade];
}

// Utility to validate if two colors meet accessibility standards
export function validateColorPair(
  foreground: string,
  background: string,
): {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  recommendation?: string;
} {
  const ratio = getContrastRatio(foreground, background);
  const meetsAA = ratio >= 4.5;
  const meetsAAA = ratio >= 7;

  let recommendation;
  if (!meetsAA) {
    recommendation =
      "Consider using a darker foreground or lighter background color to meet WCAG AA standards.";
  } else if (!meetsAAA) {
    recommendation =
      "Meets AA standards. For AAA compliance, consider increasing contrast further.";
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    meetsAA,
    meetsAAA,
    ...(recommendation && { recommendation }),
  };
}

// Generate accessible color variations
export function generateAccessibleVariations(
  baseColor: string,
  targetBackground: string,
): {
  lighter: string[];
  darker: string[];
  recommended?: string;
} {
  const variations: { lighter: string[]; darker: string[]; recommended?: string } = {
    lighter: [],
    darker: [],
  };

  const rgb = hexToRgb(baseColor);
  if (!rgb) return variations;

  // Generate lighter variations
  for (let i = 10; i <= 90; i += 10) {
    const factor = i / 100;
    const newR = Math.min(255, rgb.r + (255 - rgb.r) * factor);
    const newG = Math.min(255, rgb.g + (255 - rgb.g) * factor);
    const newB = Math.min(255, rgb.b + (255 - rgb.b) * factor);

    const newColor = `#${Math.round(newR).toString(16).padStart(2, "0")}${Math.round(newG).toString(16).padStart(2, "0")}${Math.round(newB).toString(16).padStart(2, "0")}`;
    variations.lighter.push(newColor);

    if (!variations.recommended && meetsWCAGContrast(newColor, targetBackground)) {
      variations.recommended = newColor;
    }
  }

  // Generate darker variations
  for (let i = 10; i <= 90; i += 10) {
    const factor = i / 100;
    const newR = Math.max(0, rgb.r * (1 - factor));
    const newG = Math.max(0, rgb.g * (1 - factor));
    const newB = Math.max(0, rgb.b * (1 - factor));

    const newColor = `#${Math.round(newR).toString(16).padStart(2, "0")}${Math.round(newG).toString(16).padStart(2, "0")}${Math.round(newB).toString(16).padStart(2, "0")}`;
    variations.darker.push(newColor);

    if (!variations.recommended && meetsWCAGContrast(newColor, targetBackground)) {
      variations.recommended = newColor;
    }
  }

  return variations;
}
