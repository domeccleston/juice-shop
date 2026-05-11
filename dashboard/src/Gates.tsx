import type { WeekAcceptance, RegressionData } from './closures'

type GateStatus = 'pass' | 'fail' | 'neutral'

function statusFor(actual: number | null, threshold: number, kind: 'gte' | 'lte'): GateStatus {
  if (actual === null) return 'neutral'
  if (kind === 'gte') return actual >= threshold ? 'pass' : 'fail'
  return actual <= threshold ? 'pass' : 'fail'
}

function GateCard({
  phase,
  description,
  metric,
  value,
  threshold,
  status,
}: {
  phase: string
  description: string
  metric: string
  value: string
  threshold: string
  status: GateStatus
}) {
  const badge =
    status === 'pass'
      ? { label: 'Passing', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : status === 'fail'
      ? { label: 'Below threshold', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
      : { label: 'Not yet', cls: 'bg-gray-100 text-gray-600 border-gray-200' }

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs uppercase tracking-wide text-gray-500">{phase}</div>
        <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 border rounded ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <div className="text-xs text-gray-600 mb-3">{description}</div>
      <div className="flex items-baseline gap-3">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-gray-500">
          target {threshold}
        </div>
      </div>
      <div className="text-[11px] text-gray-400 mt-1">{metric}</div>
    </div>
  )
}

export function Gates({
  acceptance,
  regressions,
}: {
  acceptance: WeekAcceptance[]
  regressions: RegressionData
}) {
  const current = acceptance[acceptance.length - 1]

  const lowPriorityAcceptance = current?.low_priority_first_pass_pct ?? null
  const allAcceptance = current?.all_first_pass_pct ?? null
  const daysClean = regressions.days_since_last_confirmed

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-semibold">Phase gates</h2>
        <span className="text-xs text-gray-500">Rolling 4-week window</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <GateCard
          phase="Phase 1 &rarr; 2"
          description="Devin's low-priority PRs merged without reviewer changes"
          metric="Source: GitHub PR review events"
          value={lowPriorityAcceptance !== null ? `${lowPriorityAcceptance}%` : '—'}
          threshold="≥ 80%"
          status={statusFor(lowPriorityAcceptance, 80, 'gte')}
        />
        <GateCard
          phase="Phase 2 &rarr; 3"
          description="Devin's PRs merged without reviewer changes — all severities"
          metric="Source: GitHub PR review events"
          value={allAcceptance !== null ? `${allAcceptance}%` : '—'}
          threshold="≥ 95%"
          status={statusFor(allAcceptance, 95, 'gte')}
        />
        <GateCard
          phase="Phase 3 &rarr; 4"
          description="Confirmed security regressions traced to Devin in last 60 days"
          metric="Source: GitHub alerts × PR file overlap, AppSec confirmation"
          value={String(regressions.total_confirmed_60d)}
          threshold="0"
          status={statusFor(regressions.total_confirmed_60d, 0, 'lte')}
        />
        <GateCard
          phase="Phase 3 &rarr; 4"
          description="Consecutive days with no confirmed regression — clock toward 60"
          metric="Source: Regression confirmations timeline"
          value={`${daysClean}d`}
          threshold="≥ 60d"
          status={statusFor(daysClean, 60, 'gte')}
        />
      </div>
    </div>
  )
}
