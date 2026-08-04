import { useEffect, useState } from "react";
import { getDocuments, loadArxiv, loadUrls, uploadFiles } from "../api";
import type { DocResult } from "../types";
import { ArxivIcon, CheckIcon, FileIcon, LinkIcon, SpinnerIcon, AlertIcon } from "./icons";

function StatusList({ results }: { results: DocResult[] }) {
  if (results.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {results.map((r, i) => (
        <li
          key={`${r.name}-${i}`}
          className="flex items-start gap-1.5 text-xs leading-snug"
          style={{ color: r.status === "ok" ? "var(--text-muted)" : "var(--danger)" }}
        >
          {r.status === "ok" ? (
            <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
          ) : (
            <AlertIcon className="mt-0.5 h-3 w-3 shrink-0" />
          )}
          <span className="truncate">
            {r.name}
            {r.error ? ` — ${r.error}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DocumentsPanel({ sessionId }: { sessionId: string }) {
  const [docs, setDocs] = useState<string[] | null>(null);
  const [docsError, setDocsError] = useState(false);

  const [fileResults, setFileResults] = useState<DocResult[]>([]);
  const [uploading, setUploading] = useState(false);

  const [urlInput, setUrlInput] = useState("");
  const [urlResults, setUrlResults] = useState<DocResult[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);

  const [arxivInput, setArxivInput] = useState("");
  const [arxivResults, setArxivResults] = useState<DocResult[]>([]);
  const [loadingArxiv, setLoadingArxiv] = useState(false);

  const refreshDocs = () => {
    getDocuments(sessionId)
      .then((titles) => {
        setDocs(titles);
        setDocsError(false);
      })
      .catch(() => setDocsError(true));
  };

  useEffect(() => {
    setDocs(null);
    setDocsError(false);
    setFileResults([]);
    setUrlResults([]);
    setArxivResults([]);
    setUrlInput("");
    setArxivInput("");
    refreshDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const results = await uploadFiles(sessionId, Array.from(fileList));
      setFileResults(results);
      refreshDocs();
    } catch (e) {
      setFileResults([{ name: "upload", status: "error", error: (e as Error).message }]);
    } finally {
      setUploading(false);
    }
  };

  const handleUrls = async () => {
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    setLoadingUrls(true);
    try {
      const results = await loadUrls(sessionId, urls);
      setUrlResults(results);
      refreshDocs();
    } catch (e) {
      setUrlResults([{ name: "urls", status: "error", error: (e as Error).message }]);
    } finally {
      setLoadingUrls(false);
    }
  };

  const handleArxiv = async () => {
    const q = arxivInput.trim();
    if (!q) return;
    setLoadingArxiv(true);
    try {
      const result = await loadArxiv(sessionId, q);
      setArxivResults([result]);
      refreshDocs();
    } catch (e) {
      setArxivResults([{ name: q, status: "error", error: (e as Error).message }]);
    } finally {
      setLoadingArxiv(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-3 py-4 text-sm">
      <Section icon={<FileIcon className="h-4 w-4" />} title="Upload files">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--sidebar-border)] px-3 py-4 text-center text-xs text-[var(--text-faint)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
          {uploading ? (
            <SpinnerIcon className="h-4 w-4" />
          ) : (
            <span>PDF, TXT, or Markdown — click or drop</span>
          )}
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.markdown"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
        <StatusList results={fileResults} />
      </Section>

      <Section icon={<LinkIcon className="h-4 w-4" />} title="Web pages">
        <textarea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com/paper&#10;one URL per line"
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-hover)] px-2.5 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleUrls}
          disabled={loadingUrls || !urlInput.trim()}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--sidebar-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--sidebar-active)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loadingUrls && <SpinnerIcon className="h-3.5 w-3.5" />}
          Load URLs
        </button>
        <StatusList results={urlResults} />
      </Section>

      <Section icon={<ArxivIcon className="h-4 w-4" />} title="ArXiv papers">
        <input
          value={arxivInput}
          onChange={(e) => setArxivInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleArxiv()}
          placeholder="1706.03762 or paper title"
          className="w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-hover)] px-2.5 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleArxiv}
          disabled={loadingArxiv || !arxivInput.trim()}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--sidebar-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--sidebar-active)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loadingArxiv && <SpinnerIcon className="h-3.5 w-3.5" />}
          Load ArXiv paper
        </button>
        <StatusList results={arxivResults} />
      </Section>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
          Loaded documents
        </p>
        {docsError && <p className="text-xs text-[var(--danger)]">Couldn't load documents.</p>}
        {!docsError && docs === null && <p className="text-xs text-[var(--text-faint)]">Loading…</p>}
        {!docsError && docs && docs.length === 0 && (
          <p className="text-xs text-[var(--text-faint)]">No documents loaded yet.</p>
        )}
        {!docsError && docs && docs.length > 0 && (
          <ul className="space-y-1.5">
            {docs.map((title) => (
              <li
                key={title}
                className="truncate rounded-md bg-[var(--sidebar-hover)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                title={title}
              >
                {title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}
