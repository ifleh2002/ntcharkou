import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

export function cx(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ')
}

// -----------------------------------------------------------------------------
// Boutons
// -----------------------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'collectif'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-argile-500 text-white hover:bg-argile-600 border-transparent',
  collectif: 'bg-zellige-500 text-white hover:bg-zellige-600 border-transparent',
  secondary: 'bg-white text-encre-900 hover:bg-sable-100 border-sable-400',
  ghost: 'bg-transparent text-encre-700 hover:bg-sable-200 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

function buttonClass(variant: Variant, size: Size, className?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-argile-300',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />
}

// -----------------------------------------------------------------------------
// Surfaces
// -----------------------------------------------------------------------------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('surface p-5', className)}>{children}</div>
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-encre-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-encre-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  icon = '🗂️',
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <p className="text-base font-semibold text-encre-900">{title}</p>
      {description ? <p className="max-w-md text-sm text-encre-500">{description}</p> : null}
      {action}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Badges et indicateurs
// -----------------------------------------------------------------------------

type Tone = 'neutre' | 'argile' | 'zellige' | 'safran' | 'succes' | 'alerte' | 'danger'

const TONES: Record<Tone, string> = {
  neutre: 'bg-sable-200 text-encre-700 border-sable-300',
  argile: 'bg-argile-100 text-argile-800 border-argile-200',
  zellige: 'bg-zellige-100 text-zellige-800 border-zellige-200',
  safran: 'bg-safran-100 text-safran-500 border-safran-400/40',
  succes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  alerte: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
}

export function Badge({
  tone = 'neutre',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Barre de progression d'un groupe : 14 / 20 participants. */
/**
 * Barre d'avancement.
 *
 * Les deux bornes sont assainies avant tout calcul : une valeur absente ou non
 * numerique donnerait « NaN % » et une largeur CSS invalide, laissant la barre
 * pleine — soit exactement le contraire de ce qu'elle doit dire. Le cas se
 * produit des qu'une colonne attendue manque, par exemple entre le deploiement
 * du code et l'application d'une migration.
 *
 * `caption` remplace la legende par defaut ; `null` la supprime, pour un appelant
 * qui affiche la sienne.
 */
export function ProgressBar({
  value,
  max,
  tone = 'zellige',
  caption,
}: {
  value: number | null | undefined
  max: number | null | undefined
  tone?: 'zellige' | 'argile'
  caption?: React.ReactNode
}) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
  const safeMax = Number.isFinite(Number(max)) ? Math.max(0, Number(max)) : 0
  const pct = safeMax > 0 ? Math.min(100, Math.round((safeValue / safeMax) * 100)) : 0

  return (
    <div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-sable-300">
        <div
          className={cx('h-full rounded-full transition-all', tone === 'zellige' ? 'bg-zellige-500' : 'bg-argile-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {caption === undefined ? (
        <p className="mt-1.5 text-xs font-medium text-encre-500">
          {safeValue} / {safeMax} — {pct} %
        </p>
      ) : (
        caption
      )}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutre',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: Tone
}) {
  return (
    <div className="surface p-4">
      <p className="text-xs font-semibold tracking-wide text-encre-400 uppercase">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-encre-900">{value}</p>
      {hint ? (
        <p className="mt-1">
          <Badge tone={tone}>{hint}</Badge>
        </p>
      ) : null}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Formulaires
// -----------------------------------------------------------------------------

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="etiquette" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ms-0.5 text-argile-600">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-encre-400">{hint}</p> : null}
    </div>
  )
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-2.5 rounded-lg border border-sable-300 bg-white px-3 py-2.5',
        'text-sm transition-colors hover:border-argile-300 has-checked:border-argile-400 has-checked:bg-argile-50',
        className,
      )}
    >
      <input
        type="checkbox"
        {...props}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-argile-500)]"
      />
      <span className="text-encre-700">{label}</span>
    </label>
  )
}

export function Alert({
  tone = 'alerte',
  title,
  children,
}: {
  tone?: 'alerte' | 'danger' | 'succes' | 'info'
  title?: string
  children: ReactNode
}) {
  const styles = {
    alerte: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
    succes: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    info: 'border-sable-300 bg-sable-200 text-encre-700',
  }[tone]

  return (
    <div className={cx('rounded-lg border px-4 py-3 text-sm', styles)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-0.5' : undefined}>{children}</div>
    </div>
  )
}
