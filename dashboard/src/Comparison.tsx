import { formatDuration, type WeekClosure } from './closures'

function Cell({ value, sub }: { value: string; sub?: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function SegmentColumn({
  label,
  accent,
  closed,
  hours,
  withinSla,
}: {
  label: string
  accent: 'blue' | 'gray'
  closed: number
  hours: number
  withinSla: number
}) {
  const dot = accent === 'blue' ? 'bg-blue-500' : 'bg-gray-400'
  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Cell value={String(closed)} sub="closed" />
        <Cell value={formatDuration(hours)} sub="time to close" />
        <Cell value={`${withinSla}%`} sub="within SLA" />
      </div>
    </div>
  )
}

export function Comparison({ closures }: { closures: WeekClosure[] }) {
  const current = closures[closures.length - 1]
  if (!current) return null
  return (
    <div className="bg-white border border-gray-200 rounded p-5 mb-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-semibold">Devin vs Human — this week</h2>
        <span className="text-xs text-gray-500">Week of {current.week}</span>
      </div>
      <div className="flex gap-8">
        <SegmentColumn
          label="Devin"
          accent="blue"
          closed={current.devin.closed}
          hours={current.devin.avg_hours}
          withinSla={current.devin.within_sla_pct}
        />
        <div className="w-px bg-gray-200" />
        <SegmentColumn
          label="Human"
          accent="gray"
          closed={current.human.closed}
          hours={current.human.avg_hours}
          withinSla={current.human.within_sla_pct}
        />
      </div>
    </div>
  )
}
