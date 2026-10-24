import type { ApiError } from '@/lib/api'

export interface ErrorCopy {
  text: string
  /** One way out, when there is one. */
  fix?: { to: string; label: string }
}

const PICK_TIME = { to: '/order/time', label: 'Pick a time' }

/** A short, warm sentence for every ApiError code the order flow can hit. */
export function errorCopy(err: ApiError): ErrorCopy {
  switch (err.code) {
    case 'HOLD_EXPIRED':
      return { text: 'Your held spot ran out.', fix: { ...PICK_TIME, label: 'Pick a time again' } }
    case 'WINDOW_FULL':
      return { text: 'That pickup time just filled up.', fix: { ...PICK_TIME, label: 'Pick another time' } }
    case 'WINDOW_CLOSED':
      return { text: 'That pickup time has passed.', fix: { ...PICK_TIME, label: 'Pick a later time' } }
    case 'CART_CLOSED':
      return { text: 'This cart just closed for the day.', fix: { to: '/order', label: 'Choose another cart' } }
    case 'SOLD_OUT':
    case 'NOT_EXPRESS':
      // The store's message names the dish ("Rice bowl just sold out").
      return { text: `${err.message}. Remove it to keep going.` }
    case 'INVALID_INPUT':
      return { text: err.message.endsWith('.') ? err.message : `${err.message}.` }
    case 'NOT_FOUND':
      return { text: 'Something in your order is no longer on the menu.', fix: { to: '/order', label: 'Back to the menu' } }
    case 'PAYMENT_FAILED':
      return { text: "Payment didn't go through. Try again or pick another way to pay." }
    default:
      return { text: 'Something went wrong. Try again in a moment.' }
  }
}
