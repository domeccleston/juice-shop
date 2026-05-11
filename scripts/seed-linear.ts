// One-shot seed: enumerate open CodeQL alerts → create Linear issues in team AS.
// Idempotent: skips alerts that already have a Linear attachment pointing at them.
//
// Run dry:  npx tsx scripts/seed-linear.ts
// Execute:  npx tsx scripts/seed-linear.ts --execute

const { GITHUB_PERSONAL_ACCESS_TOKEN, GITHUB_USERNAME, LINEAR_API_KEY } = process.env as Record<string, string>

const REPO = `${GITHUB_USERNAME ?? 'domeccleston'}/juice-shop`
const TEAM_KEY = 'AS'
const EXECUTE = process.argv.includes('--execute')

type Alert = {
  number: number
  html_url: string
  rule: { id: string; description: string; severity: string; security_severity_level?: string }
  most_recent_instance?: {
    location?: { path?: string; start_line?: number; end_line?: number }
    message?: { text?: string }
  }
}

async function gh<T>(path: string): Promise<T> {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!r.ok) throw new Error(`GitHub GET ${path}: ${r.status} ${await r.text()}`)
  return r.json() as Promise<T>
}

async function ghPaged<T>(path: string): Promise<T[]> {
  const out: T[] = []
  const sep = path.includes('?') ? '&' : '?'
  for (let page = 1; ; page++) {
    const batch = await gh<T[]>(`${path}${sep}per_page=100&page=${page}`)
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

async function linear<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { Authorization: LINEAR_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const j = (await r.json()) as { data?: T; errors?: { message: string }[] }
  if (j.errors?.length) throw new Error(`Linear: ${j.errors.map((e) => e.message).join('; ')}`)
  return j.data as T
}

async function resolveTeamId(key: string): Promise<string> {
  const data = await linear<{ teams: { nodes: { id: string; key: string }[] } }>(
    `query { teams { nodes { id key } } }`,
  )
  const team = data.teams.nodes.find((t) => t.key === key)
  if (!team) throw new Error(`Linear team ${key} not found`)
  return team.id
}

async function alertAlreadySeeded(url: string): Promise<boolean> {
  const data = await linear<{ attachmentsForURL: { nodes: { id: string }[] } }>(
    `query($url: String!) { attachmentsForURL(url: $url) { nodes { id } } }`,
    { url },
  )
  return data.attachmentsForURL.nodes.length > 0
}

function dedupe(text: string): string {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const raw of text.split('\n')) {
    const t = raw.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    lines.push(t)
  }
  return lines.join('\n')
}

function buildDescription(alert: Alert): string {
  const loc = alert.most_recent_instance?.location
  const start = loc?.start_line
  const end = loc?.end_line
  const range = start && end && start !== end ? `${start}-${end}` : `${start ?? '?'}`
  const message = dedupe(alert.most_recent_instance?.message?.text ?? '')
  const blobUrl = loc?.path && start ? `https://github.com/${REPO}/blob/master/${loc.path}#L${range}` : null

  const rows: [string, string][] = [
    ['Rule', `\`${alert.rule.id}\``],
    ['Severity', alert.rule.severity],
  ]
  if (alert.rule.security_severity_level) rows.push(['Risk', alert.rule.security_severity_level])
  rows.push(['Location', blobUrl ? `[\`${loc?.path}:${range}\`](${blobUrl})` : `\`${loc?.path}:${range}\``])
  rows.push(['CodeQL alert', `[#${alert.number}](${alert.html_url})`])

  return [
    `**CodeQL finding** — auto-filed from \`${REPO}\` code scanning.`,
    ``,
    `| | |`,
    `|---|---|`,
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
    ``,
    `## Description`,
    alert.rule.description,
    ``,
    `## Message`,
    message ? `> ${message.replace(/\n/g, '\n> ')}` : '_(no message)_',
    ``,
    `---`,
    `_Seeded by \`scripts/seed-linear.ts\`._`,
  ].join('\n')
}

async function createIssue(teamId: string, alert: Alert): Promise<{ id: string; identifier: string; url: string }> {
  const path = alert.most_recent_instance?.location?.path ?? 'unknown'
  const title = `[CodeQL] alert #${alert.number} — ${alert.rule.id} in ${path}`
  const description = buildDescription(alert)

  const created = await linear<{ issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } } }>(
    `mutation($input: IssueCreateInput!) {
       issueCreate(input: $input) {
         success
         issue { id identifier url }
       }
     }`,
    { input: { teamId, title, description } },
  )
  if (!created.issueCreate.success) throw new Error(`issueCreate failed for alert #${alert.number}`)

  const issue = created.issueCreate.issue

  await linear(
    `mutation($input: AttachmentCreateInput!) {
       attachmentCreate(input: $input) { success }
     }`,
    {
      input: {
        issueId: issue.id,
        url: alert.html_url,
        title: `CodeQL alert #${alert.number}`,
        subtitle: alert.rule.id,
      },
    },
  )

  return issue
}

async function main() {
  if (!GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN not set')
  if (!LINEAR_API_KEY) throw new Error('LINEAR_API_KEY not set')

  if (!EXECUTE) console.log('=== DRY RUN — pass --execute to create issues ===')
  console.log(`Fetching open CodeQL alerts from ${REPO}...`)
  const alerts = await ghPaged<Alert>(`/repos/${REPO}/code-scanning/alerts?state=open`)
  console.log(`  ${alerts.length} open alerts`)

  const teamId = await resolveTeamId(TEAM_KEY)
  console.log(`Linear team ${TEAM_KEY} → ${teamId}`)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const alert of alerts) {
    const path = alert.most_recent_instance?.location?.path ?? 'unknown'
    try {
      const seen = await alertAlreadySeeded(alert.html_url)
      if (seen) {
        console.log(`  skip alert #${alert.number} (${alert.rule.id}) — already in Linear`)
        skipped++
        continue
      }
      if (!EXECUTE) {
        console.log(`  [dry-run] would create: alert #${alert.number} · ${alert.rule.id} · ${path}`)
        created++
        continue
      }
      const issue = await createIssue(teamId, alert)
      console.log(`  created ${issue.identifier} for alert #${alert.number} (${alert.rule.id}) → ${issue.url}`)
      created++
    } catch (e) {
      console.error(`  failed alert #${alert.number}: ${(e as Error).message}`)
      failed++
    }
  }

  console.log('---')
  console.log(`${EXECUTE ? 'created' : 'would-create'}=${created} skipped=${skipped} failed=${failed}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
