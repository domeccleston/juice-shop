export type Segment = { closed: number; avg_hours: number; within_sla_pct: number }
export type WeekClosure = { week: string; devin: Segment; human: Segment }

export type WeekAcceptance = {
  week: string
  low_priority_first_pass_pct: number | null
  all_first_pass_pct: number | null
  low_priority_prs: number
  all_prs: number
}

export type WeekRegression = {
  week: string
  candidates: number
  confirmed: number
  dismissed: number
}

export type RegressionData = {
  weekly: WeekRegression[]
  days_since_last_confirmed: number
  total_confirmed_60d: number
}

export type WeekBacklog = {
  week: string
  error: number
  warning: number
  note: number
  median_age_days: number
  sla_breaches: number
}

export function totalOpen(b: WeekBacklog): number {
  return b.error + b.warning + b.note
}

export function formatDuration(hours: number): string {
  if (hours <= 0) return '—'
  if (hours < 48) return `${Math.round(hours)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export function formatWeek(week: string): string {
  const d = new Date(`${week}T00:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
