import { useEffect, useState } from 'react'
import { Title, Text } from '@tremor/react'
import { Kpis } from './Kpis'
import { Comparison } from './Comparison'
import { Trend } from './Trend'
import { Gates } from './Gates'
import type { WeekBacklog, WeekClosure, WeekAcceptance, RegressionData } from './closures'

function App() {
  const [backlog, setBacklog] = useState<WeekBacklog[]>([])
  const [closures, setClosures] = useState<WeekClosure[]>([])
  const [acceptance, setAcceptance] = useState<WeekAcceptance[]>([])
  const [regressions, setRegressions] = useState<RegressionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/backlog.json').then(r => {
        if (!r.ok) throw new Error('Failed to load backlog')
        return r.json()
      }),
      fetch('/closures.json').then(r => {
        if (!r.ok) throw new Error('Failed to load closures')
        return r.json()
      }),
      fetch('/acceptance.json').then(r => {
        if (!r.ok) throw new Error('Failed to load acceptance')
        return r.json()
      }),
      fetch('/regressions.json').then(r => {
        if (!r.ok) throw new Error('Failed to load regressions')
        return r.json()
      }),
    ])
      .then(([b, c, a, r]) => {
        setBacklog(b)
        setClosures(c)
        setAcceptance(a)
        setRegressions(r)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text>Loading…</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Text color="red">Error: {error}</Text>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 antialiased">
      <div className="max-w-7xl mx-auto">
        <Title className="mb-6">MedSecure Security Backlog Tracking</Title>

        <Kpis backlog={backlog} />
        <Comparison closures={closures} />
        {regressions && <Gates acceptance={acceptance} regressions={regressions} />}
        <Trend backlog={backlog} closures={closures} />
      </div>
    </div>
  )
}

export default App
