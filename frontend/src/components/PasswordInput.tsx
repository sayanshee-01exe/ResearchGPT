import { useState } from "react";
import { inputClass } from "./AuthCard";

interface Props {
  testId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export default function PasswordInput({
  testId,
  value,
  onChange,
  placeholder,
  autoComplete,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        data-testid={testId}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} pr-16`}
      />
      <button
        data-testid="toggle-password"
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
