import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface Props {
  testId: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthCard({ testId, title, subtitle, children, footer }: Props) {
  return (
    <main
      data-testid={testId}
      className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[var(--bg)] px-5 py-12 text-[var(--text)]"
    >
      <div className="w-full max-w-sm">
        <Link
          data-testid="auth-brand"
          to="/"
          className="mx-auto mb-8 flex items-center justify-center gap-2 text-lg font-semibold tracking-tight"
        >
          📚 ResearchGPT
        </Link>

        <div
          data-testid="auth-card"
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-7 shadow-sm"
        >
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">{footer}</p>
      </div>
    </main>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-[var(--text-faint)]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm " +
  "outline-none transition placeholder:text-[var(--text-faint)] " +
  "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export const submitClass =
  "w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium " +
  "text-[var(--user-bubble-text)] transition hover:bg-[var(--accent-strong)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function ErrorMessage({ testId, children }: { testId: string; children: ReactNode }) {
  return (
    <p
      data-testid={testId}
      role="alert"
      className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
    >
      {children}
    </p>
  );
}
