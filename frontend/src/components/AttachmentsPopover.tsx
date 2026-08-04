import { useRef, useState } from "react";
import { loadArxiv, loadUrls, uploadFiles } from "../api";
import { useDismissable } from "../hooks/useDismissable";
import type { DocResult } from "../types";
import { ArxivIcon, FileIcon, LinkIcon, SpinnerIcon } from "./icons";

type Mode = "menu" | "url" | "arxiv";

interface Props {
  sessionId: string | null;
  onClose: () => void;
  onLoaded: () => void;
}

/** Turn API results into one human-readable status line. */
function describe(results: DocResult[]): string {
  const ok = results.filter((r) => r.status === "ok");
  const failed = results.filter((r) => r.status !== "ok");
  const parts: string[] = [];
  if (ok.length) parts.push(`Added ${ok.map((r) => r.name).join(", ")}`);
  for (const f of failed) parts.push(`${f.name}: ${f.error ?? "failed"}`);
  return parts.join(" · ");
}

export default function AttachmentsPopover({ sessionId, onClose, onLoaded }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useDismissable(true, ref, onClose);

  const run = async (work: () => Promise<DocResult[]>) => {
    if (!sessionId) return;
    setBusy(true);
    setStatus(null);
    try {
      const results = await work();
      setStatus(describe(results));
      if (results.some((r) => r.status === "ok")) onLoaded();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const itemClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm " +
    "text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]";

  return (
    <div
      ref={ref}
      data-testid="attachments-popover"
      className="absolute bottom-full left-0 z-30 mb-2 w-[290px] rounded-xl border p-2 shadow-xl"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
    >
      {mode === "menu" && (
        <>
          <p className="px-3 pt-1 pb-2 text-[11px] font-medium tracking-wide text-[var(--text-faint)] uppercase">
            Add sources
          </p>
          <button
            data-testid="attach-upload"
            className={itemClass}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileIcon className="h-4 w-4 shrink-0" />
            Upload papers (PDF, TXT, MD)
          </button>
          <button data-testid="attach-url" className={itemClass} onClick={() => setMode("url")}>
            <LinkIcon className="h-4 w-4 shrink-0" />
            Import from URL
          </button>
          <button data-testid="attach-arxiv" className={itemClass} onClick={() => setMode("arxiv")}>
            <ArxivIcon className="h-4 w-4 shrink-0" />
            Search arXiv
          </button>
          <input
            ref={fileInputRef}
            data-testid="file-input"
            type="file"
            multiple
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length && sessionId) run(() => uploadFiles(sessionId, files));
              e.target.value = "";
            }}
          />
        </>
      )}

      {mode !== "menu" && (
        <div className="p-1">
          <button
            onClick={() => {
              setMode("menu");
              setValue("");
            }}
            className="mb-2 cursor-pointer text-xs text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            ← Back
          </button>
          <input
            data-testid={mode === "url" ? "url-input" : "arxiv-input"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "url" ? "https://arxiv.org/abs/1706.03762" : "2303.08774"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            data-testid={mode === "url" ? "url-submit" : "arxiv-submit"}
            disabled={!value.trim() || busy || !sessionId}
            onClick={() =>
              run(async () =>
                mode === "url"
                  ? loadUrls(sessionId!, [value.trim()])
                  : [await loadArxiv(sessionId!, value.trim())]
              )
            }
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--user-bubble-text)] transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />}
            {busy ? "Loading…" : "Add"}
          </button>
        </div>
      )}

      {status && (
        <p
          data-testid="attach-status"
          className="mt-2 max-h-24 overflow-y-auto rounded-lg bg-[var(--bg-sunken)] px-3 py-2 text-xs break-words text-[var(--text-muted)]"
        >
          {status}
        </p>
      )}
    </div>
  );
}
