import type {
  AuthResponse,
  ChatMessage,
  ChatStreamEvent,
  DocResult,
  Session,
  User,
} from "./types";

const BASE = "/api";
const TOKEN_KEY = "papeer-token";

// ── Token storage ───────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Called when the server rejects our token, so AuthContext can bounce to /login. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** FastAPI reports errors as {detail: string}; fall back to raw text. */
async function errorMessage(res: Response): Promise<string> {
  const raw = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.detail === "string") return parsed.detail;
    if (Array.isArray(parsed?.detail) && parsed.detail[0]?.msg) {
      return String(parsed.detail[0].msg).replace(/^Value error,\s*/, "");
    }
  } catch {
    /* not JSON */
  }
  return raw || `Request failed: ${res.status}`;
}

async function handleUnauthorized(res: Response): Promise<void> {
  if (res.status !== 401) return;
  setToken(null);
  onUnauthorized?.();
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    await handleUnauthorized(res);
    throw new Error(await errorMessage(res));
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export function signup(email: string, name: string, password: string): Promise<AuthResponse> {
  return fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  }).then(json<AuthResponse>);
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(json<AuthResponse>);
}

export function getMe(): Promise<User> {
  return fetch(`${BASE}/auth/me`, { headers: authHeaders() }).then(json<User>);
}

// ── Sessions ────────────────────────────────────────────────────────────────

export function listSessions(): Promise<Session[]> {
  return fetch(`${BASE}/sessions`, { headers: authHeaders() }).then(json<Session[]>);
}

export function createSession(): Promise<Session> {
  return fetch(`${BASE}/sessions`, { method: "POST", headers: authHeaders() }).then(
    json<Session>
  );
}

export interface DeleteResult {
  id: string;
  vectors_deleted: boolean;
  checkpoints_deleted: boolean;
}

/** Deletes the thread along with its embeddings and its chat history. */
export function deleteSession(sessionId: string): Promise<DeleteResult> {
  return fetch(`${BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(json<DeleteResult>);
}

export function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  return fetch(`${BASE}/sessions/${sessionId}/messages`, { headers: authHeaders() }).then(
    json<ChatMessage[]>
  );
}

// ── Documents ───────────────────────────────────────────────────────────────

export function getDocuments(sessionId: string): Promise<string[]> {
  return fetch(`${BASE}/sessions/${sessionId}/documents`, { headers: authHeaders() }).then(
    json<string[]>
  );
}

export function uploadFiles(sessionId: string, files: File[]): Promise<DocResult[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  // No Content-Type here — the browser sets the multipart boundary itself.
  return fetch(`${BASE}/sessions/${sessionId}/documents/files`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  }).then(json<DocResult[]>);
}

export function loadUrls(sessionId: string, urls: string[]): Promise<DocResult[]> {
  return fetch(`${BASE}/sessions/${sessionId}/documents/urls`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ urls }),
  }).then(json<DocResult[]>);
}

export function loadArxiv(sessionId: string, query: string): Promise<DocResult> {
  return fetch(`${BASE}/sessions/${sessionId}/documents/arxiv`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ query }),
  }).then(json<DocResult>);
}

// ── Streaming ───────────────────────────────────────────────────────────────

async function* streamSSE(resPromise: Promise<Response>): AsyncGenerator<ChatStreamEvent> {
  const res = await resPromise;
  if (!res.ok || !res.body) {
    await handleUnauthorized(res);
    throw new Error(await errorMessage(res));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      yield JSON.parse(line.slice(6)) as ChatStreamEvent;
    }
  }
}

export interface ChatOptions {
  deep?: boolean;
  corpus?: string[];
}

export function streamChat(sessionId: string, message: string, options: ChatOptions = {}) {
  return streamSSE(
    fetch(`${BASE}/sessions/${sessionId}/chat`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        message,
        deep: options.deep ?? false,
        corpus: options.corpus ?? [],
      }),
    })
  );
}

export function streamBtw(message: string) {
  return streamSSE(
    fetch(`${BASE}/btw`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message }),
    })
  );
}
