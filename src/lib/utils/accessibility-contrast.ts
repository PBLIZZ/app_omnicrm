/**
 * Accessibility Contrast Utility Functions
 * WCAG 2.1 compliant color contrast calculations and validation
 */

// Wellness colors directly imported to avoid dependency on design-system.ts
const WELLNESS_COLORS = {
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
} as const;

// Color theme interface
interface ColorTheme {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  softSurface: string;
  highlight: string;
}

// OmniCRM color definitions for validation
export const omnicrmColors: { light: ColorTheme; dark: ColorTheme } = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(210 25% 7.8%)",
    primary: "hsl(166.15 88.46% 40.78%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(210 25% 94%)",
    secondaryForeground: "hsl(210 25% 15%)",
    muted: "hsl(240 1.96% 90%)",
    mutedForeground: "hsl(210 25% 35%)",
    accent: "hsl(199.11 88.89% 46.27%)",
    accentForeground: "hsl(0 0% 100%)",
    destructive: "hsl(356.3 90.56% 54.31%)",
    destructiveForeground: "hsl(0 0% 100%)",
    softSurface: "hsl(252.73 60.98% 93.53%)",
    highlight: "hsl(164 74% 94%)",
  },
  dark: {
    background: "hsl(0 0% 0%)",
    foreground: "hsl(200 6.67% 91.18%)",
    primary: "hsl(166.15 75.86% 56.47%)",
    primaryForeground: "hsl(210 25% 7.8%)",
    secondary: "hsl(210 5.26% 14.9%)",
    secondaryForeground: "hsl(200 6.67% 91.18%)",
    muted: "hsl(210 5.26% 14.9%)",
    mutedForeground: "hsl(210 3.39% 65%)",
    accent: "hsl(199.59 76.47% 61.18%)",
    accentForeground: "hsl(210 25% 7.8%)",
    destructive: "hsl(356.3 90.56% 54.31%)",
    destructiveForeground: "hsl(0 0% 100%)",
    softSurface: "hsl(258.46 59.09% 29.61%)",
    highlight: "hsl(164 60% 40% / 0.1)",
  },
};

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  } else {
    r = g = b = 0;
  }

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

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

// Calculate contrast ratio between two colors (supports both HEX and HSL)
export function getContrastRatio(color1: string, color2: string): number {
  // Check if colors are HSL format
  const isHSL1 = color1.includes("hsl(");
  const isHSL2 = color2.includes("hsl(");

  let rgb1: [number, number, number];
  let rgb2: [number, number, number];

  if (isHSL1) {
    const parseHSL = (hsl: string): [number, number, number] => {
      const match = hsl.match(/hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/);
      if (!match) throw new Error(`Invalid HSL format: ${hsl}`);
      return [
        parseFloat(match[1] ?? "0"),
        parseFloat(match[2] ?? "0"),
        parseFloat(match[3] ?? "0"),
      ];
    };
    const [h1, s1, l1] = parseHSL(color1);
    rgb1 = hslToRgb(h1, s1, l1);
  } else {
    const hexRgb1 = hexToRgb(color1);
    if (!hexRgb1) return 1;
    rgb1 = [hexRgb1.r, hexRgb1.g, hexRgb1.b];
  }

  if (isHSL2) {
    const parseHSL = (hsl: string): [number, number, number] => {
      const match = hsl.match(/hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/);
      if (!match) throw new Error(`Invalid HSL format: ${hsl}`);
      return [
        parseFloat(match[1] ?? "0"),
        parseFloat(match[2] ?? "0"),
        parseFloat(match[3] ?? "0"),
      ];
    };
    const [h2, s2, l2] = parseHSL(color2);
    rgb2 = hslToRgb(h2, s2, l2);
  } else {
    const hexRgb2 = hexToRgb(color2);
    if (!hexRgb2) return 1;
    rgb2 = [hexRgb2.r, hexRgb2.g, hexRgb2.b];
  }

  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);

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

// Alias for backward compatibility
export const meetsWCAG_AA = meetsWCAGContrast;

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

// Validate all color combinations
export function validateAllContrasts(): {
  combination: string;
  ratio: number;
  passes: boolean;
  mode: string;
}[] {
  const results: { combination: string; ratio: number; passes: boolean; mode: string }[] = [];

  const checkCombinations = (colors: ColorTheme, mode: string): void => {
    const combinations = [
      { bg: colors.primary, fg: colors.primaryForeground, name: "primary-badge" },
      { bg: colors.secondary, fg: colors.secondaryForeground, name: "secondary-badge" },
      { bg: colors.destructive, fg: colors.destructiveForeground, name: "destructive-badge" },
      { bg: colors.background, fg: colors.mutedForeground, name: "alert-description" },
      { bg: colors.background, fg: colors.foreground, name: "main-text" },
      { bg: colors.muted, fg: colors.mutedForeground, name: "muted-text" },
    ];

    combinations.forEach(({ bg, fg, name }) => {
      const ratio = getContrastRatio(bg, fg);
      const passes = ratio >= 4.5;
      results.push({ combination: `${name} (${mode})`, ratio, passes, mode });
    });
  };

  checkCombinations(omnicrmColors.light, "light");
  checkCombinations(omnicrmColors.dark, "dark");

  return results;
}

// Usage in development - accessibility debugging
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const results = validateAllContrasts();
  console.error("Accessibility Contrast Validation:", results);
}
