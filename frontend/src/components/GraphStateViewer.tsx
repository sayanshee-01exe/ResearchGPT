import { useState } from "react";
import { ChevronIcon, TerminalIcon } from "./icons";

export default function GraphStateViewer({
  state,
  turn,
}: {
  state: Record<string, unknown>;
  turn?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] text-[13px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
      >
        <TerminalIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">Graph state{turn ? ` · turn ${turn}` : ""}</span>
        <ChevronIcon
          className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <pre className="overflow-x-auto border-t border-[var(--border)] px-3 py-2 font-mono text-[12px] leading-relaxed text-[var(--text-muted)]">
          {JSON.stringify(state, null, 2)}
        </pre>
      )}
    </div>
  );
}
