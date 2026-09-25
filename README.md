# OMNICARE — Enterprise Hospital Management System

A full hospital operations platform: patient management, doctor scheduling,
appointments, electronic medical records, billing & insurance, pharmacy,
lab results, and **ARIA** — an AI healthcare assistant powered by Google
Gemini — unified behind role-based access control for Admin, Doctor, Nurse,
Pharmacist, and Patient users.

> **Status, read this first:** every file in this repository is real,
> hand-written source — not scaffolding or placeholders. It has been
> rigorously *statically* verified (syntax-checked, cross-referenced field
> by field between frontend and backend). It has **never been executed** —
> no `pip install`, no `npm install`, no database migration, no running
> server, no real Gemini API call, anywhere, by anyone, yet. This was built
> in a sandboxed environment with no internet access and none of the
> required runtimes installed. Treat first boot as exactly that: a first
> boot. Small issues that only surface at runtime are likely. See
> [`PROGRESS.md`](./PROGRESS.md) for the full, continuously-updated, honest
> account of what's verified vs. assumed.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Backend | Django 6 + Django REST Framework |
| Database | PostgreSQL 16+ |
| Auth | JWT (`djangorestframework-simplejwt`) + Role-Based Access Control |
| AI Assistant | Google Gemini API (`gemini-3.5-flash`) via the official `google-genai` SDK — no LangChain |

## Project structure

```
omnicare/
├── backend/            Django + DRF API
│   ├── apps/            12 apps: accounts, core, patients, doctors, nurses,
│   │                    pharmacists, appointments, medical_records,
│   │                    prescriptions, pharmacy, billing, labs, ai_assistant
│   ├── config/          settings, URL routing, WSGI/ASGI
│   ├── requirements.txt
│   └── .env.example
├── frontend/            Next.js app
│   ├── src/app/          routes (login, register, dashboard/*)
│   ├── src/components/   UI library, layout, dashboard widgets, ARIA chat
│   ├── src/lib/          API client, auth context, types, hooks
│   └── .env.example
├── live-preview/        Standalone single-file React mockup (mock data,
│                        no backend needed) — for design/UX review only
├── docker-compose.yml   PostgreSQL only — see note below
└── PROGRESS.md          Living status doc; verify claims against it
```

## Quick start

**Automated option:** `./setup.sh` from the repo root walks through steps
1–3 below interactively (starts Postgres via Docker if available, sets up
the backend venv + migrations + demo data, installs frontend deps). It's
never been run end-to-end either — same caveat as everything else here —
but it's a reasonable first thing to try. The manual steps below are what
it automates, for when you want more control or it hits something it
doesn't handle.

### Prerequisites
- Python 3.12+
- Node.js 22+
- PostgreSQL 16+ (or Docker, see below)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (optional to start the server, required for ARIA to actually respond)

### 1. Database

**Option A — Docker (recommended):**
```bash
docker compose up -d
```
This starts Postgres only, matching the credentials already in
`backend/.env.example` (`omnicare` / `omnicare_user` / `omnicare_pass`).
The backend and frontend are deliberately **not** containerized here — this
was built without a way to test a Dockerfile end-to-end, so shipping one
would be guessing rather than verifying. Running them natively (below) is
lower-risk until someone confirms the containerized path works.

**Option B — Local PostgreSQL:**
```sql
CREATE DATABASE omnicare;
CREATE USER omnicare_user WITH PASSWORD 'omnicare_pass';
GRANT ALL PRIVILEGES ON DATABASE omnicare TO omnicare_user;
```

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then edit .env — at minimum set GEMINI_API_KEY
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo_data   # creates demo users + sample data, see below
python manage.py createsuperuser  # optional, if you want a fresh admin instead of the seeded one
python manage.py runserver
```
API now serving at `http://localhost:8000/api/`, Django admin at
`http://localhost:8000/admin/`.

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local        # defaults to http://localhost:8000/api, adjust if needed
npm install
npm run dev
```
App now at `http://localhost:3000`.

### 4. Log in

Demo accounts created by `seed_demo_data` (all share one password):

| Role | Email | Password |
|---|---|---|
| Admin | admin@omnicare.dev | DemoPass123! |
| Doctor | doctor@omnicare.dev | DemoPass123! |
| Nurse | nurse@omnicare.dev | DemoPass123! |
| Pharmacist | pharmacist@omnicare.dev | DemoPass123! |
| Patient | patient@omnicare.dev | DemoPass123! |

New patients can also self-register from `/register`. Staff accounts
(doctor/nurse/pharmacist/admin) are provisioned by an admin via
`POST /api/auth/staff/create/` — there's a real backend endpoint for this
but no dedicated frontend form yet (see `PROGRESS.md`).

## Running tests

```bash
cd backend
python manage.py test
```

940 lines across 8 test modules (`core`, `accounts`, `appointments`,
`billing`, `pharmacy`, `labs`, `ai_assistant`), covering RBAC/permission
enforcement, the appointment status state machine, Invoice's computed
financial properties, pharmacy stock-adjustment atomicity, lab critical-value
auto-flagging, and ARIA's urgent-detection + Gemini integration (the Gemini
API call itself is mocked at the client boundary — no test makes a real
network call, which is the correct way to test code wrapping a paid
external API, not a workaround). Same caveat as everything else in this
repo: written and cross-checked against the actual implementation, never
actually executed — `python manage.py test` needs a real Django + Postgres
environment this sandbox doesn't have.

## If something breaks on first run

It's the first time this code has ever executed — that's expected to
surface *something*. A few likely candidates, roughly in order of
likelihood:
- **CORS errors in the browser console** — double check
  `CORS_ALLOWED_ORIGINS` in `backend/.env` matches the exact origin the
  frontend is served from (including port).
- **Migration ordering** — if `makemigrations` complains about
  cross-app foreign keys (e.g. `patients` ↔ `doctors`), run
  `makemigrations` once per app in dependency order (`core`, `accounts`,
  `patients`, `doctors`, then the rest) rather than all at once.
- **ARIA replies with a generic fallback message** — means
  `GEMINI_API_KEY` isn't set or is invalid; check `backend/.env`.
- **401 loops / immediate logout** — check that your system clock is
  correct; JWT validation is time-sensitive.

Whatever you hit, it's genuinely useful information — the codebase has
never been debugged against a real running stack before, so this would be
the first real signal on what needs fixing.

## Architecture notes

- **RBAC** is enforced twice: in the frontend (hides nav items /
  routes a role shouldn't use) and — the part that actually matters for
  security — in the backend, where every viewset's `get_queryset()` scopes
  data by the requesting user's role, and permission classes gate
  writes. The frontend's `proxy.ts` route guard is UX only (redirects a
  logged-out user before a page flashes), not a security boundary.
- **ARIA** stores conversation history in Postgres (`ChatSession` /
  `ChatMessage`) and rebuilds a rolling array of the last 20 messages on
  every request to send to Gemini — no LangChain, no external memory
  service, no server-side session state on Google's end. See
  `backend/apps/ai_assistant/services.py`.
- **JWT refresh** rotates both tokens (`ROTATE_REFRESH_TOKENS` +
  `BLACKLIST_AFTER_ROTATION`), so the frontend's API client persists the
  *new* refresh token on every refresh, not just the new access token —
  reusing an old refresh token after rotation will fail by design.

## What's not built yet

Full detail (and an audit trail of what's been verified vs. assumed) is in
[`PROGRESS.md`](./PROGRESS.md). Headline gaps: no automated tests, a few
creation forms are missing on the frontend (staff account creation, invoice
creation, doctor/nurse entry forms for new diagnoses/lab results — viewing
these works, creating them from the UI doesn't yet), and nothing here has
been run end-to-end. Read that file before assuming something works.

## License

Not specified — this is a demonstration/reference build.
