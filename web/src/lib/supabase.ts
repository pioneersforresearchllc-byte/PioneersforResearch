import { createClient } from '@supabase/supabase-js'
// TODO(phase 0 follow-up): once migrations are applied, regenerate with
// `supabase gen types typescript --project-id <ref> --schema public` and
// swap this for `createClient<Database>(...)`.

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — copy web/.env.example to web/.env.local and fill them in.',
  )
}

export const supabase = createClient(url, publishableKey)
