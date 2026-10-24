// Theme: CSS variables generated from brand.ts. Light only for the demo (no dark mode, no toggle).
import { brand, type BrandPalette } from '@/config/brand'

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const vars = (p: BrandPalette) =>
  Object.entries(p)
    .map(([k, v]) => `--bb-${kebab(k)}:${v};`)
    .join('')

/** CSS that defines the --bb-* tokens. */
export function brandCss(): string {
  return `:root{${vars(brand.colors.light)}color-scheme:light;}`
}

/** Run once before the first render. */
export function installTheme(): void {
  const style = document.createElement('style')
  style.id = 'bb-brand'
  style.textContent = brandCss()
  document.head.prepend(style)
}
