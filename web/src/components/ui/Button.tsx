import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from '@/components/LoadingState'

export type ButtonVariant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold no-underline transition-all duration-200 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ' +
  'active:scale-[0.97]'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn-sheen bg-navy text-white shadow-[0_8px_20px_-8px_rgba(11,31,58,0.6)] hover:bg-navy-hover hover:shadow-[0_12px_26px_-8px_rgba(11,31,58,0.7)] focus-visible:outline-gold',
  gold: 'btn-sheen bg-gold text-white shadow-[0_8px_20px_-8px_rgba(201,162,75,0.7)] hover:bg-gold-hover focus-visible:outline-navy',
  outline: 'border border-navy/25 bg-white text-navy hover:border-navy hover:bg-bg-soft focus-visible:outline-navy',
  ghost: 'text-navy hover:bg-navy/[0.06] focus-visible:outline-navy',
  danger: 'bg-error text-white hover:opacity-90 focus-visible:outline-error',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-[12.5px]',
  md: 'px-5 py-2.75 text-[13.5px]',
  lg: 'px-7 py-3.5 text-[15px]',
}

/** Shared class string — use on <Link>/<a> to match the Button look. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim()
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const spinnerColor = variant === 'outline' || variant === 'ghost' ? 'border-navy/30 border-t-navy' : 'border-white/40 border-t-white'
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, `${fullWidth ? 'w-full' : ''} ${className}`)}
    >
      {loading ? (
        <Spinner className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${spinnerColor}`} />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
