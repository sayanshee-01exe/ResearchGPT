"""Password hashing and JWT issue/verify.

bcrypt is used directly rather than through passlib, which is unmaintained and
incompatible with bcrypt 5.x. That means the 72-byte input limit is ours to
enforce: bcrypt ignores every byte past 72, so without an explicit check a
password sharing its first 72 bytes with the real one would authenticate.
"""

import datetime

import bcrypt
import jwt

from backend.config import JWT_ALGORITHM, JWT_EXPIRY_DAYS, JWT_SECRET

# ── Passwords ────────────────────────────────────────────────────────────────

MAX_PASSWORD_BYTES = 72


def _encode(password: str) -> bytes:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise ValueError(
            f"Password is {len(encoded)} bytes; bcrypt accepts at most "
            f"{MAX_PASSWORD_BYTES} bytes (note that non-ASCII characters use "
            f"more than one byte each)."
        )
    return encoded


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_encode(password), password_hash.encode("utf-8"))
    except ValueError as exc:
        # An over-length password is a caller error worth surfacing; a malformed
        # stored hash is not something the caller can act on, so it is just a
        # failed verification.
        if str(MAX_PASSWORD_BYTES) in str(exc):
            raise
        return False


# ── Tokens ───────────────────────────────────────────────────────────────────

def make_token(user_id: str, expires_delta: datetime.timedelta | None = None) -> str:
    if expires_delta is None:
        expires_delta = datetime.timedelta(days=JWT_EXPIRY_DAYS)
    claims = {
        "sub": user_id,
        "exp": datetime.datetime.now(datetime.UTC) + expires_delta,
        "iat": datetime.datetime.now(datetime.UTC),
    }
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> str | None:
    """Return the user id from a valid token, or None if it is not usable.

    Pinning `algorithms` to the configured one is what rejects `alg: none` and
    algorithm-confusion attacks.
    """
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    subject = claims.get("sub")
    return subject if isinstance(subject, str) and subject else None
