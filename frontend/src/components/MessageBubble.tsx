import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../types";
import GraphStateViewer from "./GraphStateViewer";
import { TerminalIcon } from "./icons";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          {message.isBtw && (
            <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
              <TerminalIcon className="h-3 w-3" /> Side channel · not saved
            </span>
          )}
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[0.95rem] leading-relaxed whitespace-pre-wrap"
            style={{ background: "var(--user-bubble)", color: "var(--user-bubble-text)" }}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="max-w-[85%] w-full">
        <div
          className={`rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 prose-chat ${
            message.pending && !message.content ? "text-[var(--text-faint)]" : ""
          }`}
        >
          {message.content ? (
            <span className={message.pending ? "cursor-blink" : ""}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Wide tables scroll inside the bubble rather than stretching it.
                  table: ({ children, ...props }) => (
                    <div className="table-scroll">
                      <table {...props}>{children}</table>
                    </div>
                  ),
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer noopener">
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </span>
          ) : (
            <span data-testid="pending-indicator" className="inline-flex items-center gap-2">
              <ThinkingDots />
              {message.stage && (
                <span data-testid="stage-label" className="text-sm">
                  {message.stage}…
                </span>
              )}
            </span>
          )}
        </div>
        {message.graph_state && Object.keys(message.graph_state).length > 0 && (
          <GraphStateViewer state={message.graph_state} turn={message.turn} />
        )}
        {message.isBtw && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
            <TerminalIcon className="h-3 w-3" /> Side channel · not saved
          </span>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--text-faint)] animate-bounce"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}
