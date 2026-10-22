# send-xapi — NELC accredited-certificate integration

Forwards real course-lifecycle events to the National eLearning Center (NELC)
LRS as xAPI statements, so completed courses can issue **accredited**
certificates.

## How it works

```
enrol / progress / complete / rate / issue-certificate   (DB row change)
        │  trigger (migration 0083)  →  public.send_xapi_event(payload)
        │  net.http_post  +  x-hook-secret
        ▼
send-xapi edge function  →  builds xAPI statement (_shared/xapi.ts)
        │  Basic auth (secrets)
        ▼
NELC LRS   (statement stored)      every attempt logged in public.xapi_log
```

Learner is identified by **national ID** (`profiles.national_id`, collected on
the Account page). If a learner has no national ID, the event is logged as
`skipped: no_national_id` and nothing is sent.

## One-time setup (do these to go live)

1. **Production LRS credentials** — from the FutureX portal (the JSON you saved
   at the "بيانات اعتماد بيئة الإنتاج" step): the LRS URL, user, and password.

2. **Set the function secrets** (Supabase → Edge Functions → Secrets, or CLI).
   `XAPI_HOOK_SECRET` is any long random string you invent.
   ```
   supabase secrets set \
     NELC_LRS_URL="https://lrs.nelc.gov.sa/<prod-path>/xapi/statements" \
     NELC_LRS_USER="<prod user>" \
     NELC_LRS_PASS="<prod password>" \
     XAPI_HOOK_SECRET="<long-random-string>"
   ```

3. **Deploy the function WITHOUT JWT** (it authenticates via the hook secret):
   ```
   supabase functions deploy send-xapi --no-verify-jwt
   ```

4. **Run migration** `0083_nelc_xapi.sql` (adds national_id, xapi_log, triggers).

5. **Set the DB hook secret to match** `XAPI_HOOK_SECRET` (SQL editor):
   ```sql
   insert into private.integration_secrets(name, value)
   values ('xapi_hook_secret', '<same value as XAPI_HOOK_SECRET>')
   on conflict (name) do update set value = excluded.value;
   ```
   Until this row exists, triggers are a safe no-op (nothing is sent).

6. Learners enter their national ID on the **Account** page (students only).

## Verify

- Enrol a test student (who has a national_id) in a course, then:
  ```sql
  select created_at, event, verb, status, left(response, 80)
  from public.xapi_log order by created_at desc limit 20;
  ```
  `status = 200` means the statement reached the LRS.

## Notes

- The LRS sits behind Cloudflare, which blocks default bot user-agents
  (python-urllib, Deno) with HTTP 403 "error 1010". The function sends a plain
  browser-like `User-Agent` to avoid that; if a 1010 appears in `xapi_log`,
  that is the cause.
- Secrets live only in Supabase (function env + private.integration_secrets),
  never in git or the frontend.
- Verbs covered: registered, initialized, progressed, completed, rated, earned.
  Content-level verbs (watched / completed-lesson / attempted-quiz) can be added
  once the platform tracks lesson/video/quiz events.
