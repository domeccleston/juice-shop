// Minimal CODEOWNERS resolver. Implements GitHub's last-match-wins rule.
// Patterns supported: leading `/` (anchored), trailing `/` (directory),
// `*` (single path segment), `**` (any depth). Sufficient for the
// patterns we use; not a full gitignore parser.

interface Rule {
  pattern: string
  regex: RegExp
  owners: string[]
}

export function parseCodeowners(text: string): Rule[] {
  const rules: Rule[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const parts = line.split(/\s+/)
    const pattern = parts[0]
    const owners = parts.slice(1).filter(Boolean)
    if (!pattern || owners.length === 0) continue
    rules.push({ pattern, regex: patternToRegex(pattern), owners })
  }
  return rules
}

function patternToRegex(pattern: string): RegExp {
  let p = pattern
  const anchored = p.startsWith('/')
  if (anchored) p = p.slice(1)
  const dirOnly = p.endsWith('/')
  if (dirOnly) p = p.slice(0, -1)

  const escaped = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*')

  const head = anchored ? '^' : '^(?:.*/)?'
  const tail = dirOnly ? '(?:/.*)?$' : '(?:/.*)?$'
  return new RegExp(head + escaped + tail)
}

export function resolveOwner(filePath: string, rules: Rule[]): string[] {
  // Last matching rule wins.
  for (let i = rules.length - 1; i >= 0; i--) {
    if (rules[i].regex.test(filePath)) return rules[i].owners
  }
  return []
}
