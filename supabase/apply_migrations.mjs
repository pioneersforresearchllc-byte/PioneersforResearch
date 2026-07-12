#!/usr/bin/env node
// Applies every supabase/migrations/*.sql file in order via the Supabase
// Management API (https://api.supabase.com), used instead of a direct
// Postgres connection because this sandbox's network egress can't reach
// the DB pooler port — only HTTPS on api.supabase.com.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node supabase/apply_migrations.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const path = join(__dirname, '.env')
  const env = {}
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) env[m[1]] = m[2]
    }
  } catch {
    // fall through to process.env
  }
  return { ...env, ...process.env }
}

const env = loadEnv()
const projectRef = env.SUPABASE_PROJECT_REF
const accessToken = env.SUPABASE_ACCESS_TOKEN

if (!projectRef || !accessToken) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

const migrationsDir = join(__dirname, 'migrations')
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  process.stdout.write(`applying ${file}... `)

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.log(`FAILED (${res.status})`)
    console.log(body)
    process.exit(1)
  }

  console.log('OK')
}

console.log('All migrations applied.')
