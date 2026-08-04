import { useEffect, useRef } from "react";
import type { ChatMessage, Session } from "../types";
import MessageBubble from "./MessageBubble";
import ThreadNavigator from "./ThreadNavigator";
import { HistoryIcon } from "./icons";
import type { ReactNode } from "react";

interface Props {
  session: Session | null;
  messages: ChatMessage[];
  composer: ReactNode;
}

export default function ThreadView({ session, messages, composer }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const turnCount = messages.filter((m) => m.role === "assistant").length;

  return (
    <div data-testid="thread-view" className="relative flex h-full flex-1 flex-col">
      <header
        className="flex items-center justify-between border-b px-6 py-3.5"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h1 className="text-[15px] font-semibold text-[var(--text)]">
            {session?.name ?? "ResearchGPT"}
          </h1>
          <p className="text-xs text-[var(--text-faint)]">
            {turnCount > 0
              ? `${turnCount} exchange${turnCount === 1 ? "" : "s"}`
              : "New conversation"}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-6 pb-44">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((m, i) => (
              <div key={i} id={`thread-message-${i}`} className="scroll-mt-24">
                <MessageBubble message={m} />
              </div>
            ))
          )}
        </div>
      </div>

      <ThreadNavigator
        messages={messages}
        onJump={(index) =>
          document
            .getElementById(`thread-message-${index}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {composer}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center gap-3 py-24 text-center"
    >
      <HistoryIcon className="h-8 w-8 text-[var(--text-faint)]" />
      <h2 className="text-lg font-medium text-[var(--text)]">No threads yet</h2>
      <p className="text-sm text-[var(--text-muted)]">
        Ask something below to start your first one.
      </p>
      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { label: "Ask a paper", example: "What methodology does the paper use?" },
          { label: "Verify a claim", example: "Verify that RLHF outperforms SFT alone." },
          { label: "Search the web", example: "Latest developments in diffusion models?" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border px-3 py-2.5 text-left text-xs"
            style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
          >
            <p className="font-medium text-[var(--text)]">{s.label}</p>
            <p className="mt-0.5 text-[var(--text-faint)]">{s.example}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
