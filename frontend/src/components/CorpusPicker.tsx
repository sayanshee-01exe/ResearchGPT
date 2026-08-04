import { useEffect, useRef, useState } from "react";
import { getDocuments } from "../api";
import { useDismissable } from "../hooks/useDismissable";
import { CheckIcon } from "./icons";

interface Props {
  sessionId: string | null;
  selected: string[];
  filterQuery: string;
  onChange: (titles: string[]) => void;
  onClose: () => void;
  reloadKey: number;
}

export default function CorpusPicker({
  sessionId,
  selected,
  filterQuery,
  onChange,
  onClose,
  reloadKey,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [papers, setPapers] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useDismissable(true, ref, onClose);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getDocuments(sessionId)
      .then((titles) => {
        if (!cancelled) setPapers(titles);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, reloadKey]);

  const query = filterQuery.trim().toLowerCase();
  const visible = query
    ? papers?.filter((title) => title.toLowerCase().includes(query))
    : papers;

  const toggle = (title: string) => {
    onChange(
      selected.includes(title) ? selected.filter((t) => t !== title) : [...selected, title]
    );
  };

  return (
    <div
      ref={ref}
      data-testid="corpus-picker"
      className="absolute bottom-full left-0 z-30 mb-2 w-[300px] rounded-xl border p-2 shadow-xl"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
    >
      <div className="flex items-center justify-between px-3 pt-1 pb-2">
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-faint)] uppercase">
          Corpus
        </p>
        {selected.length > 0 && (
          <button
            data-testid="corpus-clear"
            onClick={() => onChange([])}
            className="cursor-pointer text-xs text-[var(--accent)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="px-3 pb-2 text-xs text-[var(--danger)]">{error}</p>}

      {papers === null && !error && (
        <p className="px-3 pb-2 text-xs text-[var(--text-faint)]">Loading papers…</p>
      )}

      {papers?.length === 0 && (
        <p className="px-3 pb-2 text-xs leading-relaxed text-[var(--text-faint)]">
          No papers loaded in this thread yet. Add one with the + button and it will show up here.
        </p>
      )}

      {visible?.length === 0 && papers && papers.length > 0 && (
        <p className="px-3 pb-2 text-xs text-[var(--text-faint)]">
          No papers match “{filterQuery}”.
        </p>
      )}

      <div className="max-h-56 overflow-y-auto">
        {visible?.map((title) => {
          const active = selected.includes(title);
          return (
            <button
              key={title}
              data-testid="corpus-option"
              onClick={() => toggle(title)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]"
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--accent)" : "transparent",
                }}
              >
                {active && <CheckIcon className="h-3 w-3 text-[var(--user-bubble-text)]" />}
              </span>
              <span className="truncate">{title}</span>
            </button>
          );
        })}
      </div>

      {papers && papers.length > 0 && (
        <p className="px-3 pt-2 text-[11px] text-[var(--text-faint)]">
          {selected.length === 0
            ? "Searching all papers in this thread."
            : `Searching ${selected.length} selected paper${selected.length === 1 ? "" : "s"}.`}
        </p>
      )}
    </div>
  );
}
