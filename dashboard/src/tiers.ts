// Review tier per CodeQL rule, governed by docs/security/automation-policy.md.
// - high   : substantive review + second AppSec reviewer
// - medium : substantive CODEOWNER review
// - low    : auto-merge eligible under the automation policy gate
//
// Adding a rule to "low" requires written justification per the policy.

export type Tier = 'high' | 'medium' | 'low'

export const ruleToTier: Record<string, Tier> = {
  // High — auth, crypto, credential handling
  'js/insufficient-password-hash': 'high',
  'js/missing-token-validation': 'high',
  'js/insecure-randomness': 'high',

  // Medium — injection, sanitization, validation, transmission
  'js/sql-injection': 'medium',
  'js/code-injection': 'medium',
  'js/path-injection': 'medium',
  'js/zipslip': 'medium',
  'js/template-object-injection': 'medium',
  'js/prototype-polluting-assignment': 'medium',
  'js/type-confusion-through-parameter-tampering': 'medium',
  'js/incomplete-sanitization': 'medium',
  'js/incomplete-url-substring-sanitization': 'medium',
  'js/request-forgery': 'medium',
  'js/server-side-unvalidated-url-redirection': 'medium',
  'js/clear-text-logging': 'medium',
  'js/sensitive-get-query': 'medium',
  'js/stack-trace-exposure': 'medium',

  // Low — mechanical, well-understood pattern
  'js/missing-rate-limiting': 'low',
  'js/polynomial-redos': 'low',
  'js/server-crash': 'low',
}

export function getTier(ruleId: string): Tier {
  return ruleToTier[ruleId] ?? 'medium'
}
