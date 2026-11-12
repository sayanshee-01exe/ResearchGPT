import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Header and footer shared by the public pages (Landing, About).

const NAV = [
  { label: "How it works", to: "/#how-it-works" },
  { label: "Features", to: "/#features" },
  { label: "About", to: "/about" },
  { label: "FAQ", to: "/#faq" },
];

const linkClass =
  "text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]";

export function SiteHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          📚 ResearchGPT
        </Link>

        {/* Full-width second row on phones, inline on larger screens. */}
        <nav
          aria-label="Main"
          className="order-last flex w-full justify-between sm:order-none sm:w-auto sm:gap-6"
        >
          {NAV.map((item) => (
            <Link key={item.label} to={item.to} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
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
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[var(--text-faint)] sm:flex-row">
        <span>📚 ResearchGPT — chat with your research papers.</span>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {NAV.map((item) => (
            <Link key={item.label} to={item.to} className="hover:text-[var(--text)]">
              {item.label}
            </Link>
          ))}
          <Link to="/login" className="hover:text-[var(--text)]">
            Log in
          </Link>
          <Link to="/signup" className="hover:text-[var(--text)]">
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
