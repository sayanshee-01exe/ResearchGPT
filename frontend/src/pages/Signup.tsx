import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthCard, { ErrorMessage, Field, inputClass, submitClass } from "../components/AuthCard";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { MIN_PASSWORD_LENGTH, validateEmail, validateName, validatePassword } from "../validation";

export default function Signup() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateName(name) ?? validateEmail(email) ?? validatePassword(password);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await signup(email.trim(), name.trim(), password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      testId="signup-page"
      title="Create your account"
      subtitle="Your papers and threads stay private to you."
      footer={
        <>
          Already have an account?{" "}
          <Link
            data-testid="signup-to-login"
            to="/login"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Name">
          <input
            data-testid="signup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
            className={inputClass}
          />
        </Field>

        <Field label="Email">
          <input
            data-testid="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass}
          />
        </Field>

        <Field label="Password" hint={`${MIN_PASSWORD_LENGTH}+ characters`}>
          <PasswordInput
            testId="signup-password"
            value={password}
            onChange={setPassword}
            placeholder="Choose a password"
            autoComplete="new-password"
          />
        </Field>

        {error && <ErrorMessage testId="signup-error">{error}</ErrorMessage>}

        <button data-testid="signup-submit" type="submit" disabled={busy} className={submitClass}>
          {busy ? "Creating your account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
