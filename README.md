# Smart Query Hub

Smart Query Hub is a university communication platform for submitting,
routing, tracking, and resolving student queries. It combines a Next.js web
application with a FastAPI AI service and a shared Supabase PostgreSQL
database.

## Architecture

- `web/` - Next.js 16.3.5, authentication, dashboards, query management,
  exports, WhatsApp controls, and Prisma 7 database access.
- `ai-service/` - FastAPI classification, reply drafting, routing,
  escalation, and scheduled processing.
- Supabase - hosted PostgreSQL shared by both services.

There is no local PostgreSQL or Docker setup. Both services use Supabase
connection strings from environment variables.

## Requirements

- Node.js 24 or newer and npm
- Python 3.14 or newer
- A Supabase project

## Supabase configuration

In Supabase, open **Project Settings → Database → Connection string**.

Configure `web/.env`:

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"
```

`DATABASE_URL` is the pooled runtime connection. `DIRECT_URL` is used by
Prisma CLI commands. URL-encode special password characters (`@` becomes
`%40`).

Configure `ai-service/.env` with the pooled connection:

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

To receive normal emails as queries, configure the AI service IMAP receiver
(Gmail users should create an App Password):

```env
EMAIL_INGESTION_ENABLED=true
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USERNAME=queries@your-domain.com
EMAIL_IMAP_PASSWORD=<mailbox-app-password>
EMAIL_IMAP_FOLDER=INBOX
GMAIL_POLL_MINUTES=1
```

The AI service checks unread messages, creates an `EMAIL` query, marks the
message as read only after successful creation, and then the normal AI
processing scheduler classifies and routes it.

The AI service removes Prisma’s `pgbouncer` query parameter before connecting
with psycopg and enforces SSL for Supabase.

## Web application

```powershell
cd web
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open <http://localhost:3000>.

Available commands include `npm run build`, `npm run lint`,
`npm run db:generate`, `npm run db:push`, `npm run db:seed`, and
`npm run db:studio`.

## AI service

```powershell
cd ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Health check: <http://localhost:8000/health>

Main endpoints:

- `GET /health` - provider and database status.
- `POST /process` - classify and process a query.
- `POST /escalate` - run escalation processing.
- `GET /{query_id}` - retrieve a processed query.

Optional provider packages are in `requirements-ai.txt`. Without provider
keys, the service uses its deterministic rules-based classifier.

## AI webhook

To send completed AI results to the web app, configure matching values in both
services:

```env
AI_WEBHOOK_URL=http://localhost:3000
AI_WEBHOOK_SECRET=<shared-secret>
```

The endpoint is `POST /api/webhook/ai`; the secret is sent in the
`x-ai-secret` header.

### Incoming email submission

The web app accepts normalized email payloads at `POST /api/email/ingest`.
Configure `EMAIL_INGEST_SECRET` and send it in the `x-email-ingest-secret`
header. The sender is matched to an existing student by email; unknown senders
still create an unlinked query for staff review.

```json
{
  "from": "student@vu.edu.pk",
  "subject": "Unable to access LMS",
  "text": "I cannot log in to my LMS account.",
  "messageId": "provider-message-id",
  "threadId": "provider-thread-id"
}
```

Each accepted message becomes a `SUBMITTED` query with channel `EMAIL`, and
the existing AI processing pipeline is triggered. An email provider/webhook or
mailbox poller must call this endpoint; SMTP credentials alone do not receive
incoming mail.

## Authentication and email

Optional web settings include Google OAuth and SMTP email delivery:

```env
AUTH_SECRET=<random-secret>
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<google-app-password>
EMAIL_FROM=<sender-address>
AUTH_GITHUB_ID=<github-oauth-client-id>
AUTH_GITHUB_SECRET=<github-oauth-client-secret>
```

The login screen supports Google, GitHub, and email OTP. Configure the OAuth
providers you want to offer; email OTP works independently through SMTP.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by
browser-side Supabase features. Never commit `.env` files, database passwords,
API keys, SMTP credentials, or webhook secrets.

## Verification

```powershell
cd web
npm run build

cd ..\ai-service
.venv\Scripts\python.exe -m pytest
```

The web build should pass, and `/health` should report the AI providers and
database status as available.
