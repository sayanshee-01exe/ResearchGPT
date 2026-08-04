import { useRef, useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import AttachmentsPopover from "./AttachmentsPopover";
import CorpusPicker from "./CorpusPicker";
import { FilterIcon, LayersIcon, MicIcon, PlusIcon, SendIcon, SparkleIcon, TerminalIcon } from "./icons";

export interface SendOptions {
  deep: boolean;
  corpus: string[];
}

interface Props {
  sessionId: string | null;
  onSend: (text: string, options: SendOptions) => void;
  isStreaming: boolean;
}

type Panel = "attachments" | "corpus" | "filter" | null;

export default function Composer({ sessionId, onSend, isStreaming }: Props) {
  const [input, setInput] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [deep, setDeep] = useState(false);
  const [corpus, setCorpus] = useState<string[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [documentsVersion, setDocumentsVersion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { supported: micSupported, listening, toggle: toggleMic } = useSpeechRecognition((text) =>
    setInput((current) => (current ? `${current} ${text}` : text))
  );

  const isBtw = input.trim().toLowerCase().startsWith("/btw");

  const submit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    onSend(text, { deep, corpus });
    setInput("");
    setPanel(null);
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  };

  const togglePanel = (next: Panel) => setPanel((current) => (current === next ? null : next));

  const chipClass = (active: boolean) =>
    [
      "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition-colors",
      active
        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
        : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]",
    ].join(" ");

  return (
    <div
      data-testid="composer"
      className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-4 sm:px-6 sm:pb-5"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl">
        <div
          className="rounded-2xl border px-3 py-2.5 shadow-lg transition-colors"
          style={{
            borderColor: isBtw ? "var(--accent)" : "var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {/* ── Input ── */}
          <div className="flex items-end gap-2">
            {isBtw && <TerminalIcon className="mb-2 h-4 w-4 shrink-0 text-[var(--accent)]" />}
            <textarea
              ref={textareaRef}
              data-testid="composer-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Ask the research…"
              className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[0.95rem] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />
          </div>

          {/* ── Controls ── */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <div className="relative">
              <button
                data-testid="attach-button"
                onClick={() => togglePanel("attachments")}
                aria-label="Add attachments"
                data-active={panel === "attachments"}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
              {panel === "attachments" && (
                <AttachmentsPopover
                  sessionId={sessionId}
                  onClose={() => setPanel(null)}
                  onLoaded={() => setDocumentsVersion((v) => v + 1)}
                />
              )}
            </div>

            <div className="relative">
              <button
                data-testid="corpus-button"
                onClick={() => togglePanel("corpus")}
                data-active={corpus.length > 0}
                className={chipClass(corpus.length > 0)}
              >
                <LayersIcon className="h-3.5 w-3.5" />
                Corpus
                {corpus.length > 0 && (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-semibold text-[var(--user-bubble-text)]">
                    {corpus.length}
                  </span>
                )}
              </button>
              {panel === "corpus" && (
                <CorpusPicker
                  sessionId={sessionId}
                  selected={corpus}
                  filterQuery={filterQuery}
                  onChange={setCorpus}
                  onClose={() => setPanel(null)}
                  reloadKey={documentsVersion}
                />
              )}
            </div>

            <button
              data-testid="deep-toggle"
              onClick={() => setDeep((d) => !d)}
              data-active={deep}
              title="Retrieve more context before answering"
              className={chipClass(deep)}
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              Deep
            </button>

            <div className="relative ml-auto flex items-center gap-1.5">
              <button
                data-testid="filter-button"
                onClick={() => togglePanel("filter")}
                data-active={filterQuery.length > 0}
                className={chipClass(filterQuery.length > 0)}
              >
                <FilterIcon className="h-3.5 w-3.5" />
                Filter
              </button>
              {panel === "filter" && (
                <div
                  data-testid="filter-panel"
                  className="absolute right-0 bottom-full z-30 mb-2 w-[260px] rounded-xl border p-3 shadow-xl"
                  style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
                >
                  <p className="pb-2 text-[11px] font-medium tracking-wide text-[var(--text-faint)] uppercase">
                    Filter papers
                  </p>
                  <input
                    data-testid="filter-input"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Title contains…"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-faint)]">
                    Narrows the list shown in the Corpus picker.
                  </p>
                </div>
              )}

              {micSupported && (
                <button
                  data-testid="mic-button"
                  onClick={toggleMic}
                  data-active={listening}
                  aria-label={listening ? "Stop dictation" : "Start dictation"}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    listening
                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <MicIcon className="h-4 w-4" />
                </button>
              )}

              <button
                data-testid="composer-send"
                onClick={submit}
                disabled={!input.trim() || isStreaming}
                aria-label="Send message"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                style={{ background: "var(--accent)", color: "var(--sidebar)" }}
              >
                <SendIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-[var(--text-faint)]">
          Prefix with <code className="rounded bg-[var(--bg-sunken)] px-1 py-0.5">/btw</code> for
          off-topic questions — these aren't saved to your thread.
        </p>
      </div>
    </div>
  );
}
