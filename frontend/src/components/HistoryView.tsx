import type { Session } from "../types";
import { HistoryIcon, TrashIcon } from "./icons";

interface Props {
  sessions: Session[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (session: Session) => void;
}

export default function HistoryView({ sessions, onSelectSession, onDeleteSession }: Props) {
  return (
    <div data-testid="history-view" className="flex h-full flex-1 flex-col">
      <header className="border-b px-6 py-3.5" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-[15px] font-semibold text-[var(--text)]">History</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <HistoryIcon className="h-8 w-8 text-[var(--text-faint)]" />
            <h2 className="text-lg font-medium text-[var(--text)]">No threads yet</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Start a thread and it will show up here.
            </p>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-3xl flex-col gap-2">
            {sessions.map((session) => (
              <li key={session.id} className="relative">
                <button
                  data-testid="history-item"
                  onClick={() => onSelectSession(session.id)}
                  className="w-full cursor-pointer rounded-xl border px-4 py-3 pr-14 text-left transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
                >
                  <p className="truncate text-sm font-medium text-[var(--text)]">{session.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                    {new Date(session.created_at).toLocaleString()}
                  </p>
                </button>
                <button
                  data-testid="history-delete"
                  onClick={() => onDeleteSession(session)}
                  aria-label={`Delete ${session.name}`}
                  title="Delete thread"
                  className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[var(--text-faint)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--danger)]"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
