export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Returns an error message, or null when the value is acceptable. */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Enter your email address";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Enter your password";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  // Mirrors the server's bcrypt limit so the user is told before the round trip.
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} bytes`;
  }
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "Enter your name";
  return null;
}
