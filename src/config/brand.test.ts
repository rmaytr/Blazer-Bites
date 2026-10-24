import { describe, expect, it } from 'vitest'
import { brand, type BrandPalette } from './brand'

// WCAG 2.x relative luminance and contrast ratio.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const TEXT_PAIRS: [keyof BrandPalette, keyof BrandPalette][] = [
  ['ink', 'ground'],
  ['ink', 'surface'],
  ['ink', 'raised'],
  ['muted', 'ground'],
  ['muted', 'surface'],
  ['muted', 'raised'],
  ['primary', 'surface'],
  ['primary', 'ground'],
  ['onPrimary', 'primary'],
  ['onDeep', 'deep'],
  ['gold', 'deep'],
  ['onGold', 'gold'],
  ['skyInk', 'skyTint'],
  ['campusInk', 'campusTint'],
  ['goldInk', 'goldTint'],
  ['evergreenInk', 'evergreenTint'],
  ['ink', 'skyTint'],
  ['ink', 'campusTint'],
  ['ink', 'goldTint'],
  ['ink', 'evergreenTint'],
  ['muted', 'skyTint'],
  ['muted', 'campusTint'],
  ['muted', 'goldTint'],
  ['muted', 'evergreenTint'],
  ['infoInk', 'infoBg'],
  ['positiveInk', 'positiveBg'],
  ['warningInk', 'warningBg'],
  ['dangerInk', 'dangerBg'],
  ['dangerInk', 'surface'],
  ['neutralInk', 'neutralBg'],
]

describe('brand palette', () => {
  it('meets WCAG AA (4.5:1) for every text pair', () => {
    const p = brand.colors.light
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(contrast(p[fg], p[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('gold on white or ground is NOT text-safe (use it as a fill with deep ink)', () => {
    expect(contrast(brand.colors.light.gold, brand.colors.light.surface)).toBeLessThan(4.5)
    expect(contrast(brand.colors.light.gold, brand.colors.light.ground)).toBeLessThan(4.5)
  })
  it('uses the UAB brand greens', () => {
    expect(brand.colors.light.primary).toBe('#1A5632')
    expect(brand.colors.light.deep).toBe('#033319')
  })
})
