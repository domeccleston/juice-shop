import { AreaChart, BarChart, LineChart } from '@tremor/react'
import {
  formatDuration,
  formatWeek,
  type WeekBacklog,
  type WeekClosure,
} from './closures'

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
      {children}
    </div>
  )
}

export function Trend({
  backlog,
  closures,
}: {
  backlog: WeekBacklog[]
  closures: WeekClosure[]
}) {
  const openData = backlog.map(b => ({
    week: formatWeek(b.week),
    Error: b.error,
    Warning: b.warning,
    Note: b.note,
  }))

  const closuresData = closures.map(c => ({
    week: formatWeek(c.week),
    Devin: c.devin.closed,
    Human: c.human.closed,
  }))

  const timeData = closures.map(c => ({
    week: formatWeek(c.week),
    Devin: c.devin.closed > 0 ? c.devin.avg_hours : null,
    Human: c.human.avg_hours,
  }))

  return (
    <div className="grid grid-cols-1 gap-4">
      <ChartCard
        title="Open findings over time"
        subtitle="Stacked by CodeQL severity"
      >
        <AreaChart
          className="h-64"
          data={openData}
          index="week"
          categories={['Error', 'Warning', 'Note']}
          colors={['red', 'amber', 'gray']}
          stack
          yAxisWidth={32}
          showLegend
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Closures over time"
          subtitle="Stacked by who closed the alert"
        >
          <BarChart
            className="h-64"
            data={closuresData}
            index="week"
            categories={['Devin', 'Human']}
            colors={['blue', 'gray']}
            stack
            yAxisWidth={32}
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Avg time to close"
          subtitle="Hours from alert created to closed"
        >
          <LineChart
            className="h-64"
            data={timeData}
            index="week"
            categories={['Devin', 'Human']}
            colors={['blue', 'gray']}
            yAxisWidth={48}
            valueFormatter={v => formatDuration(v)}
            showLegend
            connectNulls
          />
        </ChartCard>
      </div>
    </div>
  )
}
