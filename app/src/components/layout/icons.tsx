// One outline icon set: 24px grid, 1.8 stroke, round caps, currentColor.
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export interface IconProps {
  className?: string
}

export const HomeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </svg>
)

/** Rewards: a punch card. */
export const RewardsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} aria-hidden>
    <rect x="3" y="6" width="18" height="12" rx="2.5" />
    <circle cx="8" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="16" cy="12" r="1.4" />
  </svg>
)

/** Order: a food bag. */
export const BagIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </svg>
)

/** Orders: a receipt. */
export const ReceiptIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </svg>
)

export const PersonIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} aria-hidden>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20.5c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" />
  </svg>
)

export const ArrowLeftIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
