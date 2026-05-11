import { totalOpen, type WeekBacklog } from './closures'

const SLA_TARGET_DAYS = 14

function KpiCard({
  label,
  value,
  hint,
  hintTone = 'neutral',
}: {
  label: string
  value: React.ReactNode
  hint: React.ReactNode
  hintTone?: 'good' | 'bad' | 'neutral'
}) {
  const toneClass =
    hintTone === 'good' ? 'text-emerald-700' : hintTone === 'bad' ? 'text-red-700' : 'text-gray-500'
  return (
    <div className="bg-white border border-gray-200 rounded p-4 flex flex-col justify-between min-h-[110px]">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      <div className={`text-xs mt-1 ${toneClass}`}>{hint}</div>
    </div>
  )
}

export function Kpis({ backlog }: { backlog: WeekBacklog[] }) {
  const current = backlog[backlog.length - 1]
  const previous = backlog[backlog.length - 2]
  if (!current || !previous) return null

  const thisWeek = totalOpen(current)
  const lastWeek = totalOpen(previous)
  const delta = thisWeek - lastWeek
  const backlogHint =
    delta < 0 ? `↓ ${Math.abs(delta)} vs last week (${lastWeek})`
    : delta > 0 ? `↑ ${delta} vs last week (${lastWeek})`
    : `flat vs last week (${lastWeek})`
  const backlogTone: 'good' | 'bad' | 'neutral' = delta < 0 ? 'good' : delta > 0 ? 'bad' : 'neutral'

  const ageTone: 'good' | 'bad' = current.median_age_days <= SLA_TARGET_DAYS ? 'good' : 'bad'
  const slaTone: 'good' | 'bad' = current.sla_breaches === 0 ? 'good' : 'bad'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <KpiCard
        label="Backlog"
        value={thisWeek}
        hint={backlogHint}
        hintTone={backlogTone}
      />
      <KpiCard
        label="Median age"
        value={`${current.median_age_days}d`}
        hint={`target <${SLA_TARGET_DAYS}d ${ageTone === 'good' ? '✓' : '⚠'}`}
        hintTone={ageTone}
      />
      <KpiCard
        label="SLA breaches"
        value={current.sla_breaches}
        hint={`target 0 ${slaTone === 'good' ? '✓' : '⚠'}`}
        hintTone={slaTone}
      />
    </div>
  )
}
