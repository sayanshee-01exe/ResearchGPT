# Sprint v1 — Tasks

## Status: Complete — 11/11 tasks (2026-08-04)

**Verification:** 108 backend tests (pytest) + 53 E2E tests (Playwright, 5 specs) all passing.
`npx tsc -b` clean, `vite build` succeeds, semgrep clean on all source.
Run with `uv run python -m pytest tests/unit tests/integration` and `npx playwright test`.

- [x] Task 1: Project setup — install auth + routing deps and wire `JWT_SECRET` (P0)
  - Acceptance: `uv run uvicorn backend.api:app` starts clean; `npm run dev` starts clean; app raises a clear error at import if `JWT_SECRET` is missing
  - Sub-tasks:
    - ~~`uv add "passlib[bcrypt]" pyjwt python-multipart`~~ → `uv add bcrypt pyjwt` (see note)
    - `cd frontend && npm i react-router-dom`
    - Add `JWT_SECRET` to `.env`; read it in a new `backend/config.py` with a loud `RuntimeError` if absent
  - Files: pyproject.toml, frontend/package.json, .env, backend/config.py, tests/unit/test_config.py
  - Completed: 2026-08-04 — `backend/config.py` validates `JWT_SECRET` at import (non-empty, ≥32 chars) with a remediation message; a 64-char secret was generated into `.env`. `python-multipart` was already a dependency.
    - Tests: 6 unit (`tests/unit/test_config.py`), all passing. Verified `backend.api` imports clean (9 API routes) and Vite dev server returns HTTP 200.
    - **Deviation — passlib dropped for bcrypt:** `passlib` 1.7.4 (unmaintained since 2020) raises `ValueError: password cannot be longer than 72 bytes` during backend detection against `bcrypt` 5.0.0. Using `bcrypt` directly instead — same algorithm, one less dead dependency. **Task 2 must enforce the 72-byte password limit explicitly**, since passlib is no longer doing it.
    - **Security:** semgrep clean on all new code. `npm audit` is *not* clean and cannot be — see accepted risk below.

### Accepted risk: react-router advisory

No version of `react-router` is advisory-free. `6.0.0–7.17.0` carries 14 advisories (turbo-stream RCE, multiple XSS, open redirects, DoS); `7.12.0–8.2.0` carries the RSC-mode CSRF bypass ([GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)). Pinned to **7.18.2**, the minimum-exposure choice: all 14 older advisories fixed, and the remaining one requires RSC mode / server actions, which a client-only Vite SPA served as static files by FastAPI does not use. Re-check for a patched release each sprint; `npm audit` will report 2 high until one ships.

- [x] Task 2: Build the user store and password/JWT helpers (P0)
  - Acceptance: `create_user`, `get_user_by_email`, `hash_password`, `verify_password`, `make_token`, `decode_token` all work from a Python REPL; passwords are bcrypt hashes, never plaintext; `users.json` writes are lock-guarded like `sessions.json`
  - Sub-tasks:
    - `backend/users.py` — `users.json` load/save behind a `threading.Lock`, record shape `{id, email, name, password_hash, created_at}`
    - `backend/auth.py` — passlib hashing + HS256 encode/decode with `sub` and `exp` (7-day expiry)
  - Files: backend/users.py, backend/auth.py
  - Completed: 2026-08-04 — `backend/auth.py` (bcrypt + HS256 JWT) and `backend/users.py` (locked `users.json`). Enforces bcrypt's 72-byte limit explicitly, since passlib is no longer doing it. Tokens pin `algorithms=[HS256]`, which is what rejects `alg:none`.
    - Tests: 20 unit, passing.

- [x] Task 3: Add auth endpoints and the `current_user` dependency (P0)
  - Acceptance: signup returns a token and rejects duplicate emails with 409; login returns a token and rejects bad credentials with 401; `GET /api/auth/me` returns the user without `password_hash`; a missing/invalid bearer token gives 401
  - Sub-tasks:
    - `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me` with Pydantic request models
    - `get_current_user()` FastAPI dependency that parses the `Authorization` header
  - Files: backend/api.py
  - Completed: 2026-08-04 — `/api/auth/signup|login|me` plus a `get_current_user` dependency. Login returns one message for both unknown-email and wrong-password so it cannot be used to enumerate accounts. Over-length passwords give 422/401, never a 500.
    - Tests: 17 integration, passing.

- [x] Task 4: Scope sessions and documents to the owning user (P0)
  - Acceptance: two users each see only their own sessions from `GET /api/sessions`; requesting another user's session id returns 403; pre-existing sessions in `sessions.json` are tagged `user_id: "legacy"` on first load and are invisible to normal users
  - Sub-tasks:
    - Add `user_id` to the session record in `create_session`; backfill `"legacy"` in `load_sessions`
    - Add `Depends(get_current_user)` to all `/api/sessions*` routes and filter the list
    - Extract a `_require_owned_session(session_id, user)` helper and use it in chat + all three document routes
  - Files: backend/api.py
  - Completed: 2026-08-04 — Every `/api/sessions*` route and `/api/btw` now require auth; `_require_owned_session` returns 404 for unknown and 403 for someone else's. Pre-auth sessions are tagged `user_id: "legacy"` on load and are invisible to real users.
    - Tests: 15 integration, passing.

- [x] Task 5: Add routing, `AuthContext`, and authenticated fetches on the frontend (P0)
  - Acceptance: `/`, `/login`, `/signup` render publicly; `/app` redirects to `/login` when there is no token; every `api.ts` call sends `Authorization: Bearer <token>`; a 401 response clears the token and bounces to `/login`
  - Sub-tasks:
    - `main.tsx` — `BrowserRouter` with the four routes; move current `App.tsx` content to `pages/AppShell.tsx`
    - `context/AuthContext.tsx` — token in `localStorage`, `login`/`signup`/`logout`, `user` from `/api/auth/me`
    - `components/ProtectedRoute.tsx`; add an auth header helper to `api.ts` (including the SSE chat call)
  - Files: frontend/src/main.tsx, frontend/src/context/AuthContext.tsx, frontend/src/components/ProtectedRoute.tsx, frontend/src/api.ts, frontend/src/pages/AppShell.tsx
  - Completed: 2026-08-04 — `BrowserRouter` with `/`, `/login`, `/signup`, `/app`; `AuthContext` holds the token in `localStorage`; `ProtectedRoute` waits for `/auth/me` before redirecting. A 401 anywhere clears the token and drops to logged-out. Added `SPAStaticFiles` so deep links survive a refresh in production, and `PAPEER_USERS_FILE`/`PAPEER_SESSIONS_FILE` so E2E never touches real data.
    - Tests: 8 E2E, passing.

- [x] Task 6: Build the public landing page (P0)
  - Acceptance: `/` renders hero + "How it works" + features + CTA on the dark theme, is responsive at 375px and 1440px, and its CTAs route to `/signup` and `/login`
  - Sub-tasks:
    - Hero: product name, one-line pitch, "Get started" / "Log in" buttons
    - "How it works" — 3 numbered steps (Upload papers → Ask questions → Verify claims against live research)
    - Feature grid from the README: Paper Q&A, Claim Verification, Web Search, `/btw` side-channel, multi-session, ArXiv/URL/PDF loading
  - Files: frontend/src/pages/Landing.tsx, frontend/src/index.css
  - Completed: 2026-08-04 — Hero, 3-step how-it-works, 6-card feature grid, closing CTA, footer. Responsive at 375px and 1440px, verified in both themes.
    - Tests: 9 E2E, passing.

- [x] Task 7: Build the login and signup pages (P0)
  - Acceptance: both forms validate email format and a non-empty password, disable the submit button while in flight, show server errors inline (e.g. "Email already registered"), and redirect to `/app` on success
  - Sub-tasks:
    - Shared `AuthCard` layout matching the landing page's dark styling
    - `Login.tsx` and `Signup.tsx` wired to `AuthContext`
  - Files: frontend/src/pages/Login.tsx, frontend/src/pages/Signup.tsx, frontend/src/components/AuthCard.tsx
  - Completed: 2026-08-04 — Shared `AuthCard` + `PasswordInput` with a show/hide toggle, and `validation.ts` mirroring the server's rules so users hear about problems before the round trip.
    - Tests: 10 E2E, passing.

- [x] Task 8: Rebuild the app shell in the reference nav-rail style (P1)
  - Acceptance: sidebar shows New Thread, Home, My Library, History, a Tools group, the user's name in an account row with a working Logout, and the static upgrade card; the sidebar collapses to icons via the toggle; empty state reads "No threads yet"
  - Sub-tasks:
    - Rewrite `Sidebar.tsx` as the collapsible rail with nav + Tools + account row + upgrade card
    - Centered empty state and thread list styling in the main pane
    - Placeholder pages for My Library / Paper search / Citation graph; History lists the user's sessions
  - Files: frontend/src/components/Sidebar.tsx, frontend/src/pages/AppShell.tsx, frontend/src/components/icons.tsx
  - Completed: 2026-08-04 — `Sidebar` rebuilt as the nav rail: New Thread, Home, My Library, History, a Tools group, account row with a working logout, and the static upgrade card. Collapses to icons. `ThreadView` / `HistoryView` / `PlaceholderView` split out; `ChatPanel.tsx` deleted.
    - Tests: 12 E2E, passing.

- [x] Task 9: Build the floating composer with its controls (P1)
  - Acceptance: composer floats over the thread pane with a `+` attachments popover (Upload papers / Import by URL / ArXiv), a Corpus dropdown listing this session's loaded papers with checkboxes, a Deep toggle, a Filter control, a mic button, and send; every control has a visible active state and the popover closes on outside click and Escape
  - Sub-tasks:
    - `Composer.tsx` shell with textarea auto-resize and Enter-to-send / Shift+Enter-newline
    - Attachments popover reusing `uploadFiles` / `loadUrls` / `loadArxiv` from `api.ts`
    - Corpus dropdown fed by `getDocuments(sessionId)`; Deep + Filter toggles as local state
    - Mic via Web Speech API, appending the transcript into the textarea, hidden when unsupported
  - Files: frontend/src/components/Composer.tsx, frontend/src/components/AttachmentsPopover.tsx, frontend/src/components/CorpusPicker.tsx
  - Completed: 2026-08-04 — `Composer` floats over the thread with attachments popover (upload / URL / arXiv), Corpus multi-select, Deep toggle, Filter panel, mic, and send. Popovers close on outside click and Escape via a shared `useDismissable` hook. Mic uses the Web Speech API — audio never reaches our server.
    - Tests: 14 E2E, passing.

- [x] Task 10: Make Deep and Corpus actually change retrieval, then polish (P1)
  - Acceptance: sending with Deep on retrieves 12 chunks instead of 4 (verifiable in the Graph State viewer's `retrieved_docs`); selecting one paper in Corpus returns only chunks whose `metadata.title` matches; both default to off/all when omitted, so existing behavior is unchanged
  - Sub-tasks:
    - Extend `ChatRequest` with `deep: bool = False` and `corpus: list[str] = []`; thread both into the graph's input state
    - `vector_store.search(...)` gains an optional `titles` filter (Qdrant payload filter) and `k` comes from the deep flag in `retrieve_from_vectorstore`
    - (P2) Polish pass: loading skeletons, error toasts, and a 375px-width check across landing, login, and app shell
  - Files: backend/api.py, backend/vector_store.py, backend/rag_graph.py, frontend/src/api.ts, frontend/src/types.ts
  - Completed: 2026-08-04 — `deep` and `corpus` flow from the composer through `ChatRequest` into `RAGState` and the retrieval tool. Deep raises k from 4 to 12; Corpus becomes a Qdrant `metadata.title` filter. Both default to off/all, so existing behaviour is byte-for-byte unchanged when omitted.
    - Tests: 12 unit + integration, passing.

---

## Discovered During Sprint (not in the original 10)

- [x] Task 11: Restrict URL loading to http/https and block internal addresses (P1) — **pre-existing, found by semgrep in Task 1**
  - Problem: `backend/paper_loader.py` passes user-supplied URLs straight to `urllib.request.urlopen` at lines 62, 73, and 84. `urllib` honors `file://`, so `POST /api/sessions/{id}/documents/urls` can read arbitrary local files (e.g. `file:///Users/.../.env`) and reach internal network addresses (SSRF). Task 3's auth reduces the blast radius to authenticated users but does not close it.
  - Acceptance: non-`http(s)` schemes are rejected with a 400; requests to loopback, link-local, and private ranges are refused; redirects are re-validated against the same rules; a regression test covers `file:///etc/passwd` and `http://169.254.169.254/`
  - Files: backend/paper_loader.py, backend/api.py, tests/unit/test_paper_loader.py
  - Note: not fixed in Task 1 per the "note bugs, don't fix them inline" rule. Do this before any deployment reachable from outside localhost.
