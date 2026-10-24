import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { submitRating, toApiError } from '@/lib/api'
import { Button, StarRating, toast } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { OrderViewItem, RatingTag } from '@/types/app'
import { COMMENT_MAX, RATING_TAGS } from './orders'
import { ToggleChip } from './SettingControls'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`You gave it ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" aria-hidden className={cn('size-5', n <= value ? 'text-gold' : 'text-muted')}>
          <path
            d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"
            fill={n <= value ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

interface RateDishProps {
  token: string
  item: OrderViewItem
}

/** One dish: one-tap stars, then optional tags and a comment, sent on its own. Read-only once rated. */
export function RateDish({ token, item }: RateDishProps) {
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState<RatingTag[]>([])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const name = item.variant ? `${item.name} (${item.variant})` : item.name
  const commentId = `comment-${item.id}`

  const toggle = (t: RatingTag) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const send = async () => {
    setBusy(true)
    try {
      await submitRating({ token, orderItemId: item.id, stars, tags, comment: comment.trim() || undefined })
      toast.success('Thanks, the kitchen sees this')
    } catch (e) {
      const err = toApiError(e)
      if (err.code === 'ALREADY_RATED') toast('You already rated this dish')
      else if (err.code === 'NOT_PICKED_UP') toast.error('Rate it after you pick it up')
      else toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-card bg-surface p-5">
      <div className="flex items-center gap-3">
        {item.photo_url && <img src={item.photo_url} alt="" className="size-14 flex-none rounded-inner bg-raised object-cover" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{name}</h2>
          {item.rated && item.stars !== null ? (
            <div className="mt-1 flex items-center gap-2">
              <Stars value={item.stars} />
              <span className="text-[13px] text-muted">Rated</span>
            </div>
          ) : (
            <p className="text-[13px] text-muted">How was it?</p>
          )}
        </div>
      </div>

      {!item.rated && (
        <>
          <StarRating value={stars} onChange={setStars} label={name} className="mt-3 -ml-1.5" />
          <AnimatePresence initial={false}>
            {stars > 0 && (
              <motion.div
                initial={{ opacity: 0, transform: 'translateY(-6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="mt-4"
              >
                <div role="group" aria-label="What stood out" className="flex flex-wrap gap-2">
                  {RATING_TAGS.map((t) => (
                    <ToggleChip key={t.id} tone="neutral" pressed={tags.includes(t.id)} onToggle={() => toggle(t.id)}>
                      {t.label}
                    </ToggleChip>
                  ))}
                </div>
                <label htmlFor={commentId} className="mt-4 block text-sm font-medium">
                  Anything else? <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id={commentId}
                  value={comment}
                  maxLength={COMMENT_MAX}
                  rows={3}
                  onChange={(e) => setComment(e.target.value)}
                  aria-describedby={`${commentId}-count`}
                  className="mt-2 block w-full resize-none rounded-inner bg-raised px-4 py-3 text-base placeholder:text-muted"
                  placeholder="A note for the chefs"
                />
                <p id={`${commentId}-count`} className="num mt-1 text-right text-[13px] text-muted">
                  {comment.length} / {COMMENT_MAX}
                </p>
                <Button size="lg" loading={busy} onClick={send} className="mt-2">
                  Send rating
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </li>
  )
}
