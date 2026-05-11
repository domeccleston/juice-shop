#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parseCodeowners, resolveOwner } from './codeowners.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const codeownersPath = path.join(__dirname, '../../.github/CODEOWNERS');
const codeownersRules = fs.existsSync(codeownersPath)
  ? parseCodeowners(fs.readFileSync(codeownersPath, 'utf-8'))
  : [];

// Load .env from parent directory
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '');
  }
});

const token = envVars.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Error: GITHUB_PERSONAL_ACCESS_TOKEN not found in .env');
  process.exit(1);
}

// Get repo info
const repoOwner = execSync('git config --get remote.origin.url', { cwd: path.join(__dirname, '../..') })
  .toString()
  .trim()
  .match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?$/)?.[1];

if (!repoOwner) {
  console.error('Error: Could not determine repo owner/name from git remote');
  process.exit(1);
}

console.log(`Fetching CodeQL alerts for ${repoOwner}...`);

// Fetch alerts
const alerts = [];
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await fetch(`https://api.github.com/repos/${repoOwner}/code-scanning/alerts?state=all&per_page=100&page=${page}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    console.error('Error fetching alerts:', response.status, response.statusText);
    process.exit(1);
  }

  const pageData = await response.json();
  if (Array.isArray(pageData) && pageData.length > 0) {
    alerts.push(...pageData);
    page++;
    hasMore = pageData.length === 100;
  } else {
    hasMore = false;
  }
}

// Transform to a simpler structure for the dashboard
const transformed = alerts.map(alert => {
  const file = alert.most_recent_instance?.location?.path;
  return {
    number: alert.number,
    state: alert.state,
    severity: alert.rule.severity,
    rule: {
      id: alert.rule.id,
      name: alert.rule.name,
      description: alert.rule.description
    },
    file,
    line: alert.most_recent_instance?.location?.start_line,
    owners: file ? resolveOwner(file, codeownersRules) : [],
    created_at: alert.created_at,
    updated_at: alert.updated_at,
    fixed_at: alert.fixed_at,
    dismissed_at: alert.dismissed_at,
    dismissed_reason: alert.dismissed_reason,
    html_url: alert.html_url
  };
});

// Write to public/alerts.json
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, 'alerts.json');
fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2));

console.log(`✓ Wrote ${transformed.length} alerts to ${outputPath}`);
console.log(`  - Open: ${transformed.filter(a => a.state === 'open').length}`);
console.log(`  - Fixed: ${transformed.filter(a => a.fixed_at).length}`);
console.log(`  - Dismissed: ${transformed.filter(a => a.dismissed_at).length}`);