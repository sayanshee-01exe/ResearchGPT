import { useEffect, useRef } from "react";

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        data-testid="delete-dialog"
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border p-5 shadow-xl"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
      >
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>

        {error && (
          <p
            data-testid="delete-error"
            role="alert"
            className="mt-3 rounded-lg border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            data-testid="delete-cancel"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm text-[var(--text)] transition-colors hover:bg-[var(--bg-sunken)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            data-testid="delete-confirm"
            onClick={onConfirm}
            disabled={busy}
            className="cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--danger)" }}
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
