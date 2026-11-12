import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { usePageMeta } from "../hooks/usePageMeta";

// Sample exchanges for the "See it in action" demo. Static — no API calls.
const DEMOS = [
  {
    label: "Ask a paper",
    route: "Answered from your paper",
    question: "How did the authors evaluate the Transformer?",
    answer:
      "They evaluated it on the WMT 2014 English–German and English–French translation benchmarks, scored with BLEU. The big Transformer reached 28.4 BLEU on English–German and 41.8 on English–French, beating earlier models at a fraction of the training cost. (Attention Is All You Need, §6.1)",
  },
  {
    label: "Verify a claim",
    route: "Checked against web + arXiv",
    question: "Verify: recurrent encoder–decoder models are the best approach to machine translation.",
    answer:
      "Superseded. That was a fair summary around 2016, but the Transformer (Vaswani et al., 2017) outperformed recurrent models on the standard translation benchmarks, and attention-based architectures have dominated since. Newer work to read: arXiv 1706.03762.",
  },
  {
    label: "/btw side question",
    route: "Not saved to your session",
    question: "/btw what's the difference between precision and recall?",
    answer:
      "Precision is the share of the items you flagged that were actually relevant. Recall is the share of all relevant items you managed to flag. Raising one usually lowers the other, which is why papers often report F1, their harmonic mean.",
  },
];

const FAQS = [
  {
    q: "What is ResearchGPT?",
    a: "ResearchGPT is an AI research assistant that lets you chat with research papers. Upload your papers, ask questions in plain language, and get answers grounded in the text, then check whether the papers' claims still hold against newer research.",
  },
  {
    q: "What kinds of papers can I upload?",
    a: "PDF, TXT and Markdown files, any web page by URL, or an arXiv paper by its title or ID (for example 2303.08774).",
  },
  {
    q: "How is this different from asking a general chatbot?",
    a: "Answers come from the retrieved passages of your own papers rather than the model's memory, and questions about recent developments use live web search instead of stale training data.",
  },
  {
    q: "How does claim verification work?",
    a: "Ask ResearchGPT to verify a claim. It searches the web and arXiv, tells you whether the claim still holds or has been superseded, and links the newer papers.",
  },
  {
    q: "Are my papers private?",
    a: "Your sessions are tied to your account and other users cannot see them. Each session keeps its own separate collection of papers.",
  },
  {
    q: "What is the /btw command?",
    a: "Start a message with /btw to ask an off-topic question without leaving your session. Those exchanges are never saved to your session history.",
  },
];

// Lets Google show the FAQ as rich results. Built from FAQS so the two never drift.
const FAQ_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

function TypedAnswer({ text }: { text: string }) {
  const [shown, setShown] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text.length : 0
  );

  useEffect(() => {
    if (shown >= text.length) return;
    const id = setTimeout(() => setShown((n) => Math.min(n + 3, text.length)), 16);
    return () => clearTimeout(id);
  }, [shown, text]);

  return (
    <p className={`text-sm leading-relaxed ${shown < text.length ? "cursor-blink" : ""}`}>
      {text.slice(0, shown)}
    </p>
  );
}

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
  usePageMeta(
    "ResearchGPT — AI Research Paper Assistant: Chat with PDFs & arXiv Papers",
    "Upload research papers (PDF, URL or arXiv ID) and ask questions in plain language. ResearchGPT gives answers grounded in your papers and checks whether their claims still hold against newer research."
  );
  // Nav links like /#faq arrive from other pages; scroll to the section once rendered.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const [demoIndex, setDemoIndex] = useState(0);
  const demo = DEMOS[demoIndex];

  return (
    <div
      data-testid="landing"
      className="min-h-screen overflow-x-clip bg-[var(--bg)] text-[var(--text)]"
    >
      <SiteHeader />

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
          <a
            href="#demo"
            className="w-full rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg-elevated)] sm:w-auto"
          >
            See it in action ↓
          </a>
        </div>
      </section>

      {/* ── Interactive demo ── */}
      <section
        id="demo"
        data-testid="demo"
        className="mx-auto max-w-3xl scroll-mt-28 px-5 pb-20 sm:px-8"
      >
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Example questions">
          {DEMOS.map((d, i) => (
            <button
              key={d.label}
              type="button"
              data-testid="demo-tab"
              aria-pressed={i === demoIndex}
              onClick={() => setDemoIndex(i)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                i === demoIndex
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-left shadow-sm sm:p-6">
          <div className="flex justify-end">
            <p
              data-testid="demo-question"
              className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--user-bubble)] px-4 py-2.5 text-sm text-[var(--user-bubble-text)]"
            >
              {demo.question}
            </p>
          </div>
          <div className="mt-4 min-h-32" aria-live="polite">
            <span className="mb-2 inline-block rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-strong)]">
              {demo.route}
            </span>
            {/* key restarts the typing animation when the question changes */}
            <TypedAnswer key={demoIndex} text={demo.answer} />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--text-faint)]">
          Example answers.{" "}
          <Link to="/signup" className="underline underline-offset-2 hover:text-[var(--text)]">
            Sign up
          </Link>{" "}
          to ask about your own papers.
        </p>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        data-testid="how-it-works"
        className="scroll-mt-28 border-t border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-20 sm:px-8"
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
      <section id="features" data-testid="features" className="scroll-mt-28 px-5 py-20 sm:px-8">
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

      {/* ── FAQ ── */}
      <section
        id="faq"
        data-testid="faq"
        className="scroll-mt-28 border-t border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                data-testid="faq-item"
                className="group rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="text-xl text-[var(--accent)] transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_SCHEMA }} />
      </section>

      <SiteFooter />
    </div>
  );
}
