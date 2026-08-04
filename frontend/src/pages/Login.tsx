import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthCard, { ErrorMessage, Field, inputClass, submitClass } from "../components/AuthCard";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { validateEmail, validatePassword } from "../validation";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateEmail(email) ?? validatePassword(password);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/app", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      testId="login-page"
      title="Welcome back"
      subtitle="Log in to pick up your research threads."
      footer={
        <>
          New to ResearchGPT?{" "}
          <Link
            data-testid="login-to-signup"
            to="/signup"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email">
          <input
            data-testid="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass}
          />
        </Field>

        <Field label="Password">
          <PasswordInput
            testId="login-password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </Field>

        {error && <ErrorMessage testId="login-error">{error}</ErrorMessage>}

        <button data-testid="login-submit" type="submit" disabled={busy} className={submitClass}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
