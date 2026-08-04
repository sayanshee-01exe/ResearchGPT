import { SparkleIcon } from "./icons";

export default function PlaceholderView({ title, body }: { title: string; body: string }) {
  return (
    <div data-testid="placeholder-view" className="flex h-full flex-1 flex-col">
      <header className="border-b px-6 py-3.5" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-[15px] font-semibold text-[var(--text)]">{title}</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <SparkleIcon className="h-8 w-8 text-[var(--text-faint)]" />
        <h2 className="text-lg font-medium text-[var(--text)]">{title}</h2>
        <p className="max-w-md text-sm text-[var(--text-muted)]">{body}</p>
      </div>
    </div>
  );
}
