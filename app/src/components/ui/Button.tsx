import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-raised text-ink',
  gold: 'bg-gold text-on-gold',
  ghost: 'bg-transparent text-ink hover:bg-raised',
  danger: 'bg-danger-bg text-danger-ink',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg w-full',
}

/** Classes for a button-looking element (use on <Link> too). */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none',
    'transition-[transform,opacity,background-color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100',
    'disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner, keeps the width and blocks clicks. */
  loading?: boolean
}

export function Button({ variant, size, loading = false, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span aria-hidden className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
      )}
      {children}
    </button>
  )
}
