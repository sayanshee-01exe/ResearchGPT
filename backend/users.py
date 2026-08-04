"""User records persisted to users.json.

Mirrors the flat-file + threading.Lock pattern already used for sessions.json.
Fine for a single uvicorn process; needs a real database before it is fronted
by more than one worker.
"""

import json
import os
import threading
import uuid
from datetime import datetime
from pathlib import Path

from backend.auth import hash_password, verify_password

USERS_FILE = Path(os.environ.get("PAPEER_USERS_FILE", "users.json"))
_users_lock = threading.Lock()

PUBLIC_FIELDS = ("id", "email", "name", "created_at")


class EmailAlreadyRegistered(Exception):
    """Raised when signing up with an email that already exists."""


# ── Persistence ──────────────────────────────────────────────────────────────

def _load() -> dict:
    try:
        return json.loads(USERS_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save(users: dict) -> None:
    USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")


def _normalize(email: str) -> str:
    return email.strip().lower()


def public_view(user: dict) -> dict:
    """Strip password_hash — use this for anything that leaves the server."""
    return {field: user[field] for field in PUBLIC_FIELDS if field in user}


# ── Public API ───────────────────────────────────────────────────────────────

def create_user(email: str, name: str, password: str) -> dict:
    email = _normalize(email)
    password_hash = hash_password(password)
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": name.strip() or email.split("@")[0],
        "password_hash": password_hash,
        "created_at": datetime.now().isoformat(),
    }
    with _users_lock:
        users = _load()
        if any(_normalize(u["email"]) == email for u in users.values()):
            raise EmailAlreadyRegistered(email)
        users[user["id"]] = user
        _save(users)
    return public_view(user)


def get_user_by_email(email: str) -> dict | None:
    email = _normalize(email)
    with _users_lock:
        users = _load()
    for user in users.values():
        if _normalize(user["email"]) == email:
            return user
    return None


def get_user_by_id(user_id: str) -> dict | None:
    with _users_lock:
        users = _load()
    return users.get(user_id)


def authenticate(email: str, password: str) -> dict | None:
    """Return the public user record on success, None on any failure."""
    user = get_user_by_email(email)
    if user is None:
        return None
    try:
        if not verify_password(password, user["password_hash"]):
            return None
    except ValueError:
        # Over-length password: a failed login, not a server error.
        return None
    return public_view(user)
