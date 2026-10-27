# Secrets with AWS Secrets Manager

How a project built from this skeleton keeps its secrets in AWS Secrets Manager instead of in
Dokploy, from first setup to rotation and offboarding.

> **Status.** This is the adoption guide. The skeleton does not ship the loader yet — it reads
> secrets from the environment only. [Adopting it](#adopting-it-in-a-project) lists the code
> changes, about twenty lines. A project that never sets `AWS_SECRET_ID` behaves exactly as today.

---

## The idea

The build never needed a secret, so it does not change. What changes is where the running
container gets its secrets: it fetches them from Secrets Manager once, when it starts, instead of
Dokploy holding every value.

```
┌──────────────── AWS ────────────────┐
│ Secrets Manager                     │
│   myapp/dev                         │
│   myapp/staging                     │
│   myapp/production                  │
│ IAM: one identity per app and env   │
│   read its own secret, send via SES │
└─────────────────▲───────────────────┘
                  │ read once, at container start
┌──────────────── Dokploy host ─────────────────────────────────┐
│ server container                                              │
│   env: plain config + AWS_SECRET_ID + one scoped credential   │
│   entrypoint: load secrets → migrate → load secrets → serve   │
│ client container                                              │
│   static files; VITE_API_URL baked in at build (public)       │
└───────────────────────────────────────────────────────────────┘
```

## What goes where

| Kind               | Example                                              | Lives in                             |
| ------------------ | ---------------------------------------------------- | ------------------------------------ |
| Public build value | `VITE_API_URL`                                       | compose `build.args`; ships to users |
| Plain config       | `PORT`, `CLIENT_URL`, `BETTER_AUTH_URL`, `LOG_LEVEL` | compose `environment:` as `${VAR}`   |
| Secret             | `DATABASE_URL`, `BETTER_AUTH_SECRET`                 | Secrets Manager only                 |
| AWS credential     | one scoped access key (later, a Roles Anywhere cert) | Dokploy — the only secret left there |

Never put a secret in a build argument, an image, git, a log line, a chat message, or a compose
default. Never share one AWS identity between apps or between environments.

## The bootstrap credential

To read from Secrets Manager the container needs an AWS credential. A server outside AWS has no
instance role to provide one, so something has to be the first credential:

| Option                  | How                                                      | When                         |
| ----------------------- | -------------------------------------------------------- | ---------------------------- |
| Scoped access key       | IAM user allowed to read one secret and send via SES     | Start here                   |
| IAM Roles Anywhere      | a certificate on the host swapped for 1-hour credentials | Next; no stored key          |
| EC2 / ECS instance role | the platform supplies credentials                        | Only if hosting moves to AWS |

A leaked scoped key can read one app's secrets for one environment and send email — not every
secret you own. Because the same identity sends mail, the separate SES keys go away.

## One-time setup, per app

1. **Create the secrets**, one per environment, each holding JSON:

   ```
   myapp/dev          {"DATABASE_URL":"…","BETTER_AUTH_SECRET":"…"}
   myapp/staging      {"DATABASE_URL":"…","BETTER_AUTH_SECRET":"…"}
   myapp/production   {"DATABASE_URL":"…","BETTER_AUTH_SECRET":"…"}
   ```

   Staging and production never share a value.

2. **Create one IAM user per environment** (`myapp-production`, `myapp-staging`) with only this
   policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "secretsmanager:GetSecretValue",
         "Resource": "arn:aws:secretsmanager:me-central-1:123456789012:secret:myapp/production-*"
       },
       {
         "Effect": "Allow",
         "Action": "ses:SendEmail",
         "Resource": "arn:aws:ses:me-central-1:123456789012:identity/example.com"
       }
     ]
   }
   ```

   The trailing `-*` is required: AWS appends six random characters to every secret's ARN. With
   the default AWS-managed encryption key no KMS permission is needed; a customer-managed key
   also needs `kms:Decrypt` on that key.

3. **Create an access key** for the user and put it in Dokploy's environment for that app and
   environment, with `AWS_REGION` and `AWS_SECRET_ID=myapp/production`.

4. **Fill in the plain config** in Dokploy: `BETTER_AUTH_URL`, `CLIENT_URL`, `SES_FROM_EMAIL`,
   `VITE_API_URL`.

5. **Give people access through IAM Identity Center (AWS SSO).** Developers can read `myapp/dev`
   only. Production is limited to whoever is on call.

Cost: $0.40 per secret per month plus $0.05 per 10,000 API calls — about $1.20 a month for three
environments, since the app reads once per start. Systems Manager Parameter Store's standard
`SecureString` parameters do the same job for free if you do not need managed rotation.

## Build flow, every push

1. Dokploy pulls the commit.
2. **Server image**: install from the lockfile, `bun run server/build.ts` produces
   `dist/index.js` and `dist/migrate.js`, and the runtime stage copies `dist/`, `templates/`,
   `db/migrations/` and `entrypoint.sh`. No secret is read — none exists at build time.
3. **Client image**: `VITE_API_URL` as a build argument, `vite build`, nginx serves `dist/`.
   Changing the API URL needs a rebuild, not a restart.
4. Dokploy replaces the running containers.

## Runtime flow, every container start

1. `entrypoint.sh` runs `bun dist/migrate.js`:
   1. `loadSecrets()` sees `AWS_SECRET_ID` and calls `GetSecretValue` once.
   2. The secret's JSON is merged into `process.env`. A key already set in the environment is
      kept, so one value can be overridden in an emergency without editing the secret.
   3. Migrations run. On failure `set -e` stops the container, so the server never starts
      against the wrong schema.
2. `exec bun dist/index.js`:
   1. `loadSecrets()` runs again.
   2. `server/config/env.ts` validates everything with Zod, treating empty as missing. A problem
      exits with the key names in the log — never the values.
   3. The server listens on 8000.
3. If AWS is unreachable or the credential is wrong, the container exits and Dokploy shows it
   restarting. It never serves without its secrets.

## docker-compose.yml

```yaml
services:
  server:
    build:
      context: .
      dockerfile: server/Dockerfile
    environment:
      NODE_ENV: production
      PORT: "8000"
      LOG_LEVEL: ${LOG_LEVEL:-info}
      # Plain config: not secret, so it stays here where review can see it.
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      CLIENT_URL: ${CLIENT_URL}
      TRUST_PROXY: ${TRUST_PROXY:-true}
      SES_FROM_EMAIL: ${SES_FROM_EMAIL}
      # Where the secrets are, and the one credential allowed to read them.
      AWS_REGION: ${AWS_REGION}
      AWS_SECRET_ID: ${AWS_SECRET_ID}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    restart: unless-stopped

  client:
    build:
      context: .
      dockerfile: client/Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
    restart: unless-stopped
```

`DATABASE_URL` and `BETTER_AUTH_SECRET` are gone from compose and from Dokploy. With Roles
Anywhere the two access-key lines are replaced by a mounted certificate.

## Local development

- **Default.** The root `.env` holds development values and has no `AWS_SECRET_ID`; the loader
  does nothing and the file is used as today.
- **Team mode.** Run `aws sso login`, then set `AWS_PROFILE` and `AWS_SECRET_ID=myapp/dev` in
  `.env`. Everyone reads the same development values and nobody passes `.env` files around.
- A developer machine never holds staging or production values.

## Changing a value

1. Update the secret in AWS. The previous version is kept.
2. Restart the server from Dokploy — secrets are read only at start.
3. If it breaks, restore the previous version of the secret and restart again.

## Rotation

| Secret               | How                                                          | Effect                   |
| -------------------- | ------------------------------------------------------------ | ------------------------ |
| `BETTER_AUTH_SECRET` | new value, restart                                           | every user is signed out |
| Database password    | `ALTER ROLE` in Postgres, update the secret, restart         | a brief reconnect        |
| AWS access key       | create a second key, update Dokploy, restart, delete the old | none                     |

Rotate on a schedule, and immediately when someone with production access leaves. AWS's
automatic rotation is built for its managed databases (RDS); for Postgres on your own host,
rotate by hand as above.

## Offboarding

1. Remove the person from IAM Identity Center — their AWS access ends.
2. Remove them from Dokploy and GitHub.
3. If they had production access, rotate the production secrets and the AWS key.

## If something leaks

| Leaked               | Gives access to                                    | Do                                       |
| -------------------- | -------------------------------------------------- | ---------------------------------------- |
| AWS access key       | one app's secret for one environment; sending mail | deactivate it in IAM; rotate that secret |
| `DATABASE_URL`       | that one database                                  | change the password, restart             |
| `BETTER_AUTH_SECRET` | forging sessions for that app                      | rotate it; everyone is signed out        |
| a laptop's `.env`    | development values only                            | rotate the development values            |

## Upgrade path

1. **Now** — one scoped access key per app and environment.
2. **Next** — IAM Roles Anywhere. A certificate on the host replaces the stored key and issues
   credentials that expire within the hour. Needs a certificate authority set up once; your own
   is free.
3. **If hosting moves to AWS** — the EC2 or ECS instance role. No stored credential anywhere.

## Adopting it in a project

Add the dependency:

```bash
cd server && bun add @aws-sdk/client-secrets-manager
```

Create `server/config/secrets.ts`:

```ts
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'

/**
 * Merges the app's secret JSON into process.env before the environment is validated. Does
 * nothing without AWS_SECRET_ID, so a local .env keeps working. A key already present in the
 * environment wins, which allows a one-off override without editing the secret.
 */
export async function loadSecrets() {
  const secretId = process.env.AWS_SECRET_ID
  if (!secretId) return

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION })
  const { SecretString } = await client.send(new GetSecretValueCommand({ SecretId: secretId }))
  const values = JSON.parse(SecretString ?? '{}') as Record<string, string>

  for (const [key, value] of Object.entries(values)) process.env[key] ??= value
}
```

Then:

| File                       | Change                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| `server/config/env.ts`     | `await loadSecrets()` before parsing; add optional `AWS_SECRET_ID` |
| `server/db/migrate.ts`     | `await loadSecrets()` first — it needs `DATABASE_URL`              |
| `server/config/secrets.ts` | the only other file allowed to read `process.env`                  |
| `docker-compose*.yml`      | drop `DATABASE_URL` and `BETTER_AUTH_SECRET`; add `AWS_SECRET_ID`  |
| `.env.example`             | document `AWS_SECRET_ID` and `AWS_PROFILE` for team mode           |

Bun supports top-level `await` in ES modules, so `env.ts` keeps exporting a plain, typed `env`.

Check it before the first deploy:

1. With no `AWS_SECRET_ID`, `bun run dev` still starts from `.env`.
2. With `AWS_SECRET_ID=myapp/dev` and an SSO profile, remove `DATABASE_URL` from `.env` and
   start again — it should come from AWS.
3. With a wrong secret id, the server exits at boot instead of starting.
