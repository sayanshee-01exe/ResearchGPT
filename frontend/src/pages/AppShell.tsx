import { useEffect, useRef, useState } from "react";
import {
  createSession,
  deleteSession,
  getSessionMessages,
  listSessions,
  streamBtw,
  streamChat,
} from "../api";
import ConfirmDialog from "../components/ConfirmDialog";
import Composer from "../components/Composer";
import type { SendOptions } from "../components/Composer";
import HistoryView from "../components/HistoryView";
import PlaceholderView from "../components/PlaceholderView";
import Sidebar from "../components/Sidebar";
import ThreadView from "../components/ThreadView";
import { applyTheme, getInitialTheme } from "../theme";
import type { Theme } from "../theme";
import type { ChatMessage, Session } from "../types";
import { PLACEHOLDER_VIEWS } from "../views";
import type { View } from "../views";

export default function AppShell() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [view, setView] = useState<View>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // StrictMode invokes mount effects twice in development. Without this guard
  // both runs saw an empty list and each created a session, leaving every new
  // account with a duplicate empty thread on the server.
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    (async () => {
      try {
        const existing = await listSessions();
        if (existing.length > 0) {
          setSessions(existing);
          const latest = existing[0];
          setActiveSessionId(latest.id);
          const msgs = await getSessionMessages(latest.id);
          setMessagesBySession({ [latest.id]: msgs });
        } else {
          const created = await createSession();
          setSessions([created]);
          setActiveSessionId(created.id);
          setMessagesBySession({ [created.id]: [] });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleNewChat = async () => {
    const created = await createSession();
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setMessagesBySession((prev) => ({ ...prev, [created.id]: [] }));
    setView("home");
  };

  const requestDelete = (session: Session) => {
    setDeleteError(null);
    setPendingDelete(session);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSession(pendingDelete.id);

      const remaining = sessions.filter((s) => s.id !== pendingDelete.id);
      setSessions(remaining);
      setMessagesBySession((prev) => {
        const next = { ...prev };
        delete next[pendingDelete.id];
        return next;
      });
      setPendingDelete(null);

      // Deleting the open thread leaves nothing selected, so fall back to the
      // next thread, or start a fresh one if that was the last.
      if (activeSessionId === pendingDelete.id) {
        if (remaining.length > 0) {
          await handleSelectSession(remaining[0].id);
        } else {
          const created = await createSession();
          setSessions([created]);
          setActiveSessionId(created.id);
          setMessagesBySession({ [created.id]: [] });
        }
      }
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectSession = async (id: string) => {
    setActiveSessionId(id);
    setView("home");
    if (!(id in messagesBySession)) {
      const msgs = await getSessionMessages(id);
      setMessagesBySession((prev) => ({ ...prev, [id]: msgs }));
    }
  };

  const appendMessage = (sessionId: string, message: ChatMessage) => {
    setMessagesBySession((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), message],
    }));
  };

  const updateLastMessage = (
    sessionId: string,
    updater: (m: ChatMessage, list: ChatMessage[]) => ChatMessage
  ) => {
    setMessagesBySession((prev) => {
      const list = prev[sessionId] ?? [];
      if (list.length === 0) return prev;
      const next = [...list];
      next[next.length - 1] = updater(next[next.length - 1], next);
      return { ...prev, [sessionId]: next };
    });
  };

  const handleSend = async (text: string, options: SendOptions = { deep: false, corpus: [] }) => {
    if (!activeSessionId) return;
    const sessionId = activeSessionId;
    const isBtw = text.toLowerCase().startsWith("/btw");

    appendMessage(sessionId, { role: "user", content: text, isBtw });
    appendMessage(sessionId, { role: "assistant", content: "", pending: true, isBtw });
    setIsStreaming(true);

    try {
      if (isBtw) {
        const query = text.slice(4).trim();
        if (!query) {
          updateLastMessage(sessionId, (m) => ({
            ...m,
            content: "Please add a question after `/btw`, e.g. `/btw What is attention?`",
            pending: false,
          }));
        } else {
          for await (const event of streamBtw(query)) {
            if (event.type === "token") {
              updateLastMessage(sessionId, (m) => ({ ...m, content: m.content + event.content }));
            } else {
              updateLastMessage(sessionId, (m) => ({ ...m, pending: false }));
            }
          }
        }
      } else {
        for await (const event of streamChat(sessionId, text, options)) {
          if (event.type === "stage") {
            updateLastMessage(sessionId, (m) => ({ ...m, stage: event.label }));
          } else if (event.type === "token") {
            updateLastMessage(sessionId, (m) => ({
              ...m,
              content: m.content + event.content,
              stage: undefined,
            }));
          } else {
            updateLastMessage(sessionId, (m, list) => ({
              ...m,
              content: event.answer ?? m.content,
              graph_state: event.graph_state,
              turn: list.filter((x) => x.role === "assistant").length,
              pending: false,
              stage: undefined,
            }));
            if (event.session_name) {
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === sessionId ? { ...s, name: event.session_name!, is_named: true } : s
                )
              );
            }
          }
        }
      }
    } catch (e) {
      updateLastMessage(sessionId, (m) => ({
        ...m,
        content: m.content || `Something went wrong: ${(e as Error).message}`,
        pending: false,
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const activeMessages = activeSessionId ? messagesBySession[activeSessionId] ?? [] : [];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-faint)]">
        Loading ResearchGPT…
      </div>
    );
  }

  return (
    <div
      data-testid="app-shell"
      className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]"
    >
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        view={view}
        collapsed={collapsed}
        theme={theme}
        onSelectSession={handleSelectSession}
        onDeleteSession={requestDelete}
        onNewChat={handleNewChat}
        onChangeView={setView}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      {view === "home" && (
        <ThreadView
          session={activeSession}
          messages={activeMessages}
          composer={
            <Composer
              sessionId={activeSessionId}
              onSend={handleSend}
              isStreaming={isStreaming}
            />
          }
        />
      )}
      {view === "history" && (
        <HistoryView
          sessions={sessions}
          onSelectSession={handleSelectSession}
          onDeleteSession={requestDelete}
        />
      )}
      {view in PLACEHOLDER_VIEWS && (
        <PlaceholderView
          title={PLACEHOLDER_VIEWS[view].title}
          body={PLACEHOLDER_VIEWS[view].body}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name}”?`}
          body="This permanently removes the thread, its conversation history, and every paper you loaded into it — including their embeddings in the vector database. This cannot be undone."
          confirmLabel="Delete thread"
          busy={deleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            if (deleting) return;
            setPendingDelete(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
