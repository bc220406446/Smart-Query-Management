# Smart Query Hub

**Final-year project (CS619) — University Intelligent Communication Hub**

Smart Query Hub is a university communication platform that classifies, routes, tracks, and escalates student queries submitted across multiple channels — web form, email, and WhatsApp — instead of leaving them to manual, ad-hoc handling by department staff. It pairs a **Next.js** web application with a **FastAPI** AI service, backed by a shared **Supabase PostgreSQL** database.

> **Status:** deployed and live. Frontend on Vercel, AI service on Azure App Service (see [Live Deployment](#live-deployment)). Originally scoped in the project catalog as a Python/FastAPI/LangChain system; rebuilt on a Next.js/Node + FastAPI stack. Sections marked *TBD* are being completed as part of ongoing evaluation work.

## Live Deployment

| Service | URL |
|---|---|
| Web app (Vercel) | https://smart-query-management.vercel.app/ |
| AI service (Azure App Service) | https://smart-query-hub-gwgkevcdeudgguaw.malaysiawest-01.azurewebsites.net |

The web app's `AI_SERVICE_URL` environment variable points at the Azure URL in production, and the AI service's `AI_WEBHOOK_URL` points back at the Vercel URL — see [5. AI webhook](#5-ai-webhook-connect-the-two-services). Local development still defaults to `http://localhost:3000` / `http://localhost:8000`.

---

## Table of Contents

- [Problem](#problem)
- [Approach](#approach)
- [Architecture](#architecture)
- [Features](#features)
- [Evaluation](#evaluation)
- [Limitations](#limitations)
- [Future Work](#future-work)
- [Requirements](#requirements)
- [Setup](#setup)
  - [1. Clone the repo](#1-clone-the-repo)
  - [2. Supabase configuration](#2-supabase-configuration)
  - [3. Web application setup](#3-web-application-setup)
  - [4. AI service setup](#4-ai-service-setup)
  - [5. AI webhook (connect the two services)](#5-ai-webhook-connect-the-two-services)
  - [6. Email ingestion](#6-email-ingestion)
  - [7. WhatsApp support account](#7-whatsapp-support-account)
  - [8. Authentication & outgoing email](#8-authentication--outgoing-email)
- [Verification](#verification)
- [Security notes](#security-notes)

---

## Problem

University departments receive student queries through disconnected channels — email, WhatsApp, walk-ins, ad-hoc web forms — with no shared routing, no SLA tracking, and no record of who handled what. Queries get lost, duplicated across channels, or sit unresolved with no escalation path. Smart Query Hub centralizes intake, applies automatic classification and routing, tracks status end to end, and escalates anything that goes unresolved past a defined window.

## Approach

**Problem → Automation → Technology → Result**

- **Problem:** manual triage of multi-channel queries by department staff, with no consistent routing or escalation.
- **Automation:** incoming queries (web, email, WhatsApp) are normalized into a single `Query` record, classified, and routed to the right department/staff automatically; unresolved queries auto-escalate after a configurable window; staff retain override authority at every step.
- **Technology:** a deterministic, rules-based classifier runs by default (no external AI provider required); optional AI provider packages can be enabled for higher-accuracy classification. All processing is logged for audit.
- **Result:** *TBD — being measured against a labeled test set (see [Evaluation](#evaluation)).*

## Architecture

| Component | Description |
|---|---|
| `web/` | Next.js 16.3.5 app — authentication, dashboards, query management, exports, WhatsApp controls, Prisma 7 database access |
| `ai-service/` | FastAPI service — query classification, AI reply drafting, routing, escalation, and scheduled processing |
| Supabase | Hosted PostgreSQL database shared by both services (no local Postgres or Docker needed) |

```
          ┌───────────────┐        REST/webhook        ┌──────────────────┐
  Web ──▶ │   web/ (Next)  │ ◀────────────────────────▶ │ ai-service (FastAPI) │
  Email ─▶│  auth, admin,  │   x-ai-secret / shared key  │ classify, route,  │
  WhatsApp▶│  dashboards    │                             │ escalate, draft   │
          └───────┬───────┘                              └─────────┬────────┘
                  │                                                 │
                  └─────────────────── Supabase PostgreSQL ─────────┘
```

Both services connect to the same Supabase database using connection strings supplied via environment variables — there's no local database or container setup required. The AI service strips Prisma's `pgbouncer` query parameter before connecting via `psycopg` and enforces SSL for Supabase.

## Features

- **Role-based authentication** — Google OAuth, GitHub OAuth, and email OTP login
- **Multi-channel query intake** — web form, inbound email, and WhatsApp, normalized into one pipeline
- **Classification & routing** — a deterministic rules-based classifier by default, with optional AI-provider packages for smarter classification; every query is tagged with a channel and routed automatically
- **AI-drafted replies** — the AI service can draft suggested responses for staff review
- **Status tracking** — queries move through defined states (e.g., `SUBMITTED` → processed → resolved), visible to students and staff
- **Auto-escalation** — unresolved queries escalate automatically after a configurable window, with human override preserved throughout
- **Admin/HOD dashboard & analytics** — query management, staff overrides, reporting
- **Data export** — PDF/Excel export of query data
- **Email ingestion pipeline** — IMAP polling or webhook-based ingestion creates `EMAIL` queries and feeds them into the pipeline
- **WhatsApp integration** — a linked WhatsApp number (via `whatsapp-web.js`, paired by QR code) turns incoming personal chats into `WHATSAPP` queries; group chats are ignored, and messages are only turned into queries for students whose phone number is verified on their profile
- **Webhook-driven sync** — the AI service pushes completed classification/processing results back to the web app over a secret-authenticated webhook
- **Audit logging** — the classification → routing → escalation pipeline is logged, so every automated decision is traceable to a record

## Evaluation

*To make the case that this is more than an API wrapper around a model, evaluation is being built out alongside the pipeline rather than treated as an afterthought:*

- **Labeled test set:** a held-out set of sample queries with known correct category/department labels — used to measure classifier accuracy/precision/recall per class, not just overall accuracy. *(size and source: TBD)*
- **Confidence threshold:** low-confidence classifications are routed for manual review rather than auto-assigned.
- **Human override rate:** tracked as a signal of how often the automated routing decision is corrected by staff.
- **Escalation accuracy:** whether escalated queries were genuinely at risk of going unresolved, vs. false escalations.

Numbers will be added here once the test set and provider configuration are finalized — this section intentionally stays empty of invented metrics until real results exist.

## Limitations

- The default classifier is rules-based rather than learned, so accuracy depends on how well the rules generalize to query phrasing not seen during design; this is why optional AI-provider packages and the evaluation work above exist.
- WhatsApp ingestion depends on a single linked support number via `whatsapp-web.js` (an unofficial client that drives WhatsApp Web through Puppeteer) rather than the official WhatsApp Cloud API — intended as a stand-in that can be swapped later without changing the query workflow. This also means the session is tied to one Chrome/Chromium install and one QR-paired device.
- Email ingestion requires either a mailbox poller or an external provider webhook; SMTP alone does not receive incoming mail.
- No load/scale testing has been done — the system has been exercised with local and small-scale test data, not production volumes.

## Future Work

- Fill in the Evaluation section with a real labeled test set, baseline comparisons (rules-based vs. an enabled AI-provider classifier), and per-class precision/recall.
- Replace the `whatsapp-web.js` adapter with the official WhatsApp Cloud API.
- Add load testing and monitoring for the escalation scheduler at production-like query volumes.
- Expand the audit log into a reviewable trail for HOD-level accountability reporting.

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

| Method & Path | Description |
|---|---|
| `GET /health` | Reports AI provider and database status |
| `POST /process` | Classify and process a query |
| `POST /escalate` | Run escalation processing |
| `GET /{query_id}` | Retrieve a processed query by ID |

Optional AI provider packages live in `requirements-ai.txt`. Without provider keys configured, the service falls back to its deterministic, rules-based classifier.

### 5. AI webhook (connect the two services)

The web app and AI service each need to know how to reach the other.

In `ai-service/.env`:

```env
AI_WEBHOOK_URL=http://localhost:3000        # or https://smart-query-management.vercel.app in production
AI_WEBHOOK_SECRET=<shared-secret>
```

In `web/.env`:

```env
AI_SERVICE_URL=http://localhost:8000        # or https://smart-query-hub-gwgkevcdeudgguaw.malaysiawest-01.azurewebsites.net in production
```

The web app receives AI results at `POST /api/webhook/ai`, authenticated via the `x-ai-secret` header (`AI_WEBHOOK_SECRET`). The web app in turn calls the AI service's `/queries/draft` and related endpoints using `AI_SERVICE_URL`.

### 6. Email ingestion

**Option A — IMAP polling:** configure `ai-service/.env` (Gmail users should generate an App Password):

```env
EMAIL_INGESTION_ENABLED=true
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USERNAME=queries@your-domain.com
EMAIL_IMAP_PASSWORD=<mailbox-app-password>
EMAIL_IMAP_FOLDER=INBOX
GMAIL_POLL_MINUTES=1
```

The service checks for unread mail, creates an `EMAIL` query, marks the message as read only after the query is successfully created, and lets the scheduler classify and route it.

**Option B — webhook ingestion:** `POST /api/email/ingest` on the web app, authenticated via `EMAIL_INGEST_SECRET` in the `x-email-ingest-secret` header:

```json
{
  "from": "student@vu.edu.pk",
  "subject": "Unable to access LMS",
  "text": "I cannot log in to my LMS account.",
  "messageId": "provider-message-id",
  "threadId": "provider-thread-id"
}
```

Each accepted message becomes a `SUBMITTED` query with channel `EMAIL`, matched to an existing student by sender email (unknown senders still create an unlinked query for staff review).

### 7. WhatsApp support account

Smart Query Hub uses [`whatsapp-web.js`](https://wwebjs.dev/) (a Puppeteer-driven WhatsApp Web client, paired via QR code) rather than Baileys or the official Cloud API.

1. Go to `/admin/whatsapp` in the running web app, or call `POST /api/whatsapp/connect` directly (see below) to start the client.
2. Scan the QR code — printed to the web server terminal, and/or surfaced in the admin page — with a dedicated WhatsApp number to pair the session.
3. Students message that number — each incoming **personal** chat becomes a `WHATSAPP` query (group chats are ignored, and only verified student phone numbers get a query attached).
4. Do **not** link a staff member's personal number — the linked number becomes the shared support inbox, and outgoing staff replies are sent from it.

Relevant environment variables (`web/.env`):

```env
WA_SESSION_PATH=./.wa-auth              # where the paired session is persisted
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome   # path to a Chrome/Chromium binary
WA_SUPPORT_NUMBER=<linked-number>       # used to match incoming messages to User.phone
```

To (re)trigger a connection:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp/connect" -Method POST
```

> Because the session is a real, QR-paired WhatsApp Web client, it needs a Chrome/Chromium binary available in whatever environment runs it, and the paired session persists at `WA_SESSION_PATH` — back this path up if you redeploy the web app somewhere the session needs to survive a restart.

### 8. Authentication & outgoing email

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
