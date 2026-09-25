#!/usr/bin/env bash
# OMNICARE setup — automates the steps from README.md's Quick Start.
# Safe to re-run: skips/reuses what already exists instead of erroring.
#
# This has never been executed (same caveat as the rest of the repo — no
# real environment to run it in while writing it). Written carefully and
# defensively, but treat the first run of *this script* as a first run too.
#
# Usage: ./setup.sh   (or: bash setup.sh)

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

info() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$1"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

ask_yes_no() {
  # ask_yes_no "question" default_answer(y/n) -> sets $REPLY_YES to 0 or 1
  local prompt="$1" default="${2:-y}" answer
  if [ "$default" = "y" ]; then prompt="$prompt [Y/n] "; else prompt="$prompt [y/N] "; fi
  if [ ! -t 0 ]; then
    # No interactive terminal (e.g. piped input) — fall back to the default
    # rather than hanging on a read that will never get input.
    REPLY_YES=$([ "$default" = "y" ] && echo 0 || echo 1)
    return
  fi
  read -r -p "$prompt" answer || true
  answer="${answer:-$default}"
  case "$answer" in
    [Yy]*) REPLY_YES=0 ;;
    *) REPLY_YES=1 ;;
  esac
}

echo "════════════════════════════════════════════════════════"
echo "  OMNICARE setup"
echo "════════════════════════════════════════════════════════"
echo "This prepares the backend and frontend to run locally. It does not"
echo "start any long-running dev server — you'll run those yourself at the end."
echo

# ---------------------------------------------------------------------------
# 1. Database
# ---------------------------------------------------------------------------
info "Step 1/4 — Database"
COMPOSE_CMD=""
if command_exists docker; then
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif command_exists docker-compose; then
    COMPOSE_CMD="docker-compose"
  fi
fi

if [ -n "$COMPOSE_CMD" ]; then
  ask_yes_no "Docker found. Start PostgreSQL via '$COMPOSE_CMD up -d' now?" y
  if [ "$REPLY_YES" -eq 0 ]; then
    (cd "$ROOT_DIR" && $COMPOSE_CMD up -d) && ok "Postgres starting (container: omnicare-db)." \
      || fail "docker compose failed — check Docker is actually running, then retry manually: $COMPOSE_CMD up -d"
  else
    warn "Skipping. Make sure a Postgres matching backend/.env.example is reachable before migrating."
  fi
else
  warn "Docker not found. Set up PostgreSQL manually — see the 'Option B' instructions in README.md."
fi

# ---------------------------------------------------------------------------
# 2. Backend
# ---------------------------------------------------------------------------
info "Step 2/4 — Backend (Django)"
if ! command_exists python3; then
  fail "python3 not found — install Python 3.12+ and re-run this script."
  exit 1
fi

cd "$BACKEND_DIR"

if [ ! -d venv ]; then
  python3 -m venv venv && ok "Created venv/"
else
  ok "venv/ already exists, reusing it"
fi

# shellcheck disable=SC1091
source venv/bin/activate

pip install --upgrade pip >/dev/null
if pip install -r requirements.txt; then
  ok "Backend dependencies installed"
else
  fail "pip install failed — check the error above. Common cause: psycopg needs PostgreSQL dev headers on some OSes (see psycopg docs for your platform)."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  warn "Created backend/.env from .env.example — edit it now and set GEMINI_API_KEY before ARIA will actually respond."
else
  ok "backend/.env already exists, leaving it alone"
fi

info "Running migrations..."
if python manage.py makemigrations && python manage.py migrate; then
  ok "Migrations applied"
else
  fail "Migrations failed — almost always a database connectivity issue at this point. Check backend/.env's DB_* values and that Postgres is actually reachable (docker ps, or psql -h localhost -U omnicare_user -d omnicare)."
  exit 1
fi

ask_yes_no "Seed demo data (5 demo accounts + sample patients/appointments/etc.)?" y
if [ "$REPLY_YES" -eq 0 ]; then
  python manage.py seed_demo_data && ok "Demo data seeded — see README.md for the login table."
fi

deactivate

# ---------------------------------------------------------------------------
# 3. Frontend
# ---------------------------------------------------------------------------
info "Step 3/4 — Frontend (Next.js)"
if ! command_exists npm; then
  fail "npm not found — install Node.js 22+ and re-run this script."
  exit 1
fi

cd "$FRONTEND_DIR"

if npm install; then
  ok "Frontend dependencies installed"
else
  fail "npm install failed — check the error above."
  exit 1
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  ok "Created frontend/.env.local from .env.example (defaults to http://localhost:8000/api)"
else
  ok "frontend/.env.local already exists, leaving it alone"
fi

# ---------------------------------------------------------------------------
# 4. Done
# ---------------------------------------------------------------------------
info "Step 4/4 — Done"
echo
echo "To run the app, open two terminals:"
echo
echo "  Terminal 1 (backend):"
echo "    cd backend && source venv/bin/activate && python manage.py runserver"
echo
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm run dev"
echo
echo "Then visit http://localhost:3000 — see README.md for demo login credentials."
echo
echo "This script has never been run end-to-end before (see the note at the"
echo "top of this file) — if anything above failed, that's genuinely useful"
echo "signal, not necessarily something you did wrong."
