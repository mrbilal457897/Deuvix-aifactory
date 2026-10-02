# Postgres CA certificate

`certs/supabase-ca.pem` is a Supabase CA certificate. It is safe to commit — it
is a public certificate, not a secret.

## Why it is needed

The app connects through Supabase's **Session pooler**
(`*.pooler.supabase.com:5432`). That host serves this chain:

```
*.pooler.supabase.com        issued by  Supabase Intermediate 2021 CA
Supabase Intermediate 2021 CA issued by  Supabase Root 2021 CA
Supabase Root 2021 CA        (self-signed)
```

`Supabase Root 2021 CA` is not in Node's bundled trust store, so `pg` fails with:

```
self-signed certificate in certificate chain
```

The ways around that are either unacceptable or non-portable:

- `sslmode=no-verify` — encrypts the traffic but never checks who is on the other
  end, so a man-in-the-middle can read it. This connection carries booking PII
  (name, email, WhatsApp, meeting URL), so it is not acceptable.
- Installing the certificate into the machine or Vercel trust store — works, but
  it is invisible state that a fresh clone or a new deployment does not have.

So the certificate is committed here and referenced from `DATABASE_URL`.

## Setup

Download from Supabase → your project → **Settings** → **Database** →
**SSL Configuration** → **Download Certificate**, save as `supabase-ca.pem`, and
use this connection string:

```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=certs/supabase-ca.pem
```

`sslrootcert` is a **relative path**, resolved by `pg` against `process.cwd()` —
the project root both locally and on Vercel, so one value works everywhere.

On Vercel, add the same `DATABASE_URL` value. No separate env var is needed: the
certificate ships with the repo, so any deploy that includes this directory has
it.

### Gotcha: `&` in shells

The URL contains a second `?`-parameter, so the `&` must survive the shell.

- **PowerShell** (via `npm run db:set-url --`): the project runs `.cmd` shims,
  and `cmd.exe` re-parses the argument, so a bare `&` truncates the URL. Either
  escape it as `^&`, or skip the helper and set `DATABASE_URL` in `.env.local`
  directly.

### `ssl` options passed alongside `connectionString` are ignored

`pg` gives the connection string priority over an `ssl` key in the options
object, so passing `{ connectionString, ssl: { ca } }` to `pg.Client` has no
effect and the connection still fails. That is why `src/lib/db/index.ts` only
ever passes `connectionString` — the certificate has to travel inside the URL.
