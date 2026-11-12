import { useState } from "react";
import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { usePageMeta } from "../hooks/usePageMeta";

// Side-by-side answers for the "How it's different" picker.
const SCENARIOS = [
  {
    label: "What did this paper find?",
    memory:
      "Answers from what it remembers of its training data. If the paper is new, niche or your own draft, it may guess — and sometimes invents results or citations.",
    ours: "Retrieves the exact passages from the paper you uploaded and answers from them, so every claim can be traced back to the text.",
  },
  {
    label: "Is this claim still true?",
    memory:
      "Its knowledge stops at a training cutoff, so it cannot tell you whether newer work has overturned the claim.",
    ours: "Searches the web and arXiv now, tells you whether the claim holds or has been superseded, and links the newer papers.",
  },
  {
    label: "What's new in this field?",
    memory: "Limited to whatever it saw during training, which may be a year or more out of date.",
    ours: "Routes the question to live web search and builds the answer from fresh results.",
  },
  {
    label: "Did it actually find the answer?",
    memory:
      "Always produces fluent text, whether or not it has the facts — it is hard to tell which parts are grounded.",
    ours: "Checks that the retrieved passages are relevant before answering, and rewrites the search and tries again when they are not.",
  },
];

const AUDIENCE = [
  {
    title: "Students",
    body: "Get through dense papers faster: ask what a method does, what a figure shows, or what a term means in context.",
  },
  {
    title: "Researchers",
    body: "Cross-reference claims across several papers at once without re-reading each one end to end.",
  },
  {
    title: "Literature reviewers",
    body: "Check whether findings and methods from older papers still hold, with links to the work that replaced them.",
  },
  {
    title: "Anyone with a reading list",
    body: "Turn the PDFs you have been meaning to read into a conversation you can actually finish.",
  },
];

const PIPELINE = [
  {
    title: "Load",
    body: "Upload PDF, TXT or Markdown files, paste a web URL, or fetch a paper from arXiv by title or ID.",
  },
  {
    title: "Index",
    body: "Each paper is split into passages and stored as vector embeddings, in a collection private to your session.",
  },
  {
    title: "Route",
    body: "An agent decides how to answer: from your papers, from a live web search, by verifying a claim, or directly.",
  },
  {
    title: "Answer",
    body: "Relevant passages are checked, then the answer streams back word by word, grounded in what was found.",
  },
];

export default function About() {
  usePageMeta(
    "About ResearchGPT — How the AI Research Paper Assistant Works",
    "ResearchGPT answers questions from the research papers you upload instead of from memory, and checks claims against the latest web and arXiv results. Learn how it works and who it is for."
  );
  const [active, setActive] = useState(0);
  const scenario = SCENARIOS[active];

  return (
    <div
      data-testid="about"
      className="min-h-screen overflow-x-clip bg-[var(--bg)] text-[var(--text)]"
    >
      <SiteHeader />

      <main>
        {/* ── Intro ── */}
        <section className="mx-auto max-w-3xl px-5 pt-16 pb-16 text-center sm:px-8 sm:pt-20">
          <p className="mb-5 inline-block rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-muted)]">
            About
          </p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Research papers, made answerable
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
            ResearchGPT is an AI assistant for reading research papers. You bring the papers; it
            finds the passages that answer your question, and tells you when newer research has
            moved on.
          </p>
        </section>

        {/* ── Why ── */}
        <section className="border-t border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">Why it exists</h2>
            <div className="mt-6 space-y-4 leading-relaxed text-[var(--text-muted)]">
              <p>
                Papers are written to be precise, not quick to read. Finding one detail — the
                dataset, the evaluation metric, the limitation buried in section 6 — often means
                reading the whole thing.
              </p>
              <p>
                General AI assistants help, but when they answer from memory they can sound
                confident about papers they have never seen, and they cannot know what was
                published after their training ended.
              </p>
              <p className="text-[var(--text)]">
                ResearchGPT is built around two rules: answer from the source, and check the
                source against what is current.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it's different (interactive) ── */}
        <section data-testid="comparison" className="px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              How it&apos;s different
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[var(--text-muted)]">
              Pick a question to compare an AI answering from memory with ResearchGPT.
            </p>

            <div
              className="mt-8 flex flex-wrap justify-center gap-2"
              role="group"
              aria-label="Questions to compare"
            >
              {SCENARIOS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  data-testid="comparison-tab"
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${
                    i === active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div key={active} className="animate-fade-in-up mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
                <p className="text-xs font-semibold tracking-wide text-[var(--text-faint)] uppercase">
                  AI answering from memory
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  {scenario.memory}
                </p>
              </div>
              <div
                data-testid="comparison-ours"
                className="rounded-2xl border border-[var(--accent)] bg-[var(--bg-elevated)] p-6"
              >
                <p className="text-xs font-semibold tracking-wide text-[var(--accent)] uppercase">
                  ResearchGPT
                </p>
                <p className="mt-3 text-sm leading-relaxed">{scenario.ours}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Who it's for ── */}
        <section className="border-t border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">Who it&apos;s for</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCE.map((a) => (
                <div
                  key={a.title}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition hover:border-[var(--accent)]"
                >
                  <h3 className="font-medium">{a.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Under the hood ── */}
        <section className="px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">Under the hood</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[var(--text-muted)]">
              A retrieval-augmented generation (RAG) pipeline built with LangGraph, FastAPI, Qdrant
              and React.
            </p>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
                >
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-t border-[var(--border)] px-5 py-16 text-center sm:px-8">
          <h2 className="text-2xl font-semibold sm:text-3xl">Try it on a paper you know</h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--text-muted)]">
            The quickest way to judge it is to ask about something you have already read.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="w-full rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--user-bubble-text)] transition hover:bg-[var(--accent-strong)] sm:w-auto"
            >
              Create your free account
            </Link>
            <Link
              to="/#faq"
              className="w-full rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-medium transition hover:bg-[var(--bg-elevated)] sm:w-auto"
            >
              Read the FAQ
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
