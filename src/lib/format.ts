const dhFormatter = new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

/** 3000000 -> « 3 000 000 DH » */
export function formatDh(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Prix non communiqué'
  return `${dhFormatter.format(Math.round(value))} DH`
}

/** Formes compactes pour les KPI : 9 600 000 -> « 9,6 M DH ». */
export function formatDhCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1).replace('.', ',')} M DH`
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)} k DH`
  }
  return `${dhFormatter.format(value)} DH`
}

export function formatSurface(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${dhFormatter.format(value)} m²`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return dhFormatter.format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(decimals).replace('.', ',')} %`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}

export function formatRelativeDate(value: string | null | undefined): string {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 31) return `il y a ${days} j`
  return formatDate(value)
}

/** Qualification textuelle d'un score de matching (section 22). */
export function scoreLabel(score: number): { label: string; tone: 'excellent' | 'bon' | 'moyen' | 'faible' } {
  if (score >= 90) return { label: 'Excellent match', tone: 'excellent' }
  if (score >= 75) return { label: 'Très bon match', tone: 'bon' }
  if (score >= 60) return { label: 'Match intéressant', tone: 'moyen' }
  return { label: 'Faible correspondance', tone: 'faible' }
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count > 1 ? (plural ?? `${singular}s`) : singular
}
