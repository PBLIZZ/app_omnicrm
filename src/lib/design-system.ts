/**
 * Wellness Platform Design System Utilities
 * Core functions and constants for consistent design implementation
 */

// Design System Constants
export const WELLNESS_COLORS = {
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

export const WELLNESS_SEMANTIC = {
  primary: WELLNESS_COLORS.emerald[600],
  primaryLight: WELLNESS_COLORS.emerald[500],
  primaryDark: WELLNESS_COLORS.emerald[700],
  accent: WELLNESS_COLORS.teal[300],
  accentLight: WELLNESS_COLORS.teal[200],
  accentDark: WELLNESS_COLORS.teal[400],
  info: WELLNESS_COLORS.teal[500],
  success: WELLNESS_COLORS.emerald[500],
  warning: WELLNESS_COLORS.amber[500],
  danger: "#ef4444",
} as const;

export const SPACING = {
  xs: "0.5rem", // 8px
  sm: "0.75rem", // 12px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
  "3xl": "4rem", // 64px
} as const;

export const TYPOGRAPHY = {
  h1: "text-3xl font-bold text-slate-900",
  h2: "text-2xl font-bold text-slate-900",
  h3: "text-lg font-semibold text-slate-900",
  h4: "text-base font-semibold text-slate-800",
  bodyLg: "text-base text-slate-700",
  body: "text-sm text-slate-600",
  bodySm: "text-xs text-slate-600",
  label: "text-sm font-medium text-slate-700",
  caption: "text-xs font-medium text-slate-500 uppercase tracking-wide",
} as const;

export const DURATIONS = {
  instant: "0ms",
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
  slowest: "1000ms",
} as const;

export const EASINGS = {
  linear: "linear",
  out: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  inOut: "cubic-bezier(0.45, 0, 0.55, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  wellness: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const;

export const SHADOWS = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  glowEmerald: "0 0 20px rgb(16 185 129 / 0.3)",
  glowAmber: "0 0 20px rgb(245 158 11 / 0.3)",
  glowTeal: "0 0 20px rgb(20 184 166 / 0.3)",
} as const;

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  max: 2147483647,
} as const;

// Utility Functions
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getWellnessColor(
  color: keyof typeof WELLNESS_COLORS,
  shade: keyof typeof WELLNESS_COLORS.emerald,
): string {
  return WELLNESS_COLORS[color][shade];
}

export function getSemanticColor(semantic: keyof typeof WELLNESS_SEMANTIC): string {
  return WELLNESS_SEMANTIC[semantic];
}

// Animation Utility Functions
export function createTransition(
  properties: string[],
  duration: keyof typeof DURATIONS = "normal",
  easing: keyof typeof EASINGS = "out",
): string {
  return properties
    .map((property) => `${property} ${DURATIONS[duration]} ${EASINGS[easing]}`)
    .join(", ");
}

export function createGlassEffect(
  opacity = 0.8,
  blur = 12,
): {
  backdropFilter: string;
  background: string;
  border: string;
  boxShadow: string;
} {
  return {
    backdropFilter: `blur(${blur}px)`,
    background: `rgba(255, 255, 255, ${opacity})`,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    boxShadow: SHADOWS.lg,
  };
}

// Theme Utilities
export function createWellnessGradient(
  direction = "135deg",
  colors: [string, string] = [WELLNESS_COLORS.emerald[500], WELLNESS_COLORS.teal[600]],
): string {
  return `linear-gradient(${direction}, ${colors[0]} 0%, ${colors[1]} 100%)`;
}

// Typography Utilities
export function getTypographyClass(variant: keyof typeof TYPOGRAPHY): string {
  return TYPOGRAPHY[variant];
}

// Responsive Utilities
export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export function createResponsiveClass(
  breakpoint: keyof typeof BREAKPOINTS,
  classes: string,
): string {
  return `${breakpoint}:${classes}`;
}

// Component State Utilities
export const COMPONENT_STATES = {
  default: "text-slate-600 hover:text-slate-900",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  hover: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
  selected: "bg-emerald-100 text-emerald-800 border-emerald-300",
  disabled: "text-slate-400 cursor-not-allowed opacity-50",
  focus: "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
} as const;

export function getComponentState(state: keyof typeof COMPONENT_STATES): string {
  return COMPONENT_STATES[state];
}

// Validation for design system usage
export function validateWellnessColor(color: string): boolean {
  const allColors = Object.values(WELLNESS_COLORS).flatMap((scale) =>
    Object.values(scale),
  ) as string[];
  return allColors.includes(color);
}

export function validateSpacing(spacing: string): boolean {
  return (Object.values(SPACING) as string[]).includes(spacing);
}

// Design System Export for easy importing
export const WellnessDesignSystem = {
  colors: WELLNESS_COLORS,
  semantic: WELLNESS_SEMANTIC,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  durations: DURATIONS,
  easings: EASINGS,
  shadows: SHADOWS,
  zIndex: Z_INDEX,
  breakpoints: BREAKPOINTS,
  states: COMPONENT_STATES,
  utils: {
    cn,
    getWellnessColor,
    getSemanticColor,
    createTransition,
    createGlassEffect,
    createWellnessGradient,
    getTypographyClass,
    createResponsiveClass,
    getComponentState,
    validateWellnessColor,
    validateSpacing,
  },
} as const;

export default WellnessDesignSystem;
