#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCodeowners, resolveOwner } from './codeowners.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const co = fs.readFileSync(path.join(__dirname, '../../.github/CODEOWNERS'), 'utf-8');
const rules = parseCodeowners(co);

const alertsPath = path.join(__dirname, '../public/alerts.json');
const alerts = JSON.parse(fs.readFileSync(alertsPath, 'utf-8'));

const out = alerts.map(a => ({
  ...a,
  owners: a.file ? resolveOwner(a.file, rules) : [],
}));
fs.writeFileSync(alertsPath, JSON.stringify(out, null, 2));

const counts = {};
out.forEach(a => {
  const k = (a.owners || []).join(',') || '(none)';
  counts[k] = (counts[k] || 0) + 1;
});
console.log('Backfilled', out.length, 'alerts. Owner distribution:');
Object.entries(counts)
  .sort(([, a], [, b]) => b - a)
  .forEach(([k, v]) => console.log(' ', v.toString().padStart(3), k));
