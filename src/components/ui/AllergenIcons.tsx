import { cn } from '@/lib/cn'

/** Short glyph + readable name for the common allergens; unknown keys show their own name. */
const ALLERGENS: Record<string, { glyph: string; name: string }> = {
  gluten: { glyph: 'G', name: 'Gluten' },
  wheat: { glyph: 'W', name: 'Wheat' },
  dairy: { glyph: 'D', name: 'Dairy' },
  milk: { glyph: 'D', name: 'Dairy' },
  egg: { glyph: 'E', name: 'Egg' },
  eggs: { glyph: 'E', name: 'Egg' },
  soy: { glyph: 'S', name: 'Soy' },
  peanut: { glyph: 'P', name: 'Peanut' },
  peanuts: { glyph: 'P', name: 'Peanut' },
  tree_nut: { glyph: 'N', name: 'Tree nuts' },
  tree_nuts: { glyph: 'N', name: 'Tree nuts' },
  fish: { glyph: 'F', name: 'Fish' },
  shellfish: { glyph: 'Sh', name: 'Shellfish' },
  sesame: { glyph: 'Se', name: 'Sesame' },
}

export const allergenName = (key: string): string =>
  ALLERGENS[key.toLowerCase()]?.name ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export interface AllergenIconsProps {
  allergens: readonly string[]
  /** Allergens the student avoids (profile prefs): shown as warnings. */
  warnFor?: readonly string[]
  className?: string
}

export function AllergenIcons({ allergens, warnFor = [], className }: AllergenIconsProps) {
  if (allergens.length === 0) return null
  const warn = new Set(warnFor.map((a) => a.toLowerCase()))
  const names = allergens.map(allergenName)
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label={`Contains ${names.join(', ')}`}>
      {allergens.map((a, i) => {
        const hit = warn.has(a.toLowerCase())
        return (
          <li
            key={a}
            className={cn(
              'inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-0.5 text-xs font-semibold',
              hit ? 'bg-danger-bg text-danger-ink' : 'bg-neutral-bg text-neutral-ink',
            )}
          >
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-surface text-xs font-bold">
              {ALLERGENS[a.toLowerCase()]?.glyph ?? names[i].charAt(0)}
            </span>
            {names[i]}
            {hit && <span className="sr-only"> (you avoid this)</span>}
          </li>
        )
      })}
    </ul>
  )
}
