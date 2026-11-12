import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Header and footer shared by the public pages (Landing, About).

const NAV = [
  { label: "How it works", to: "/#how-it-works" },
  { label: "Features", to: "/#features" },
  { label: "About", to: "/about" },
  { label: "FAQ", to: "/#faq" },
];

const plainLink =
  "rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]";
const primaryButton =
  "rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-text)] transition hover:bg-[var(--accent-strong)]";

export function SiteHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          📚 ResearchGPT
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Link data-testid="nav-login" to="/login" className={plainLink}>
            Log in
          </Link>
          {/* Sign up is the main button unless "Open ResearchGPT" takes that spot. */}
          <Link data-testid="cta-signup" to="/signup" className={user ? plainLink : primaryButton}>
            Sign up
          </Link>
          {user && (
            <Link data-testid="nav-open-app" to="/app" className={primaryButton}>
              <span className="sm:hidden">Open app</span>
              <span className="hidden sm:inline">Open ResearchGPT</span>
            </Link>
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
        </nav>
      </div>
    </footer>
  );
}
