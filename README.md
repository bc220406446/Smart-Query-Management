# Smart Query Routing & Email Automation System

An AI-powered, role-based communication hub for universities. Students submit
queries (web form, email, WhatsApp), AI classifies intent and routes each query
to the right department/instructor, drafts replies for staff to review, and
tracks everything to resolution — with 24-hour auto-escalation.

Built for the FYP **"Smart Query Routing & Email Automation System"** — all
free-tier tools (Vercel, Render, Supabase/Postgres, Gemini/Claude free tiers).

## Repository layout

```
.
├── web/            Next.js 15 (TypeScript) — UI, auth, dashboards, exports   (FR-01,02,06,08–12,14)
├── ai-service/     FastAPI (Python) — classification, routing, drafting,
│                   escalation, scheduled jobs                                (FR-02,03,04,05,07,08,13)
├── docker-compose.yml   Optional local PostgreSQL (not required — see below)
└── README.md
```

Both services share **one PostgreSQL database**. `web/prisma/schema.prisma`
is the source of truth (created with `prisma db push`); the FastAPI service
mirrors those tables with SQLAlchemy (`ai-service/app/models.py`) and reads /
writes the same rows. They stay in sync with no duplicated logic:

```
┌──────────────────────────┐
│   PostgreSQL / Supabase   │   shared database
└────────────┬─────────────┘
             │
   ┌─────────┴──────────┐
   │ Next.js (Vercel)    │ ◄── HTTP ──►  FastAPI AI service (Render)
   │ UI · Auth · Forms   │               classification · routing · drafts
   └────────────────────┘               escalation · scheduler
```

## Quick start

### 1. Database (Supabase — no local PostgreSQL install needed)

1. Create a free project at <https://supabase.com>.
2. Open **Project Settings → Database → Connection string**.
3. Copy the **URI** value into `DATABASE_URL` and the **Direct connection**
   value into `DIRECT_URL` in `web/.env` (and the direct value into
   `DATABASE_URL` in `ai-service/.env`).

   ```env
   # web/.env
   DATABASE_URL="postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.<REF>:<PASSWORD>@db.<REF>.supabase.co:5432/postgres"
   ```

   > If the password contains URL-special characters (`@ : / #`), URL-encode
   > them, e.g. `p@ss` → `p%40ss`.

4. Create the tables and seed demo data (runs against Supabase over the
   direct connection):

   ```bash
   cd web
   npm run db:push               # create tables from prisma/schema.prisma
   npm run db:seed               # demo departments, users, queries
   ```

> **Prefer a local database?** `docker compose up -d` starts postgres:16 on
> `localhost:5432` (db `smartquery`, user/password `postgres`) — a drop-in
> alternative; just point the env files at it instead.

The application is configured for Supabase and does not start or require a
local PostgreSQL server. Do not run `docker compose up` for the database.

### 2. Web app (Next.js)

```bash
cd web
cp .env.example .env          # then fill in AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
npm install
npm run dev                   # http://localhost:3000
```

Google OAuth2 (FR-01):

1. Create credentials at <https://console.cloud.google.com/apis/credentials>.
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
3. Put the client id/secret in `web/.env`. Generate `AUTH_SECRET` with
   `openssl rand -base64 32`.

Roles come from the `users` table. Seed accounts get their role automatically
when they sign in with the matching Google account:

| Email | Role |
|---|---|
| `admin@vu.edu.pk` | ADMIN |
| `hod.cs@vu.edu.pk` | HOD |
| `s.raza@vu.edu.pk` | INSTRUCTOR |
| `student.demo@vu.edu.pk` | STUDENT |

New Google sign-ins default to STUDENT (an admin can promote them in the DB).

### 3. AI service (FastAPI)

```bash
cd ai-service
python3 -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# .venv/bin/pip install -r requirements.txt                    # Linux/macOS
cp .env.example .env
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

The pipeline works **without any API keys** using a deterministic rule-based
classifier (perfect for demos/CI). To enable LLM classification & drafting:

```bash
pip install -r requirements-ai.txt     # langchain + Gemini + Claude SDKs
# add GEMINI_API_KEY / ANTHROPIC_API_KEY to ai-service/.env
```

Provider chain (LangChain-style orchestration): Gemini (fast/cheap) → Claude
(for low-confidence or ambiguous) → rule-based fallback.

## Feature coverage

| ID | Requirement | Where |
|---|---|---|
| FR-01 | Google OAuth2 + roles | `web/lib/auth.ts`, `web/middleware.ts` |
| FR-02 | Query submission (web form; email/WhatsApp channels normalized into `queries`) | `web/app/dashboard/queries/new`, `ai-service` ingestion |
| FR-03 | AI classification & intent | `ai-service/app/pipeline/classifier.py` |
| FR-04 | Automatic routing to dept/instructor | `ai-service/app/pipeline/router.py` |
| FR-05 | AI-drafted reply suggestions | `ai-service/app/pipeline/drafts.py`, `web/app/staff/queries/[id]` |
| FR-06 | Real-time status tracking | `web/components/QueryStatusPoller.tsx` (+ Supabase Realtime swap-in) |
| FR-07 | 24h auto-escalation | `ai-service/app/service.py`, `ai-service/app/scheduler.py` |
| FR-08 | Notifications (in-app; email via Resend) | `web/lib/notify.ts` |
| FR-09 | HOD escalation & override | `web/app/hod` |
| FR-10 | Admin analytics dashboard | `web/app/admin` (Recharts) |
| FR-11 | Broadcast announcements | `web/app/admin/announcements` |
| FR-12 | Export reports (Excel now; PDF next) | `web/app/api/export/route.ts` |
| FR-13 | Instructor leave / auto-reply mode | `users.is_on_leave`, routing skips on-leave staff |
| FR-14 | Audit log | `web/lib/audit.ts`, `web/app/admin/audit` |

### Email + OTP login (new)

- `/login` and `/register` accept an institutional email, send a 6-digit OTP
  via SMTP (Google App Password), and complete sign-in/sign-up through the
  `email-otp` credentials provider in NextAuth.
- Google OAuth remains available as an alternative on both pages.
- OTP codes are hashed (SHA-256) and stored in the Auth.js
  `verification_tokens` table; they expire in 5 minutes.

### Email notifications (FR-08)

- `sendEmailNotification` now sends via SMTP (Nodemailer) instead of Resend.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Google App
  Password), and `EMAIL_FROM` in `web/.env`.
- Falls back silently when `SMTP_PASS` is unset.

### WhatsApp (FR-02/FR-08)

- Add `@whiskeysockets/baileys` and start the listener from
  `/admin/whatsapp` (ADMIN only) or a standalone script that calls
  `lib/whatsapp`.
- Incoming personal messages are normalized into `queries` rows with
  `channel = WHATSAPP`; the AI pipeline picks them up automatically.
- Staff can reply from the same console (`/api/whatsapp/send`).
- **Baileys is unofficial** and can trigger account warnings/suspension on
  repeated use. For production, prefer the official WhatsApp Cloud API.
- Phone→user mapping is stored in browser `localStorage` for the demo console
  and can be wired to the DB in a later iteration.

### Email ingestion (FR-02)
- `ai-service/app/service.py` now includes a Gmail API poller stub
  (`gmail_poll_for_emails`) and per-message ingestion (`ingest_email_query`).
- When `GMAIL_CREDENTIALS_JSON` is set the scheduler polls Gmail and creates
  `queries` rows with `channel = EMAIL`.
- Without credentials the poller logs and skips (no side effects).

### PDF export (FR-12)
- `/api/export/pdf` generates a landscape A4 PDF query report
  (`@react-pdf/renderer`). The existing Excel route (`/api/export`) remains.

### Realtime status (FR-06)
- `QueryStatusPoller` now tries a Supabase Realtime channel first (when
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set) and
  falls back to the existing poller otherwise. No UI changes required.

### Webhook sync
- `web/app/api/webhook/ai` remains the secondary, webhook-driven path for
  classification results. The AI service writes directly to the DB by default.

## Verification

```bash
cd web && npm run build          # typecheck + production build
cd ai-service && .venv/Scripts/python.exe -m pytest   # 23 tests
```

## Known gaps / next steps

- **WhatsApp (FR-02/08):** Baileys is unofficial and risks account suspension.
  Prefer the official WhatsApp Cloud API, or defer to a post-FYP iteration.
- **Email ingestion (FR-02):** Gmail API poller scaffolding is deferred; add an
  ingestion job in `ai-service/app/service.py` that creates `queries` rows with
  `channel = EMAIL` and lets the pipeline take over.
- **PDF export (FR-12):** Excel is implemented (`/api/export`); add
  `@react-pdf/renderer` for PDF.
- **Realtime:** the poller is deliberately simple; swap
  `QueryStatusPoller` for Supabase Realtime channels in production without UI
  changes.
- **Webhook sync:** the AI service writes results directly to the DB (primary
  path). `web/app/api/webhook/ai` exists for webhook-driven updates if preferred.
