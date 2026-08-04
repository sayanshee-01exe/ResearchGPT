import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Session } from "../types";
import type { View } from "../views";
import {
  BookmarkIcon,
  ChevronIcon,
  ExternalIcon,
  GraphIcon,
  HistoryIcon,
  HomeIcon,
  MoonIcon,
  PanelIcon,
  PlusIcon,
  SunIcon,
  TrashIcon,
} from "./icons";

interface Props {
  sessions: Session[];
  activeSessionId: string | null;
  view: View;
  collapsed: boolean;
  theme: "light" | "dark";
  onSelectSession: (id: string) => void;
  onDeleteSession: (session: Session) => void;
  onNewChat: () => void;
  onChangeView: (view: View) => void;
  onToggleCollapsed: () => void;
  onToggleTheme: () => void;
}

const NAV_ITEMS = [
  { view: "home" as const, testId: "nav-home", label: "Home", Icon: HomeIcon },
  { view: "library" as const, testId: "nav-library", label: "My Library", Icon: BookmarkIcon },
  { view: "history" as const, testId: "nav-history", label: "History", Icon: HistoryIcon },
];

const TOOL_ITEMS = [
  {
    view: "tool-citation-graph" as const,
    testId: "tool-citation-graph",
    label: "Citation Graph",
    Icon: GraphIcon,
  },
];

export default function Sidebar({
  sessions,
  activeSessionId,
  view,
  collapsed,
  theme,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onChangeView,
  onToggleCollapsed,
  onToggleTheme,
}: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const itemClass = (active: boolean) =>
    [
      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer",
      collapsed ? "justify-center" : "",
      active
        ? "bg-[var(--sidebar-active)] text-[var(--text)]"
        : "text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text)]",
    ].join(" ");

  return (
    <aside
      data-testid="sidebar"
      data-collapsed={collapsed}
      className={`flex h-full shrink-0 flex-col border-r transition-[width] duration-200 ${
        collapsed ? "w-[62px]" : "w-[240px]"
      }`}
      style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      {/* ── Brand + collapse ── */}
      <div
        className={`flex items-center px-3 pt-3 pb-2 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <span className="flex items-center gap-2 px-1 text-[15px] font-semibold tracking-tight text-[var(--text)]">
            📚 ResearchGPT
          </span>
        )}
        <button
          data-testid="sidebar-toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-faint)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text)]"
        >
          <PanelIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* ── New thread ── */}
      <div className="px-3 pb-1">
        <button
          data-testid="nav-new-thread"
          onClick={onNewChat}
          title="New Thread"
          className={`${itemClass(false)} font-medium text-[var(--text)]`}
        >
          <PlusIcon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>New Thread</span>}
        </button>
      </div>

      {/* ── Primary nav ── */}
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ view: target, testId, label, Icon }) => (
          <button
            key={testId}
            data-testid={testId}
            onClick={() => onChangeView(target)}
            title={label}
            className={itemClass(view === target)}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* ── Threads ── */}
      {!collapsed ? (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3">
          <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-[var(--text-faint)] uppercase">
            Threads
          </p>
          {sessions.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-[var(--text-faint)]">No threads yet</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} data-testid="thread-row" className="group relative">
                <button
                  data-testid="thread-item"
                  onClick={() => onSelectSession(session.id)}
                  title={session.name}
                  className={`${itemClass(
                    view === "home" && session.id === activeSessionId
                  )} truncate pr-8`}
                >
                  <span className="truncate">{session.name}</span>
                </button>
                <button
                  data-testid="thread-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session);
                  }}
                  aria-label={`Delete ${session.name}`}
                  title="Delete thread"
                  className="absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[var(--text-faint)] opacity-0 transition hover:bg-[var(--sidebar-active)] hover:text-[var(--danger)] group-hover:opacity-100 focus:opacity-100"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* ── Tools ── */}
      <div data-testid="tools-group" className="border-t border-[var(--sidebar-border)] px-3 py-3">
        {!collapsed && (
          <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-[var(--text-faint)] uppercase">
            Tools
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {TOOL_ITEMS.map(({ view: target, testId, label, Icon }) => (
            <button
              key={testId}
              data-testid={testId}
              onClick={() => onChangeView(target)}
              title={label}
              className={itemClass(view === target)}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
          <a
            href="https://langchain-ai.github.io/langgraph/"
            target="_blank"
            rel="noreferrer noopener"
            title="Learn"
            className={itemClass(false)}
          >
            <ExternalIcon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Learn</span>}
          </a>
        </div>
      </div>

      {/* ── Account ── */}
      <div ref={accountRef} className="relative border-t border-[var(--sidebar-border)] px-3 py-3">
        <button
          data-testid="account-row"
          onClick={() => setMenuOpen((open) => !open)}
          title={user?.name ?? "Account"}
          className={itemClass(false)}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-[var(--user-bubble-text)]">
            {(user?.name ?? "?").charAt(0).toUpperCase()}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">{user?.name}</span>
              <ChevronIcon className="h-4 w-4 shrink-0" />
            </>
          )}
        </button>

        {menuOpen && (
          <div
            data-testid="account-menu"
            className="absolute bottom-full left-3 z-20 mb-1 w-[200px] overflow-hidden rounded-xl border border-[var(--sidebar-border)] shadow-lg"
            style={{ background: "var(--sidebar-hover)" }}
          >
            <p className="truncate px-3 py-2 text-xs text-[var(--text-faint)]">{user?.email}</p>
            <button
              data-testid="theme-toggle"
              onClick={onToggleTheme}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-active)] hover:text-[var(--text)]"
            >
              {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              {theme === "dark" ? "Light theme" : "Dark theme"}
            </button>
            <button
              data-testid="logout-button"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-active)] hover:text-[var(--text)]"
            >
              Log out
            </button>
          </div>
        )}
      </div>

    </aside>
  );
}
