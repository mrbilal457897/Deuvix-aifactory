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

## How the certificate is applied

The certificate is **embedded in code**, in `src/lib/db/supabase-ca.ts`, and
handed to `pg` as `ssl: { ca, rejectUnauthorized: true }` by
`src/lib/db/index.ts`. `DATABASE_URL` is a plain URL with no TLS parameters:

```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Two Next.js/`pg` behaviours make this the only arrangement that works:

### 1. `sslrootcert` does not survive the build

`pg` can be pointed at a file with `?sslrootcert=certs/supabase-ca.pem`, which
looks portable because `pg` resolves it against `process.cwd()` — the project root
both locally and on Vercel. It is not portable. Next.js builds the deployment
bundle by tracing only files it can see referenced *statically*; a path that only
exists as a string inside an env var is invisible to the tracer, so the file is
left out of the bundle. The URL looks correct, the repo has the certificate, and
production still fails to connect. A bundled module is always included.

### 2. `sslmode` in the URL overrides an `ssl` option

`pg` gives `connectionString` priority over an `ssl` key in the options object,
so TLS parameters in `DATABASE_URL` win. Worse, `sslmode=require` is **not** a
request to skip verification — `pg` maps it to `rejectUnauthorized: true`
(equivalent to verify-full) against the system trust store, which does not contain
Supabase's CA. So an innocent-looking `?sslmode=require` reintroduces the exact
error the CA was added to fix. Keeping TLS parameters out of the URL entirely is
what lets the `ssl` option take effect.

As a side effect, no `&` appears in the connection string, which also avoids the
`cmd.exe` argument-truncation gotcha that `npm run db:set-url --` used to hit.

`DATABASE_SSL=off` opts out for a self-hosted Postgres that presents a publicly
trusted certificate.

## Setup

Download from Supabase → your project → **Settings** → **Database** →
**SSL Configuration** → **Download Certificate**, save it as `certs/supabase-ca.pem`,
then:

```bash
npm run ca:embed
```

That regenerates `src/lib/db/supabase-ca.ts` from the `.pem`, refusing to write
anything that contains a private key. Commit both files together.

On Vercel, add the plain `DATABASE_URL` shown above as a production variable. No
separate certificate env var is needed and no shell escaping is required.