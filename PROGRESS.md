# OMNICARE — Build Progress Tracker

> **Read this file first whenever resuming work on this project.** It is the
> single source of truth for what exists, what's left, and how to pick up
> where things stopped. Trust this file over memory of earlier turns — see
> the note in §0 about why.

Last updated: 2026-07-01

---

## 0. Important context for whoever resumes this

This is being built inside a sandboxed container with **no internet access**
and no Django/Node packages pre-installed (confirmed: `pip3 list` shows
neither Django nor DRF installed; `bash_tool` network egress is disabled).
That means:

- Everything is **hand-written file by file**, never actually executed
  against a real Postgres DB, a real `npm install`, or the real Gemini API.
- Every `.py` file is syntax-checked with `python3 -m py_compile` after
  writing, and cross-file references (serializer/view class names, related
  names, imports) are checked with grep passes — but this is not the same as
  actually booting Django. Treat the backend as **logically complete, never
  executed.**
- **A previous pass through this project left a PROGRESS.md that marked
  nearly everything done when in fact most of it didn't exist on disk**
  (only `accounts` and `core` were real; 10 other apps were empty
  directories, and the frontend was 100% empty despite being marked mostly
  done). That discrepancy was caught by re-auditing the filesystem directly
  rather than trusting the file. **Lesson for future resumes: always verify
  a claim in this file against the actual filesystem (`find`, `wc -l`,
  `view`) before trusting it, especially after a long gap.** The legend
  below reflects what was actually verified on disk as of this update.
- **First thing to do once you have internet + a real machine:**
  `pip install -r backend/requirements.txt` (and `pip install -U` to get
  current patches), `python manage.py makemigrations && migrate`,
  `python manage.py seed_demo_data`, `python manage.py runserver`; separately
  `npm install` in `frontend/` and `npm run dev`. Fix whatever surfaces —
  there will inevitably be small issues that only show up on first real
  execution (a typo, an import order issue, a migration dependency, etc.).

## 1. Tech stack & pinned versions (researched live at build time)

| Layer | Choice | Version |
|---|---|---|
| Frontend framework | Next.js (App Router, Turbopack) | 16.2.x |
| UI library | React | 19.2.x |
| Styling | Tailwind CSS (CSS-first config, v4) | 4.3.x |
| Language | TypeScript | 5.x |
| Backend framework | Django | 6.0.6 |
| API layer | Django REST Framework | 3.17.1 |
| Auth | djangorestframework-simplejwt | 5.5.1 |
| DB driver | psycopg (v3) | 3.2.x |
| Database | PostgreSQL | 16+ (18 in docker-compose) |
| AI SDK | google-genai (official unified SDK) | >=1.20 |
| AI model | gemini-3.5-flash | switched from gemini-2.5-flash per user request, see note below |
| Node runtime | Node.js LTS | 22.x |

Note on Next.js 16: `middleware.ts` was renamed to **`proxy.ts`**.
Note on Gemini SDK: uses `from google import genai`, calling
`client.models.generate_content(model=..., contents=..., config=...)`
statelessly on every request — conversation history is reconstructed from
our own `ChatMessage` table each time (see §2). This is the stable,
documented-as-production-recommended API, as opposed to the newer beta
"Interactions API" which manages history server-side on Google's end — we
deliberately don't use that, since the spec calls for our own rolling
history array.
Note on the model switch: originally built to `gemini-2.5-flash` per the
initial spec. Later switched to `gemini-3.5-flash` per explicit user
request — confirmed via live search at the time to be Google's current,
GA (generally available) flash-tier model, not a preview/experimental one.
Changed in exactly two places (`config/settings.py`'s `GEMINI_MODEL`
default and `services.py`'s `MODEL_NAME` fallback, both just the default
for the `GEMINI_MODEL` env var) — the model string was never hardcoded
anywhere else, so this was a two-line change, not a refactor. The
env-var-with-a-default pattern means either version can be selected
without touching code, by setting `GEMINI_MODEL` in `backend/.env`.

## 2. Architecture decisions

- **Auth**: email is the username field. Patients self-register
  (`POST /api/auth/register/`). Staff accounts are admin-provisioned
  (`POST /api/auth/staff/create/`).
- **RBAC**: `User.role` + role-specific profile models (`PatientProfile`,
  `DoctorProfile`, `NurseProfile`, `PharmacistProfile`). Permission classes in
  `apps/core/permissions.py`. Queryset scoping happens in every viewset's
  `get_queryset()` — enforced in the ORM, not just hidden in the UI.
- **Routing**: all plain-CRUD viewsets are on one router in
  `backend/config/urls.py`. `accounts` and `ai_assistant` keep their own
  `urls.py`.
- **AI assistant (ARIA)**: `ChatSession` + `ChatMessage` persist history per
  user in Postgres (this is the "Django database" half of the spec's
  "cache or database" option — chosen over cache because chat history is a
  durable clinical/audit artifact, not ephemeral). `apps/ai_assistant/services.py`
  rebuilds a rolling `contents` array (last 20 messages) from those rows on
  every request and calls Gemini statelessly — no LangChain, no
  Google-side session state. Role-aware system instructions (patient vs.
  clinical staff get different tones/constraints — patients never get
  diagnosed or prescribed to by ARIA). A regex safety net independently flags
  urgent/emergency language (`is_urgent`) regardless of what the model says,
  surfaced to clinical staff via `GET /api/ai-assistant/urgent-flags/` and
  shown to patients with a crisis-resource notice appended. Clinical staff
  can pass `patient_context_id` to have a patient's chart (allergies, recent
  diagnoses, vitals, prescriptions) injected as grounding context for one
  turn — this is what "summarize this patient's record" uses.
- **Labs app** wasn't in the original app list drafted early on — added as
  `apps.labs` (`LabTestRequest` -> `LabResult` -> `LabResultParameter`, with
  per-parameter critical-value auto-flagging by comparing against a
  reference range) since the spec calls for a full Lab Results module.

## 3. Status by module — verified against the filesystem, not assumed

Legend: DONE = verified present & compiles · PARTIAL = partial · TODO = not started

### Backend (Django + DRF) — omnicare/backend/
All 12 apps below have models.py, serializers.py, views.py, admin.py,
apps.py, migrations/__init__.py; whole tree passes
`python3 -m py_compile` with zero errors (4,193 lines total).

- DONE `config` — settings (env-driven DB/JWT/CORS/Gemini/throttling), central
  router wiring every viewset, manage.py
- DONE `core` — TimeStampedModel, role permission classes, pagination,
  uniform exception handler
- DONE `accounts` — custom User, JWT login/refresh/logout, patient
  self-register, admin staff-provisioning, /me, password change, user
  directory + activate/deactivate
- DONE `patients` — profile CRUD, admit/discharge workflow, patient-ID
  auto-generation, role-scoped queryset
- DONE `doctors` — profile CRUD, DoctorAvailability (weekly recurring),
  DoctorShift (dated shift assignments), combined /schedule/ endpoint
- DONE `nurses`, `pharmacists` — profile CRUD
- DONE `appointments` — full CRUD, explicit status state-machine
  (Scheduled->Confirmed->In Progress->Completed, with Cancel/No-show branches),
  auto department inheritance from doctor
- DONE `medical_records` — MedicalRecord, Allergy, VitalSign (+
  is_critical threshold check and a /live_feed/ endpoint for the
  real-time vitals widget)
- DONE `prescriptions` — Prescription + PrescriptionItem, dispense action
  atomically decrements pharmacy stock via Medicine.adjust_stock()
  (select_for_update-locked) and writes an audit StockTransaction
- DONE `pharmacy` — Medicine inventory with low-stock/expiry-soon
  properties, StockTransaction audit trail
- DONE `billing` — Invoice/InvoiceItem (computed subtotal/tax/total as
  properties, not stored, so they can't drift), payment recording,
  InsuranceClaim submission/status workflow, /financial_summary/
  reporting endpoint (6-month revenue trend)
- DONE `labs` — LabTestRequest -> LabResult -> LabResultParameter with
  auto critical-value flagging, request status workflow, /critical/
  endpoint for unreviewed critical results
- DONE `ai_assistant` — see §2. services.py, views.py (sessions, chat,
  urgent-flags feed), throttled at endpoint level (ai_chat scope)
- DONE Django admin registered for every model (all search_fields/
  autocomplete_fields cross-checked so autocomplete_fields actually
  resolves)
- DONE `seed_demo_data` management command — one user per role (see §5) plus
  4 doctors, 5 patients (2 admitted), appointments across every status,
  allergies, vitals (including one critical set), medical records,
  10 pharmacy items (3 intentionally low-stock), 2 prescriptions, 2 invoices
  + 1 insurance claim, 3 lab requests (1 completed with a flagged critical
  CBC value)
- DONE requirements.txt
- DONE **Automated test suite** — 940 lines across 8 modules
  (`core`, `accounts`, `appointments`, `billing`, `pharmacy`, `labs`,
  `ai_assistant`) plus a shared `apps/core/test_utils.py` fixture helper.
  Covers RBAC/permission enforcement (the highest-value thing to test in a
  system like this), the appointment status state machine, Invoice's
  computed properties, pharmacy stock-adjustment atomicity, lab
  critical-value auto-flagging, and ARIA (Gemini mocked at the client
  boundary — `AriaService._client` is pre-set to a `MagicMock` before the
  test runs, so the real SDK code around it still executes normally except
  for the actual network call — no test here ever makes a real API call).
  **Caught one genuine cross-stack bug before ever running anything:**
  writing the labs test forced a re-check of `LabResultViewSet`'s actual
  permission class rather than trusting memory, which revealed
  `IsAdminOrClinicalStaff` (admin/doctor/**nurse**) allows doctors to enter
  lab results — but the frontend's `canEnterResult` check had excluded
  doctors, an unnecessary restriction the backend never actually imposed.
  Fixed both the test (which would otherwise have asserted the wrong thing)
  and the frontend check. This is exactly the kind of bug a real test run
  is supposed to surface — it just happened to surface during writing
  instead, because writing a correct assertion required verifying the real
  permission first.
- TODO Actual migrations (makemigrations needs a real Django install — can't
  run here, see §0)
- TODO File-upload flow exercised end-to-end (fields exist and the frontend
  now has upload UI for both — MedicalRecord.attachment, LabResult.attachment
  — but untested without a running server)
- TODO Notifications (email/in-app) — never was an explicit spec item, just
  a speculative "nice to have" noted early on; not prioritized since it
  wasn't actually requested

### Frontend (Next.js + Tailwind) — omnicare/frontend/
DONE — 43 files, 5,304 lines. Verified with the same rigor as the backend:
brace/bracket balance checked, then the entire tree run through
`tsc --noEmit --skipLibCheck` against the project's real tsconfig.json
(so path aliases like `@/lib/...` are actually resolved, not just
guessed) — zero real syntax/parse errors. One genuine (non-noise) type bug
was caught this way and fixed: `DataTable`'s generic was constrained to
`T extends Record<string, unknown>`, which specific interfaces like
`Appointment` don't structurally satisfy in strict mode — loosened the
constraint and moved dynamic property access behind two small internal
cast helpers instead. Remaining tsc output (~1200 lines) is 100% explained
by node_modules not being installed in this sandbox (TS2307 module not
found, and its knock-on implicit-`any` cascades) — spot-checked a sample
of every distinct error message to confirm none of it is a second real bug
hiding in the noise.

Every field/endpoint used by the frontend was cross-checked against the
actual backend serializer/view source (not memory) before being typed in
`lib/types.ts` — this caught several would-have-been-wrong guesses
(`appointment_id`/`patient_code` not what was assumed, per-item
prescription dispensing not per-prescription, `Medicine.sku`/`dosage_form`,
etc.). `lib/types.ts` is the ground-truth contract; if a serializer changes,
update it there.

- DONE Scaffold: package.json (Next 16.2.9, React 19.2.0, Tailwind 4.3),
  next.config.ts, tsconfig.json (path alias `@/*` → `src/*`),
  postcss.config.mjs, globals.css (Tailwind v4 `@theme` tokens for the
  navy/teal brand palette, EKG keyframes), .env.example, .gitignore
- DONE `lib/` — `types.ts` (every DTO), `api-client.ts` (fetch wrapper,
  auto-refresh-on-401 with concurrent-refresh deduping, typed `ApiError`),
  `auth-context.tsx`, `toast-context.tsx`, `cookies.ts` (documented
  plain-cookie-vs-httpOnly tradeoff), `constants.ts` (nav/status maps),
  `useServerTable.ts` (debounced search + server-side filter/sort/paginate
  hook), `useFetch.ts` (single-endpoint fetch hook)
- DONE `src/proxy.ts` — Next.js 16's renamed middleware; verified via
  fresh search (not memory) that it lives at `src/proxy.ts` when using a
  `src/` layout, not project root — an earlier assumption from an older
  note in this file was wrong and would have been silently inert
- DONE Root layout with self-hosted `next/font/google` (Space Grotesk /
  Inter / JetBrains Mono — swapped in over the CSS `@import` approach used
  in the live-preview artifact, since this is a real Next.js build that
  can self-host fonts properly)
- DONE `/login`, `/register` — real forms against `/api/auth/login/` and
  `/api/auth/register/`
- DONE Dashboard shell: `Sidebar` (role-aware nav, mobile drawer),
  `TopBar`, `PulseChip`/`EKGTrace` (signature element, same design as the
  preview), auth guard + redirect
- DONE `AriaWidget` — floating chat, calls the **real**
  `POST /api/ai-assistant/chat/` endpoint (this is the one place that was
  simulated in the live-preview artifact and is now genuinely wired)
- DONE All 5 role dashboards, each fetching real data: `AdminDashboard`
  (patient/appointment stats, financial summary, revenue chart, status
  mix), `DoctorDashboard` (today's schedule via `/appointments/today/`,
  lab stats), `NurseDashboard` (admission stats, critical lab flags),
  `PharmacistDashboard` (low-stock, prescription queue), `PatientDashboard`
  (own upcoming appointment, balance, allergies). `VitalsMonitor` polls the
  real `/api/vitals/live_feed/` endpoint every 20s. `RecentAppointmentsFeed`
  is an honest note-worthy design choice: there's no dedicated
  activity-log endpoint in the backend, so "recent activity" is
  synthesized from real recent-appointment data rather than faked — a true
  cross-module activity log would need a new backend endpoint (noted as a
  gap, not hidden).
- DONE `DataTable` + `useServerTable` — real server-side search
  (debounced), filter, sort, and pagination hitting DRF's actual
  `?search=&ordering=&page=` query params, not client-side array filtering
  (deliberately different from the live-preview artifact, which had to
  filter an in-memory mock array since it has no backend to call)
- DONE 7 full module pages, all real: **Patients** (table + add-patient
  modal via `/auth/register/` + detail view), **Appointments** (table +
  booking modal + real `/transition/` and `/cancel/` actions),
  **Scheduling** (doctor picker + real `/schedule/` availability/shifts),
  **EMR** (patient picker + real `/patient-chart/<id>/` — records,
  allergies, vitals — **plus a working "Add Record" form**, doctor/admin
  only, posting to `/medical-records/`), **Billing** (invoices + real
  `/record_payment/` + insurance claims + financial stats for admin,
  **plus a working "New Invoice" form** with dynamic line items), **Pharmacy**
  (inventory table + real per-item `/dispense-item/` dispensing queue,
  **plus full Add/Edit Medicine, remove-from-inventory, Adjust Stock, and
  New Prescription forms** — see §7 for why these were added later than
  everything else), **Lab Results** (requests table + critical-value-flagged result detail
  modal, **plus a working "Request Test" form** for doctors and a
  **result-entry form** with dynamic parameter rows for admin/nurse,
  posting to `/lab-results/`)
- DONE **File uploads** — EMR's "Add Record" form and the Lab Result entry
  form both support attaching a file. Worth documenting the design
  decision: `LabResult` has a nested writable `parameters` array, and DRF
  nested-writable-serializer + multipart-file-upload together in one
  request is a genuine, well-known awkward combination (multipart form
  fields can't carry a real nested array the way a JSON body can) — so lab
  result entry is a **two-step submission**: POST the result as JSON first
  (parameters included, no file), then PATCH just the `attachment` field
  via multipart if a file was chosen. EMR's record form doesn't have this
  problem (no nested arrays) so it's a single multipart POST.
- DONE **Doctor Scheduling management** (admin) — was previously
  view-only despite "shift management" being an explicit spec requirement.
  Added: an availability editor (toggle each weekday + set start/end time,
  diffed against existing slots so it PATCHes what exists and POSTs what's
  new rather than blindly recreating everything) and an "Add Shift" form.
- DONE **Appointment rescheduling** — closes a gap I found myself while
  re-checking against the original spec (which explicitly asked for
  "book, reschedule, cancel"): status advancement and cancellation existed,
  but changing an existing appointment's date/time didn't. Added a
  "Reschedule" action (admin/doctor/nurse only, matching the backend's
  `CanManageAppointments = role_permission("admin", "doctor", "nurse")` —
  patients can cancel their own booking but not unilaterally reschedule)
  that PATCHes `scheduled_start`/`scheduled_end` directly, since those
  fields were already writable on the backend serializer — no backend
  change needed, just the missing frontend action.
- **Real bug caught and fixed this round:** `Object.entries(recordForm).forEach(([key, value]) => form.append(key, value))`
  in the EMR form failed TypeScript's strict-mode check against
  `FormData.append`'s actual overload signatures (`value`'s inferred type
  didn't cleanly satisfy `string | Blob`). This was **not** missing-
  node_modules noise like the vast majority of tsc output in this project —
  it was a real type error that would have blocked `next build` with type
  checking enabled. Fixed with an explicit `String(value)` coercion.
  Re-confirms the value of running the real compiler after every batch of
  changes instead of assuming a pattern that "looks fine" is fine.
- DONE `/dashboard/aria` — capabilities summary + real
  `/ai-assistant/urgent-flags/` feed for staff
- DONE **Accessibility pass** on shared components (fixes propagate
  everywhere they're used, which is the point of doing this at the
  component level rather than page by page): `Modal` now has real dialog
  semantics (`role="dialog"`, `aria-modal`, `aria-labelledby`), Escape-to-
  close, initial focus + a minimal Tab focus trap, and focus restoration
  to whatever triggered it on close — none of that existed before. Toast
  notifications are now an `aria-live="polite"` region. Sidebar nav marks
  the active route with `aria-current="page"`, not just color. DataTable's
  sortable headers expose `aria-sort`, pagination buttons have accessible
  names. ARIA's chat log is `role="log"`/`aria-live`, its input and send
  button have real labels instead of relying on an icon and a placeholder.
  Added a skip-to-main-content link. Confirmed (already present, not
  newly added) `prefers-reduced-motion` support in `globals.css`. This is
  a real pass on the highest-leverage shared primitives, not a claim of
  full WCAG conformance — an exhaustive page-by-page contrast/labeling
  audit (especially the pervasive `text-slate-400` usage for secondary
  text, which is borderline-to-failing on WCAG AA contrast in several
  places) hasn't been done.
- TODO Never run: no `npm install`, no `next dev`/`next build`, no browser
  ever rendered this. Static verification only (see above) — same caveat
  as the backend.
- TODO Automated tests (frontend has none — no Jest/Vitest/RTL added;
  backend does, see below), a full exhaustive accessibility/contrast audit
  (a real pass was done on shared components, see above — this TODO is
  specifically about the page-by-page work that pass didn't cover), dark
  mode (not requested but a common ask)

### Live preview
DONE `omnicare/live-preview/omnicare-live-preview.jsx` (also shared directly as a
Claude artifact each session) — single-file React app, ~1,840 lines, verified
with `python3 -m py_compile`-equivalent rigor for JS: brace/paren/bracket
balance checked programmatically, every JSX component/icon reference
cross-checked against imports, and the whole file run through
`tsc --noEmit --jsx react-jsx --allowJs --skipLibCheck` as a real parser —
zero syntax/parse errors (only expected type-inference noise from missing
`.d.ts` files, which is irrelevant here). Also caught and fixed mid-build:
several Tailwind arbitrary-value classes (`text-[11px]`, `h-[560px]`,
`z-[100]`, etc.) that would silently not render in this environment (no JIT
compiler, only the pre-built default utility stylesheet) — converted to
standard classes or inline `style` props.

Covers: full login screen with instant role-switch (all 5 roles), responsive
navy/teal sidebar + topbar with the animated EKG pulse chip signature
element, all 5 role-specific dashboards (distinct stats/charts/activity per
role), a live-jittering vitals monitor widget, Patients (searchable/
sortable/paginated table + add modal), Appointments (status stepper,
booking modal), Doctor Scheduling (weekly availability + shifts), EMR
(diagnosis history/treatment plan/allergies/documents), Billing & Insurance
(invoices/claims/financial stats), Pharmacy (inventory + prescription
dispensing queue, tabbed), Lab Results (requests + critical-value-flagged
result detail), and a floating ARIA chat widget with simulated
role-aware/urgent-flagged responses. Toasts, loading skeletons, and empty
states are wired throughout.

Honest caveat (stated to the user, and stating it here too): all data in
this preview is mock/client-side, including ARIA's replies (keyword-matched
canned responses, not a real Gemini call) — there's no live backend wired to
it. It's a UX/design-fidelity preview, not the real system with real data.
**As of this update this is no longer true of the real frontend above** —
the real frontend's ARIA widget calls the actual Gemini-backed endpoint,
and every module hits the real (unexecuted-but-verified) Django API.

**Bug fixed post-launch:** the login screen originally used an HTML
`<form onSubmit={...}>`, which this artifact environment doesn't support
(needs plain `onClick` handlers) — this silently broke the submit button
entirely. A user caught it ("the login button is not even pressing").
Fixed by removing the `<form>` and making role cards log in directly on
click. Lesson: this environment's constraints (documented in the system
prompt, e.g. no `<form>` tags) need to be actively checked against, not
just generally kept in mind — re-read them before building anything
interactive here again.

### Docs / ops
- DONE `README.md` — setup instructions for both frontend and backend,
  demo credentials, architecture notes, a "what breaks on first run"
  troubleshooting section written honestly (since nothing has actually
  been run yet, this is informed guessing about likely first-boot issues,
  not confirmed fixes)
- DONE `docker-compose.yml` — **PostgreSQL only, deliberately.** Backend
  and frontend are not containerized: writing Dockerfiles for them that
  have never been built or run would be adding untested surface area for
  uncertain benefit. Validated as syntactically correct YAML (via
  `pyyaml`, since Docker itself isn't installed in this sandbox either) —
  not validated as an actually-working container.
- DONE `setup.sh` — automates the manual Quick Start steps end to end
  (start Postgres via Docker if available, backend venv + install +
  migrate + optional demo seed, frontend install), safe to re-run, falls
  back to sensible defaults if stdin isn't interactive. Syntax-checked with
  `bash -n` (bash is genuinely available in this sandbox, unlike
  Django/Node) — but like everything else, never actually executed
  end-to-end. This is explicitly framed in the script's own header comment
  and in the README, not just here, so whoever runs it knows what they're
  actually testing.
- DONE `backend/.env.example`, `frontend/.env.example`, root `.gitignore`
- TODO CI/CD config, production deployment docs (Vercel/hosting for
  frontend, ASGI server + reverse proxy for backend)

## 4. How to resume

1. Read this file top to bottom.
2. **Verify, don't trust**: run `find omnicare -type f -name "*.py" | wc -l`
   and spot-check a file or two against what this file claims before
   continuing, especially if resuming after a long gap — see §0.
3. Pick the first TODO item in §3 that matters most to the user.
4. omnicare/backend and omnicare/frontend are the source trees (also
   zipped in chat outputs once that step is reached). Follow the existing
   per-app pattern (models.py -> serializers.py -> views.py -> register on
   the router) for any new backend module.
5. Update §3 as you go, and keep it honest — only mark DONE after
   confirming it's actually on disk and (where possible) compiles/type-checks.

## 5. Localization pass — Igbo names, Naira currency, Southeast Nigeria locations

Applied across every layer, with one consistent name/place mapping so the
same demo person has the same name everywhere (backend seed data, live
preview mockup, and any place a frontend form has example placeholder
text):

- **Names**: all mock/demo people (doctors, nurses, pharmacist, patients,
  admin) now use real Igbo names — e.g. Dr. Ngozi Eze, Dr. Chukwuemeka
  Nwosu, Amaka Nwachukwu, Kelechi Ibe, Chukwudi Okoye, Amara Okafor (this
  one was already correct before this pass, so it stayed). No two mock
  people share a first name, to keep the demo data legible.
- **Currency**: every `$` in both the live preview and the real frontend
  (12 instances found via a systematic grep, not a guess — StatCards,
  invoice tables, medicine prices, consultation fees, payment modals) is
  now `₦`. Amounts were rescaled to plausible Naira magnitudes for Nigerian
  private healthcare pricing (e.g. consultation fees ₦12,000–₦22,000,
  medicine unit prices ₦150–₦8,500, monthly hospital revenue in the tens
  of millions) — these are reasonable representative figures, not a
  precise currency-conversion exercise against a specific exchange rate.
  Several displays were upgraded from `.toFixed(2)` to
  `.toLocaleString()`-based formatting while doing this, since the larger
  Naira figures read poorly without comma grouping.
- **Places**: patient addresses are real Southeast Nigeria locations
  across the five core Igbo states (Abia, Anambra, Ebonyi, Enugu, Imo) —
  e.g. Ogui Road and Okpara Avenue in Enugu, Douglas Road in Owerri, New
  Market Road in Onitsha, Aba Road in Umuahia. Insurance/HMO providers
  changed from US names (BlueCross Shield, Aetna) to real Nigerian HMOs
  (Hygeia HMO, Avon Healthcare). Phone numbers use Nigerian `+234` format.
  The hospital itself is now grounded in Enugu (login footer, seed script
  header).
- **Scope note**: this did NOT touch medical terminology, drug names,
  department/specialty names (Cardiology, Emergency, etc.), or model
  field/choice values (blood group codes, appointment status enum values,
  etc.) — those are administrative/clinical categories, not people/places/
  currency, and changing them wasn't requested or appropriate.
- Verified with the same rigor as every other round: brace balance, full
  TypeScript parse (zero real syntax errors), and an explicit grep sweep
  confirming zero old names or `$` symbols remained anywhere in either the
  live preview or the frontend source before considering this done.

## 6. AI vendor de-branding (user-facing only)

Per explicit request: nothing a **user** of the deployed system sees should
reveal that ARIA is built on Google Gemini specifically, or name any
underlying AI model.

- **What changed**: the ARIA chat widget header and the `/dashboard/aria`
  info page (both in the real frontend and the live preview) previously
  read "Gemini 2.5 Flash · Healthcare Assistant" / "Powered by Google
  Gemini 2.5 Flash..." — now read "OMNICARE Intelligence · Healthcare
  Assistant" / "Built directly into OMNICARE...". The live preview's
  canned fallback message also named Gemini directly; now says "our AI
  engine."
- **What deliberately did NOT change**: the actual backend implementation
  in `apps/ai_assistant/services.py` still genuinely calls the real Gemini
  API — ripping that out would break the feature entirely and contradicts
  the original spec. Environment variable names (`GEMINI_API_KEY`,
  `GEMINI_MODEL`), code comments, and setup docs (README.md, this file)
  still accurately describe the real implementation, because those are
  developer-facing, not user-facing — a maintainer genuinely needs to know
  to get a key from Google AI Studio. The distinction that matters here is
  presentation layer vs. implementation, not "hide it everywhere."
- **Verified clean**: confirmed via grep that zero user-facing strings
  (widget copy, page subtitles, any serialized API response body) mention
  "Gemini" or "Google" anywhere in either codebase — the only remaining
  "google" hit anywhere is the Google Fonts CDN URL used to load
  typefaces, which is an unrelated, invisible technical detail.

## 7. Pharmacy CRUD parity fix + a credential that wasn't what it looked like

**Pharmacy was inconsistent with every other module** — Appointments,
Billing, EMR, Labs, and Scheduling all got real create/edit UI across
earlier rounds; Pharmacy only ever got inventory *viewing* + dispensing.
Not a design choice, just a genuine gap: the backend (`MedicineViewSet`
with `CanManageInventory = role_permission("admin", "pharmacist")`,
`PrescriptionViewSet` with `CanPrescribe = role_permission("admin",
"doctor")`) always supported full CRUD; the frontend never got the forms
built. Fixed now:

- **Add / Edit Medicine** (admin, pharmacist) — full form. One real
  design detail worth recording: `stock_quantity` is `read_only` on
  `MedicineSerializer` by design (every stock change needs an audit-trail
  `StockTransaction`), so creating a medicine with an initial quantity is
  two API calls — `POST /medicines/` (starts at 0), then
  `POST /medicines/<id>/adjust-stock/` if a non-zero initial quantity was
  given — not one call with a `stock_quantity` field that would've
  silently been ignored.
- **Remove from inventory** — deliberately a `PATCH` toggling `is_active`,
  not `DELETE`. Checked first: there's no custom `destroy()` override on
  `MedicineViewSet`, so calling the delete endpoint would hard-remove the
  row and could orphan `StockTransaction`/`PrescriptionItem` history that
  references it. `is_active` exists on the model specifically to avoid
  that — the frontend now uses the safe path instead of the destructive
  one the backend would technically still allow.
- **Adjust Stock** as its own explicit action (not folded into edit) —
  restocking a shipment or writing off expired/damaged stock is a
  meaningfully different, auditable operation from editing a medicine's
  metadata.
- **New Prescription** (admin, doctor) — dynamic medication rows. When a
  doctor creates it, `doctor` is deliberately omitted from the payload
  (checked `perform_create`: the backend force-assigns the logged-in
  doctor's own profile regardless of what's sent) — only admins get a
  doctor picker, since for them it's genuinely ambiguous which doctor a
  prescription is "from."

**A user pasted a string claiming it was their Gemini API key — and my first
call on it was wrong.** Real Gemini Developer API keys had always started
with `AIzaSy...`; this one started with `AQ.`, which didn't match that
pattern, so I declined to add it, on the theory it was more likely a
Google OAuth/session token than an API key.

The user pushed back with a specific, checkable claim: they'd gotten it
directly from aistudio.google.com/apikey. That's a real, verifiable
detail, not just "trust me" — worth taking seriously rather than repeating
the same answer. Searched rather than assumed my prior knowledge was still
current, and it wasn't: **Google rolled out a new API key format — "Auth
keys," prefixed `AQ.Ab` — starting around June 2026**, after this
project's knowledge cutoff. The old `AIza...` "Standard" keys are being
phased out entirely (unrestricted ones rejected from June 19 2026, all of
them by September 2026). The user's key matched the new format exactly.
So: correct to have checked the format at all, wrong about what the
mismatch meant, because the ground truth had changed after training data
was fixed. Said so directly rather than quietly complying once corrected.

One more thing surfaced in that same search worth recording: multiple
current reports describe `AQ.` keys failing specifically in older SDK
versions and third-party wrappers that hard-validate against the old
`AIza` shape, even though the native Gemini endpoint itself doesn't care
about key-prefix format. This project's `requirements.txt` had
`google-genai>=1.20.0` — a floor set before this transition — so it was
bumped to `>=2.8.0` (current) specifically to reduce the chance of hitting
that failure mode. The real key is now in `backend/.env` (gitignored,
included in the delivered zip since it's this user's own project copy) —
but per the standing rule for this whole project: this has not been
executed, so "should work now" is a real, improved, better-verified
statement, not a confirmed one. If ARIA still returns its fallback
message with this key in place, the SDK version is the first thing to
check, in a real running environment.

## 8. Closing a gap in the AI de-branding itself

While drafting guidance for running this in Antigravity, re-checked
whether anything actually stopped ARIA from just honestly answering "yes,
I'm built on Gemini" if a user asked directly — and nothing did. The
system instructions (§6) established ARIA's identity and role, but never
addressed that specific question, and Gemini has no inherent reason to
withhold that information unless told to. Added a
`MODEL_PRIVACY_INSTRUCTION`, appended to every role's prompt in
`services.py`: if asked what model/vendor powers it, ARIA deflects to "I'm
OMNICARE's AI assistant" without confirming, denying, or speculating —
briefly and without being cagey about it. Deliberately does NOT instruct
it to deny being an AI at all, or lie about its capabilities — only to
keep the specific vendor/model out of the conversation, same as a lot of
products don't disclose their specific infrastructure providers. This is
the same presentation-vs-implementation line drawn in §6: the UI already
didn't show "Gemini" anywhere; this closes the matching gap in what the
model itself will say if asked, so the de-branding holds up under direct
questioning, not just passive UI copy.

## 9. Demo credentials (after running seed_demo_data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@omnicare.dev | DemoPass123! |
| Doctor | doctor@omnicare.dev | DemoPass123! |
| Nurse | nurse@omnicare.dev | DemoPass123! |
| Pharmacist | pharmacist@omnicare.dev | DemoPass123! |
| Patient | patient@omnicare.dev | DemoPass123! |

(Additional doctors/nurses/patients are also seeded — see
seed_demo_data.py — all share the same password.)
