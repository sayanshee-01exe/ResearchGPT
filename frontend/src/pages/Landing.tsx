import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  {
    n: "01",
    title: "Upload your papers",
    body: "Drop in a PDF, paste a URL, or search arXiv by title or ID. Each session keeps its own private collection.",
  },
  {
    n: "02",
    title: "Ask in plain language",
    body: "ResearchGPT retrieves the passages that matter and answers from them — grounded in your papers, not guesswork.",
  },
  {
    n: "03",
    title: "Verify against live research",
    body: "Ask whether a claim still holds. ResearchGPT searches the web and arXiv, then tells you if newer work supersedes it.",
  },
];

const FEATURES = [
  {
    title: "Paper Q&A",
    body: "Retrieval-augmented answers drawn from the exact chunks of your uploaded papers.",
  },
  {
    title: "Claim verification",
    body: "Checks a claim against current literature and links the papers that supersede it.",
  },
  {
    title: "Live web search",
    body: "Questions about recent developments pull in fresh results instead of stale training data.",
  },
  {
    title: "The /btw side channel",
    body: "Prefix a message with /btw for off-topic questions. Never saved to your session history.",
  },
  {
    title: "Parallel sessions",
    body: "Run several threads at once, each with its own papers and its own conversation.",
  },
  {
    title: "Multiple sources",
    body: "PDF, TXT and Markdown files, any web page, or an arXiv ID — all in the same session.",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div
      data-testid="landing"
      className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text)]"
    >
      {/* ── Nav ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="text-lg font-semibold tracking-tight">📚 ResearchGPT</span>
        <nav className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <Link
              data-testid="nav-open-app"
              to="/app"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-text)] transition hover:bg-[var(--accent-strong)]"
            >
              Open ResearchGPT
            </Link>
          ) : (
            <>
              <Link
                data-testid="nav-login"
                to="/login"
                className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
              >
                Log in
              </Link>
              <Link
                data-testid="cta-signup"
                to="/signup"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-text)] transition hover:bg-[var(--accent-strong)]"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section
        data-testid="landing-hero"
        className="mx-auto max-w-3xl px-5 pt-16 pb-20 text-center sm:px-8 sm:pt-24"
      >
        <p className="mb-5 inline-block rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-muted)]">
          Retrieval-augmented research assistant
        </p>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          Read every research paper
          <span className="block text-[var(--accent)]">by asking it questions</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
          ResearchGPT turns a pile of research papers into a conversation. Upload them, ask what
          you actually want to know, and check whether their claims still hold up today.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            data-testid="cta-signup"
            to="/signup"
            className="w-full rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--user-bubble-text)] transition hover:bg-[var(--accent-strong)] sm:w-auto"
          >
            Start reading free
          </Link>
          <Link
            to="/login"
            className="w-full rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg-elevated)] sm:w-auto"
          >
            I have an account
          </Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        data-testid="how-it-works"
        className="border-t border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">How it works</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-[var(--text-muted)]">
            Three steps from a folder of unread PDFs to answers you can cite.
          </p>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.n}
                data-testid="how-it-works-step"
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
              >
                <span className="text-sm font-semibold text-[var(--accent)]">{step.n}</span>
                <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features ── */}
      <section data-testid="features" className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            What you can do with it
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                data-testid="feature-card"
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition hover:border-[var(--accent)]"
              >
                <h3 className="text-base font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="border-t border-[var(--border)] px-5 py-20 text-center sm:px-8">
        <h2 className="text-2xl font-semibold sm:text-3xl">Start with one paper</h2>
        <p className="mx-auto mt-3 max-w-md text-[var(--text-muted)]">
          Create an account and upload something you have been meaning to read.
        </p>
        <Link
          data-testid="cta-signup"
          to="/signup"
          className="mt-8 inline-block rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--user-bubble-text)] transition hover:bg-[var(--accent-strong)]"
        >
          Create your account
        </Link>
      </section>

      <footer className="border-t border-[var(--border)] px-5 py-8 text-center text-sm text-[var(--text-faint)] sm:px-8">
        ResearchGPT — built with LangGraph, FastAPI and React.
      </footer>
    </div>
  );
}
