/**
 * ASTRA dark design tokens — derived from the web app's .dark block in index.css.
 * HSL values converted to hex:
 *   background:       hsl(230 20% 5%)    → #090D14
 *   foreground:       hsl(210 40% 96%)   → #EBF4FF
 *   primary:          hsl(255 80% 65%)   → #8B5CF6  (violet-500)
 *   card:             hsl(225 20%  8%)   → #0F1320
 *   muted:            hsl(225 20% 12%)   → #161B2E
 *   mutedForeground:  hsl(215 20% 55%)   → #7A8DA6
 *   border:           hsl(225 25% 16%)   → #1E2B40
 */

const colors = {
  // Force dark — ASTRA is a dark-identity app
  dark: {
    text: '#EBF4FF',
    tint: '#8B5CF6',
    background: '#090D14',
    foreground: '#EBF4FF',
    card: '#0F1320',
    cardForeground: '#EBF4FF',
    primary: '#8B5CF6',
    primaryForeground: '#FFFFFF',
    secondary: '#161B2E',
    secondaryForeground: '#A8B8CF',
    muted: '#161B2E',
    mutedForeground: '#7A8DA6',
    accent: '#8B5CF6',
    accentForeground: '#FFFFFF',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    border: '#1E2B40',
    input: '#1E2B40',
  },
  light: {
    text: '#090D14',
    tint: '#8B5CF6',
    background: '#F4F6FA',
    foreground: '#090D14',
    card: '#FFFFFF',
    cardForeground: '#090D14',
    primary: '#8B5CF6',
    primaryForeground: '#FFFFFF',
    secondary: '#EEF0F6',
    secondaryForeground: '#1A1A2E',
    muted: '#EEF0F6',
    mutedForeground: '#6B7897',
    accent: '#8B5CF6',
    accentForeground: '#FFFFFF',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    border: '#DDE3F0',
    input: '#DDE3F0',
  },
  radius: 12,
};

export default colors;
