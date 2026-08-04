"""Environment configuration.

Values required for auth are validated at import time so a misconfigured
deployment fails on startup rather than on the first login attempt.
"""

import os

from dotenv import load_dotenv

load_dotenv()

# ── Constraints ──────────────────────────────────────────────────────────────

MIN_SECRET_LENGTH = 32


def _require_secret(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(
            f"{name} is not set. Add it to your .env file, for example:\n"
            f'  {name}=$(python -c "import secrets; print(secrets.token_urlsafe(48))")'
        )
    if len(value) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            f"{name} is too short ({len(value)} chars); it must be at least "
            f"{MIN_SECRET_LENGTH} characters so HS256 tokens cannot be brute forced. "
            f'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))" '
            f"and set it in .env"
        )
    return value


# ── JWT ──────────────────────────────────────────────────────────────────────

JWT_SECRET = _require_secret("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7
