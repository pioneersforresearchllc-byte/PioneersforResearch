#!/usr/bin/env node
// Seeds the three demo accounts referenced throughout the design chat, so
// Phase 8 QA (and anyone testing later) has reproducible logins:
//   owner:   admin  / Admin@2026
//   teacher: khalid / demo123   (pre-approved)
//   student: noura  / noura123
//
// Run after migrations are applied: `node supabase/seed/seed.mjs`
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see supabase/.env).

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const path = join(__dirname, '..', '.env')
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
const url = env.SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY in supabase/.env')
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const DEMO_USERS = [
  {
    email: 'owner@researchacademy.sa',
    password: 'Admin@2026',
    profile: { role: 'owner', status: 'active', name: 'الإدارة', username: 'admin' },
  },
  {
    email: 'khalid@example.com',
    password: 'demo123',
    profile: {
      role: 'teacher',
      status: 'active',
      name: 'أ. خالد الحربي',
      username: 'khalid',
      specialty: 'إشراف تدريب الباحثين',
      qualification: 'ماجستير مناهج بحث',
      years_experience: 8,
      cv_text: 'خبرة 8 سنوات في الإشراف على الأبحاث العلمية وتدريب طلاب الدراسات العليا.',
    },
  },
  {
    email: 'noura@example.com',
    password: 'noura123',
    profile: { role: 'student', status: 'active', name: 'نورة الشهري', username: 'noura' },
  },
]

for (const u of DEMO_USERS) {
  process.stdout.write(`seeding ${u.profile.username}... `)

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
  })

  let userId = created?.user?.id
  if (createErr) {
    if (!createErr.message.includes('already been registered')) {
      console.log(`FAILED (auth): ${createErr.message}`)
      continue
    }
    const { data: list } = await admin.auth.admin.listUsers()
    userId = list?.users.find((x) => x.email === u.email)?.id
  }
  if (!userId) {
    console.log('FAILED: could not resolve user id')
    continue
  }

  const { error: profileErr } = await admin.from('profiles').upsert({ id: userId, ...u.profile })
  if (profileErr) {
    console.log(`FAILED (profile): ${profileErr.message}`)
    continue
  }

  console.log('OK')
}

console.log('Done.')
