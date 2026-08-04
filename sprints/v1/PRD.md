# Sprint v1 — PRD: Auth, Landing Page & Consensus-Style UI

## Overview

Papeer currently opens straight into a chat UI with no accounts and a single global
`sessions.json` shared by everyone. This sprint puts a public landing page and a real
login in front of the app, scopes every chat session to its owner, and rebuilds the
app shell and message composer in the dark, rail-nav style of the reference screenshot
(Consensus-like: icon sidebar, Tools section, account row, floating composer with
attachment/mode/filter controls).

## Goals

- A visitor landing on `/` sees what Papeer is, how it works (3 steps), and its features — without logging in
- A user can sign up and log in with email + password; a JWT gates every `/api/*` route
- Each user sees only their own sessions and their own papers; cross-user access returns 403
- The logged-in app matches the reference UI: icon nav rail, Tools group, account row, upgrade card, centered empty state
- The composer is functional, not decorative: attachments popover, Corpus scope, Deep toggle, filter, and mic all change what the request does

## User Stories

- As a first-time visitor, I want to understand what Papeer does and how it works before signing up, so I can decide if it's worth an account
- As a researcher, I want my own account, so my uploaded papers and chat history stay private to me
- As a returning user, I want to log in and land on my previous threads, so I can pick up where I left off
- As a user, I want to attach papers directly from the composer, so I don't have to hunt through the sidebar mid-thought
- As a user, I want a "Deep" toggle, so I can trade speed for more thorough retrieval on hard questions
- As a user, I want to scope a question to specific loaded papers via Corpus, so answers aren't diluted by unrelated documents
- As a user, I want to dictate a question with the mic, so I can type less

## Technical Architecture

**Frontend**: React 19 + Vite 8 + Tailwind v4 (existing) + `react-router-dom` (new)
**Backend**: FastAPI (existing) + `bcrypt` + `PyJWT` (new)
> `passlib` was the original plan but is unmaintained and crashes against `bcrypt` 5.x; we call `bcrypt` directly and enforce its 72-byte password limit ourselves.
**User store**: `users.json`, same flat-file + `threading.Lock` pattern as `sessions.json`
**Vectors**: Qdrant, one collection per session (`papeer_{session_id}`) — unchanged
**Auth**: JWT (HS256) in `localStorage`, sent as `Authorization: Bearer <token>`

```
                    PUBLIC                          PROTECTED
  ┌──────────────────────────────┐   ┌────────────────────────────────────┐
  │  /          Landing          │   │  /app       AppShell               │
  │  /login     Login            │   │   ├── NavRail   (New Thread, Home, │
  │  /signup    Signup           │   │   │              Library, History) │
  └──────────────┬───────────────┘   │   ├── Tools     (Paper search,     │
                 │                   │   │              Citation graph)   │
                 │ token             │   ├── AccountRow + UpgradeCard     │
                 ▼                   │   ├── ThreadView (messages)        │
        ┌─────────────────┐          │   └── Composer                     │
        │  AuthContext    │──────────▶      (+ attach │ Corpus │ Deep     │
        │  localStorage   │  guard   │        │ Filter │ mic │ send)      │
        └────────┬────────┘          └──────────────────┬─────────────────┘
                 │ Authorization: Bearer                │
                 ▼                                      ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │  FastAPI  backend/api.py                                              │
  │   /api/auth/signup ─┐                                                 │
  │   /api/auth/login  ─┼──▶ auth.py: hash_password / verify / make_jwt   │
  │   /api/auth/me     ─┘         └──▶ users.py: users.json (locked)      │
  │                                                                       │
  │   /api/sessions*  ──▶ Depends(current_user) ──▶ owner check (403)     │
  │   /api/sessions/{id}/chat  ──▶ rag_graph  ──▶ vector_store.search(    │
  │                                   k = 4 (normal) | 12 (deep),         │
  │                                   title_filter = corpus selection )   │
  └───────────────────────────────────────────────────────────────────────┘
```

**Data flow — login**: Login form → `POST /api/auth/login` → verify bcrypt hash from
`users.json` → return JWT → store in `localStorage` → `AuthContext` sets user →
redirect to `/app` → `GET /api/sessions` (now filtered by `user_id`).

**Data flow — a Deep, corpus-scoped question**: Composer state `{ deep: true,
corpus: ["Attention Is All You Need"] }` → `POST /api/sessions/{id}/chat` body
`{ message, deep, corpus }` → `retrieve_from_vectorstore` uses `k=12` and a Qdrant
payload filter on `metadata.title` → SSE stream back to `ThreadView` as today.

**Composer control mapping** (how each screenshot control becomes real behavior):

| Control | Backing behavior |
|---|---|
| `+` attachments popover | Reuses existing `/documents/files`, `/documents/urls`, `/documents/arxiv` endpoints |
| Corpus dropdown | Lists papers from `/documents`; selection becomes a `metadata.title` filter on Qdrant search |
| Deep toggle | Raises retrieval `k` from 4 → 12 |
| Filter | Client-side thread/source filtering of the visible corpus list |
| Mic | Browser Web Speech API → transcript into the textarea (no backend, no audio upload) |

## Out of Scope (v2+)

- OAuth / Google sign-in, refresh tokens, password reset, email verification
- Rate limiting, CSRF hardening, token revocation, secure-cookie storage (v1 uses `localStorage`)
- A real database — `users.json` is a flat file and will not survive concurrent multi-process deploys
- Automated tests (unit, integration, E2E) — v2
- Billing. The "Claim your 7-day Pro trial" card is **static UI only**; no plans, no payments, no message quota
- **My Library** — nav item renders a placeholder page in v1. **History** is real (it lists the user's sessions)
- Paper search / Citation graph tools — nav entries render "Coming soon" placeholders
- Per-user Qdrant quota, storage limits, or cleanup of orphaned collections
- Migrating existing global sessions to specific users — they are assigned to a single `legacy` owner

## Dependencies

- Greenfield sprint for `sprints/` (no previous sprint) but **not** a greenfield codebase — builds on the existing `backend/api.py`, `backend/vector_store.py`, `backend/rag_graph.py`, and `frontend/src/{App,api,types}.tsx`
- Running Qdrant instance (`QDRANT_URL`, `QDRANT_API_KEY` in `.env`) — already required today
- `OPENAI_API_KEY`, `TAVILY_API_KEY` — already required today
- New env var: `JWT_SECRET` (app must fail loudly at startup if unset)

## Risks / Notes

- **Scope**: the full composer redesign is larger than a typical 10-task v1. It fits here only because every control maps to an endpoint or parameter that already exists. If Task 9 or 10 runs long, ship Tasks 1–8 and move composer wiring to v1.1.
- **`sessions.json` is not multi-user safe under load** — a flat file with a process-local lock. Acceptable for single-process `uvicorn`; must become a real DB before more than a handful of users.
- **`localStorage` JWTs are XSS-exposed.** Accepted for v1, flagged for v2 hardening.
