import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/cn'

export interface QrCodeProps {
  value: string
  /** What the code is for, read by screen readers. */
  label: string
  size?: number
  className?: string
}

/** Always dark-on-white with a quiet zone, so scanners read it on any background. */
export function QrCode({ value, label, size = 200, className }: QrCodeProps) {
  return (
    <div role="img" aria-label={label} className={cn('inline-block rounded-inner bg-white p-3', className)}>
      <QRCodeSVG value={value} size={size} level="M" bgColor="#FFFFFF" fgColor="#000000" />
    </div>
  )
}

/** The URL an order QR encodes: tracking for the student, handoff lookup for the crew scanner. */
export const orderQrUrl = (token: string, origin: string = window.location.origin): string => `${origin}/orders/${token}`
