# Supabase backend — setup

## 1. Apply migrations

Requires the Postgres connection string from Project Settings → Database →
Connection string (URI form), added as `SUPABASE_DB_URL` in `supabase/.env`.

```bash
cd supabase
for f in migrations/*.sql; do
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

(Or via the Supabase CLI once linked: `supabase db push`.)

## 2. Deploy Edge Functions

Requires a Supabase **personal access token** (Supabase dashboard → account
avatar → Account Settings → Access Tokens), since project API keys aren't
sufficient for deploy operations.

```bash
supabase login --token <personal-access-token>
supabase link --project-ref wdxziibfgkztphpzeieq
supabase functions deploy create-profile
supabase functions deploy send-otp
supabase functions deploy verify-otp
```

Function secrets (set via `supabase secrets set KEY=value`, or the
dashboard's Edge Functions → Secrets page):

| Secret | Required by | Notes |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | all functions | auto-provided by Supabase in every function's runtime — no need to set these yourself |
| `RESEND_API_KEY` | `send-otp` | optional — omit to stay in sandbox mode (the OTP code is returned directly to the caller instead of emailed) |
| `RESEND_FROM` | `send-otp` | optional, defaults to a Resend sandbox sender |

## 3. Seed demo accounts

After migrations are applied:

```bash
cd supabase
npm run seed
```

Creates the three demo accounts referenced throughout: `admin` / `Admin@2026`
(owner), `khalid` / `demo123` (pre-approved teacher), `noura` / `noura123`
(student).

## 4. Regenerate frontend types

Once migrations are applied, replace the untyped Supabase client in
`web/src/lib/supabase.ts`:

```bash
supabase gen types typescript --db-url "$SUPABASE_DB_URL" --schema public \
  > web/src/types/database.ts
```

then swap `createClient(url, key)` for `createClient<Database>(url, key)` and
import `Database` from `@/types/database`.
