import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AllergenIcons, allergenName, Button, Price, StarRating } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { MenuItem } from '@/types/app'
import { publicUrl } from '@/lib/publicUrl'

const ADDED_MS = 1400

export interface MenuCardProps {
  item: MenuItem
  soldOut: boolean
  /** The profile's allergen preferences. */
  avoid: readonly string[]
  inBag: number
  onAdd: (variant?: string) => void
}

function VariantChoice({ item, value, onChange, disabled }: { item: MenuItem; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <fieldset className="mt-4" disabled={disabled}>
      <legend className="mb-2 text-[13px] font-semibold text-muted">Choose one</legend>
      <div className="flex flex-wrap gap-2">
        {item.variants.map((v) => (
          <label
            key={v}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center rounded-full bg-raised px-4 text-[15px] font-semibold select-none',
              'transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100',
              'has-checked:bg-ink has-checked:text-surface has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
            )}
          >
            <input type="radio" name={`variant-${item.id}`} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            {v}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** One dish: photo, name, price, rating, description, allergens, calories, verified tag, variant, Add to bag. */
export function MenuCard({ item, soldOut, avoid, inBag, onAdd }: MenuCardProps) {
  const [variant, setVariant] = useState(item.variants[0] ?? '')
  const [added, setAdded] = useState(0)
  const hits = item.allergens.filter((a) => avoid.some((p) => p.toLowerCase() === a.toLowerCase()))

  useEffect(() => {
    if (!added) return
    const id = setTimeout(() => setAdded(0), ADDED_MS)
    return () => clearTimeout(id)
  }, [added])

  const add = () => {
    onAdd(item.variants.length ? variant : undefined)
    setAdded(Date.now())
  }

  return (
    <article className={cn('overflow-hidden rounded-card bg-surface', soldOut && 'opacity-60')} aria-labelledby={`dish-${item.id}`}>
      {item.photo_url && (
        <img src={publicUrl(item.photo_url)} alt="" loading="lazy" className={cn('aspect-[16/9] w-full object-cover', soldOut && 'grayscale')} />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 id={`dish-${item.id}`} className="text-base leading-snug font-semibold">
            {item.name}
          </h3>
          <Price cents={item.price_cents} className="text-base" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StarRating value={item.avg_rating ?? 0} count={item.rating_count} />
          {item.calories != null && <span className="num text-[13px] text-muted">{item.calories} cal</span>}
        </div>
        {item.description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <AllergenIcons allergens={item.allergens} warnFor={avoid} />
          {item.nutrition_verified && (
            <span className="inline-flex items-center rounded-full bg-positive-bg px-2.5 py-0.5 text-xs font-semibold text-positive-ink">
              Verified by UAB Nutrition students
            </span>
          )}
        </div>
        {hits.length > 0 && (
          <p role="note" className="mt-3 rounded-inner bg-danger-bg px-3 py-2 text-[13px] font-semibold text-danger-ink">
            Contains {hits.map(allergenName).join(' and ').toLowerCase()}, which you avoid.
          </p>
        )}

        {item.variants.length > 0 && <VariantChoice item={item} value={variant} onChange={setVariant} disabled={soldOut} />}

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="num text-[13px] font-semibold text-muted" aria-live="polite">
            {soldOut ? 'Sold out today' : inBag > 0 ? `${inBag} in your bag` : ''}
          </span>
          <Button variant="secondary" className="min-w-32" onClick={add} disabled={soldOut} aria-label={soldOut ? `${item.name}, sold out` : `Add ${item.name} to bag`}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={added ? 'added' : 'add'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                {soldOut ? 'Sold out' : added ? 'Added' : 'Add to bag'}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </article>
  )
}
