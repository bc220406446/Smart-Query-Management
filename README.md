# Smart Query Hub

Smart Query Hub is a university communication platform for submitting, routing, tracking, and resolving student queries across multiple channels (web, email, WhatsApp). It pairs a **Next.js** web application with a **FastAPI** AI service, backed by a shared **Supabase PostgreSQL** database.

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
  - [1. Clone the repo](#1-clone-the-repo)
  - [2. Supabase configuration](#2-supabase-configuration)
  - [3. Web application setup](#3-web-application-setup)
  - [4. AI service setup](#4-ai-service-setup)
  - [5. AI webhook (connect the two services)](#5-ai-webhook-connect-the-two-services)
  - [6. Email ingestion](#6-email-ingestion)
  - [7. WhatsApp support account (local testing)](#7-whatsapp-support-account-local-testing)
  - [8. Authentication & outgoing email](#8-authentication--outgoing-email)
- [Verification](#verification)
- [Security notes](#security-notes)

---

## Architecture

| Component | Description |
|---|---|
| `web/` | Next.js 16.3.5 app — authentication, dashboards, query management, exports, WhatsApp controls, Prisma 7 database access |
| `ai-service/` | FastAPI service — query classification, AI reply drafting, routing, escalation, and scheduled processing |
| Supabase | Hosted PostgreSQL database shared by both services (no local Postgres or Docker needed) |

Both services connect to the same Supabase database using connection strings supplied via environment variables — there's no local database or container setup required.

## Features

Core functional capabilities of the platform:

- **Role-based authentication** — Google OAuth, GitHub OAuth, and email OTP login
- **Multi-channel query intake** — students can submit queries via the web form, inbound email, or WhatsApp
- **AI-powered classification & routing** — incoming queries are automatically classified and routed to the right department/staff using a rules-based classifier, with optional AI provider packages for smarter classification
- **AI-drafted replies** — the AI service can draft suggested responses to queries
- **Real-time status tracking** — students and staff can track a query's status as it moves through the pipeline (e.g., `SUBMITTED` → processed → resolved)
- **Auto-escalation** — queries that go unresolved are automatically escalated after a configurable window
- **Admin/HOD dashboard & analytics** — dashboards for query management, staff overrides, and reporting
- **Data export** — PDF/Excel export of query data
- **Email ingestion pipeline** — an IMAP-based poller (or webhook) picks up unread mailbox messages, creates `EMAIL` queries, and feeds them into the AI pipeline
- **WhatsApp integration** — a linked WhatsApp number (via Baileys) turns incoming personal chats into `WHATSAPP` queries; group chats are ignored
- **Webhook-driven sync** — the AI service pushes completed classification/processing results back to the web app over a secret-authenticated webhook
- **Audit logging** — tracked actions across the query lifecycle

## Requirements

- Node.js 24 or newer, and npm
- Python 3.14 or newer
- A Supabase project

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/bc220406446/Smart-Query-Management.git
cd Smart-Query-Management
```

### 2. Supabase configuration

In your Supabase dashboard, go to **Project Settings → Database → Connection string**.

Create `web/.env` with:

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"
```

- `DATABASE_URL` — pooled connection used at runtime.
- `DIRECT_URL` — used by Prisma CLI commands (migrations, `db push`, etc.).
- URL-encode special characters in your password (e.g. `@` → `%40`).

Create `ai-service/.env` with the pooled connection string:

```env
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

> The AI service strips Prisma's `pgbouncer` query parameter before connecting via `psycopg`, and enforces SSL for Supabase connections.

### 3. Web application setup

```bash
cd web
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

The app will be available at **http://localhost:3000**.

Other useful commands:

| Command | Purpose |
|---|---|
| `npm run build` | Production build |
| `npm run lint` | Lint the codebase |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

### 4. AI service setup

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1      # Windows PowerShell
# source .venv/bin/activate     # macOS/Linux
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Health check: **http://localhost:8000/health**

Main endpoints:

| Method & Path | Description |
|---|---|
| `GET /health` | Reports AI provider and database status |
| `POST /process` | Classify and process a query |
| `POST /escalate` | Run escalation processing |
| `GET /{query_id}` | Retrieve a processed query by ID |

Optional AI provider packages live in `requirements-ai.txt`. Without provider keys configured, the service falls back to its deterministic, rules-based classifier — so it works out of the box.

### 5. AI webhook (connect the two services)

To let the AI service push completed results back to the web app, set matching values in **both** `.env` files:

```env
AI_WEBHOOK_URL=http://localhost:3000
AI_WEBHOOK_SECRET=<shared-secret>
```

The web app receives these at `POST /api/webhook/ai`, authenticated via the `x-ai-secret` header.

### 6. Email ingestion

**Option A — IMAP polling (recommended for testing):** configure the AI service's IMAP receiver in `ai-service/.env` (Gmail users should generate an App Password):

```env
EMAIL_INGESTION_ENABLED=true
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USERNAME=queries@your-domain.com
EMAIL_IMAP_PASSWORD=<mailbox-app-password>
EMAIL_IMAP_FOLDER=INBOX
GMAIL_POLL_MINUTES=1
```

The service checks for unread mail, creates an `EMAIL` query, marks the message as read only after the query is successfully created, and then lets the normal scheduler classify and route it.

**Option B — webhook ingestion:** the web app accepts normalized email payloads directly at `POST /api/email/ingest`. Set `EMAIL_INGEST_SECRET` in `web/.env` and send it in the `x-email-ingest-secret` header:

```json
{
  "from": "student@vu.edu.pk",
  "subject": "Unable to access LMS",
  "text": "I cannot log in to my LMS account.",
  "messageId": "provider-message-id",
  "threadId": "provider-thread-id"
}
```

Each accepted message becomes a `SUBMITTED` query with channel `EMAIL`, matched to an existing student by sender email (unknown senders still create an unlinked query for staff review), and triggers the AI pipeline. Note: this endpoint needs an email provider/webhook or a mailbox poller calling it — SMTP credentials alone don't receive incoming mail.

### 7. WhatsApp support account (local testing)

1. Go to `/admin/whatsapp` in the running web app.
2. Scan the Baileys QR code printed in the web server terminal to link a dedicated WhatsApp number.
3. Have students message that linked number — each incoming **personal** chat becomes a `WHATSAPP` query (group chats are ignored).
4. Do **not** link a staff member's personal number — the linked number becomes the shared support inbox, and outgoing replies are sent from it.

Set `WA_SUPPORT_NUMBER` in `web/.env` to the linked Baileys account number so incoming messages can be matched against `User.phone` (students must save this number in their profile).

To (re)trigger a connection programmatically:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp/connect" -Method POST
```

This adapter can later be swapped for the official WhatsApp Cloud API without changing the underlying query workflow.

### 8. Authentication & outgoing email

Optional settings in `web/.env`:

```env
AUTH_SECRET=<random-secret>
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
AUTH_GITHUB_ID=<github-oauth-client-id>
AUTH_GITHUB_SECRET=<github-oauth-client-secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<google-app-password>
EMAIL_FROM=<sender-address>
```

The login screen supports Google, GitHub, and email OTP — configure whichever OAuth providers you want to offer; email OTP works independently through SMTP.

Also required for browser-side Supabase features:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Verification

```bash
cd web
npm run build

cd ../ai-service
.venv\Scripts\python.exe -m pytest
```

- The web build should complete without errors.
- `/health` on the AI service should report the AI providers and database status as available.

## Security notes

- Never commit `.env` files, database passwords, API keys, SMTP credentials, or webhook secrets.
- Rotate `AI_WEBHOOK_SECRET` and `EMAIL_INGEST_SECRET` if they're ever exposed.
- Use App Passwords (not your real account password) for Gmail IMAP/SMTP.
