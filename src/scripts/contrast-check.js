const fs = require('fs');
const path = require('path');

// Color contrast checker utility
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 1/3) {
    r = x; g = c; b = 0;
  } else if (1/3 <= h && h < 1/2) {
    r = 0; g = c; b = x;
  } else if (1/2 <= h && h < 2/3) {
    r = 0; g = x; b = c;
  } else if (2/3 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function getLuminance(color) {
  const { r, g, b } = color;
  
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function meetsWCAGAA(foreground, background) {
  return getContrastRatio(foreground, background) >= 4.5;
}

// Brand colors
const brandColors = {
  light: {
    primary: hslToRgb(166.15, 88.46, 40.78), // teal-500
    accent: hslToRgb(199.11, 88.89, 46.27),  // sky-500
    background: hslToRgb(0, 0, 100),          // white
    foreground: hslToRgb(210, 25, 7.8),      // dark gray
  },
  dark: {
    primary: hslToRgb(166.15, 75.86, 56.47), // lighter teal
    accent: hslToRgb(199.59, 76.47, 61.18),  // lighter sky
    background: hslToRgb(210, 25, 7.8),      // dark gray
    foreground: hslToRgb(200, 6.67, 91.18),  // light gray
  }
};

// Validate all combinations
const results = {
  lightPrimaryOnBackground: getContrastRatio(brandColors.light.primary, brandColors.light.background),
  lightForegroundOnBackground: getContrastRatio(brandColors.light.foreground, brandColors.light.background),
  lightAccentOnBackground: getContrastRatio(brandColors.light.accent, brandColors.light.background),
  darkPrimaryOnBackground: getContrastRatio(brandColors.dark.primary, brandColors.dark.background),
  darkForegroundOnBackground: getContrastRatio(brandColors.dark.foreground, brandColors.dark.background),
  darkAccentOnBackground: getContrastRatio(brandColors.dark.accent, brandColors.dark.background),
};

console.log('\n🎨 Color Contrast Analysis Report\n');
console.log('='.repeat(50));

Object.entries(results).forEach(([combination, ratio]) => {
  const passes = ratio >= 4.5;
  const status = passes ? '✅ PASS' : '❌ FAIL';
  const grade = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'FAIL';
  
  console.log(`${status} ${combination}`);
  console.log(`      Contrast Ratio: ${ratio.toFixed(2)}:1 (${grade})`);
  console.log('');
});

const allPass = Object.values(results).every(ratio => ratio >= 4.5);

if (allPass) {
  console.log('🎉 All color combinations meet WCAG AA standards!');
  process.exit(0);
} else {
  console.log('⚠️  Some color combinations need adjustment for WCAG AA compliance.');
  console.log('   Minimum required ratio: 4.5:1');
  process.exit(1);
}
