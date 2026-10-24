// All branding lives here. Rename the app or change its colours in this one file.
// Imported by vite.config.ts too (manifest), so keep it free of browser-only code.

/** The colour roles (UAB brand, light only). Every pair used for text meets WCAG AA (4.5:1). */
export interface BrandPalette {
  ground: string // page background
  surface: string // cards, sheets
  raised: string // inputs, skeletons, quiet fills
  line: string // the rare 1px edge
  ink: string // running text
  muted: string // secondary text (still 4.5:1 on ground, surface and raised)
  primary: string // UAB Green: the one filled action per screen
  onPrimary: string
  deep: string // Dragon's Lair Green: the Order tab, the pickup-number card, dark bands
  onDeep: string
  gold: string // UAB Gold: fills only (the $5 deal, punches). Never gold text on white
  onGold: string
  // Brand accents, as data marks and map pins (not text)
  campus: string
  evergreen: string
  sky: string
  // Pale tiles with the dark of their own hue as ink (carts, statuses, chips)
  skyTint: string
  skyInk: string
  campusTint: string
  campusInk: string
  goldTint: string
  goldInk: string
  evergreenTint: string
  evergreenInk: string
  // Status pairs
  infoBg: string
  infoInk: string
  positiveBg: string // = evergreen tint: Ready, rating good, positive deltas
  positiveInk: string
  warningBg: string
  warningInk: string
  dangerBg: string
  dangerInk: string
  neutralBg: string
  neutralInk: string
  focus: string // focus ring
}

const palette = {
  ground: '#F5F7F4',
  surface: '#FFFFFF',
  raised: '#EDF1EC',
  line: '#E1E7E0',
  ink: '#0F1F17',
  muted: '#4E5C54',
  primary: '#1A5632',
  onPrimary: '#FFFFFF',
  deep: '#033319',
  onDeep: '#FFFFFF',
  gold: '#FDB913',
  onGold: '#033319',
  campus: '#90D408',
  evergreen: '#17B045',
  sky: '#42CAF0',
  skyTint: '#DDF4FC',
  skyInk: '#0A4A5E',
  campusTint: '#EEF8DA',
  campusInk: '#2C4700',
  goldTint: '#FFF6DB',
  goldInk: '#5C4300',
  evergreenTint: '#DDF4E4',
  evergreenInk: '#0B5A25',
  infoBg: '#DDF4FC',
  infoInk: '#0A4A5E',
  positiveBg: '#DDF4E4',
  positiveInk: '#0B5A25',
  warningBg: '#FFF1CC',
  warningInk: '#6B4700',
  dangerBg: '#FDE7E4',
  dangerInk: '#8A1C17',
  neutralBg: '#EDF1EC',
  neutralInk: '#4E5C54',
  focus: '#1A5632',
} as const satisfies BrandPalette

export const brand = {
  name: 'Blazer Bites',
  shortName: 'Blazer Bites',
  tagline: 'Chef-quality food. Under $10. In your hand in under 3 minutes.',
  /** Logo placeholder: swap the file in public/icons/ and keep the path. */
  logo: { src: '/icons/icon.svg', alt: 'Blazer Bites', monogram: 'BB' },
  colors: {
    green: palette.primary,
    gold: palette.gold,
    light: palette,
  },
} as const

export type Brand = typeof brand
