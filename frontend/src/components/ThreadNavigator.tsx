import { useState } from "react";
import type { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  onJump: (messageIndex: number) => void;
}

/**
 * A hover-revealed index of the questions asked in this thread, pinned to the
 * right edge. `/btw` messages are deliberately excluded — they are a side
 * channel that is never part of the thread's history.
 */
export default function ThreadNavigator({ messages, onJump }: Props) {
  const [open, setOpen] = useState(false);

  const questions = messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.role === "user" && !message.isBtw);

  if (questions.length === 0) return null;

  return (
    <div
      data-testid="thread-navigator"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="absolute top-1/2 right-0 z-20 flex -translate-y-1/2 items-center justify-end pr-2"
    >
      {/* Collapsed: one tick per question. */}
      <div
        aria-hidden={open}
        className={`flex flex-col items-end gap-1.5 py-2 transition-opacity ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        {questions.map(({ index }) => (
          <span
            key={index}
            className="block h-0.5 w-3.5 rounded-full bg-[var(--text-faint)]"
          />
        ))}
      </div>

      {open && (
        <nav
          data-testid="navigator-panel"
          aria-label="Questions in this thread"
          className="absolute right-2 max-h-[60vh] w-60 overflow-y-auto rounded-xl border p-1.5 shadow-xl"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
        >
          <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-[var(--text-faint)] uppercase">
            This thread
          </p>
          {questions.map(({ message, index }) => (
            <button
              key={index}
              data-testid="navigator-item"
              onClick={() => onJump(index)}
              title={message.content}
              className="block w-full cursor-pointer truncate rounded-lg px-2.5 py-1.5 text-left text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]"
            >
              {message.content}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
