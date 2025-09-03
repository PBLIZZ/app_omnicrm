/**
 * WCAG AA Contrast Ratio Checker
 * Ensures all color combinations meet the 4.5:1 ratio requirement
 */

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c/2;
  let r, g, b;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  } else {
    r = g = b = 0;
  }

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Calculate relative luminance
function getLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (sRGB[0] ?? 0) + 0.7152 * (sRGB[1] ?? 0) + 0.0722 * (sRGB[2] ?? 0);
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  // Parse HSL colors (format: "hsl(h s% l%)")
  const parseHSL = (hsl: string): [number, number, number] => {
    const match = hsl.match(/hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/);
    if (!match) throw new Error(`Invalid HSL format: ${hsl}`);
    return [parseFloat(match[1] ?? '0'), parseFloat(match[2] ?? '0'), parseFloat(match[3] ?? '0')];
  };

  const [h1, s1, l1] = parseHSL(color1);
  const [h2, s2, l2] = parseHSL(color2);

  const rgb1 = hslToRgb(h1, s1, l1);
  const rgb2 = hslToRgb(h2, s2, l2);

  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// Check if color combination meets WCAG AA standard
export function meetsWCAG_AA(bgColor: string, textColor: string): boolean {
  const ratio = getContrastRatio(bgColor, textColor);
  return ratio >= 4.5;
}

// OmniCRM color definitions for validation
export const omnicrmColors = {
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

// Validate all color combinations
export function validateAllContrasts(): { combination: string; ratio: number; passes: boolean; mode: string }[] {
  const results: { combination: string; ratio: number; passes: boolean; mode: string }[] = [];

  const checkCombinations = (colors: any, mode: string) => {
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

// Usage in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.table(validateAllContrasts());
}