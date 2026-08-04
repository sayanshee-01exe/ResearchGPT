import json
import os
import tempfile
import threading
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, field_validator

from backend import users
from backend.auth import MAX_PASSWORD_BYTES, decode_token, make_token
from backend.btw_handler import handle_btw
from backend.paper_loader import load_arxiv, load_document, load_webpage
from backend.rag_graph import build_graph
from backend.vector_store import add_paper, delete_session_vectors, list_papers

app = FastAPI(title="ResearchGPT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS_FILE = Path(os.environ.get("PAPEER_SESSIONS_FILE", "sessions.json"))
_sessions_lock = threading.Lock()
_rename_llm = ChatOpenAI(model="gpt-5-mini")
graph = build_graph()


# ── Session metadata persistence ────────────────────────────────────────────

LEGACY_OWNER = "legacy"


def load_sessions() -> dict:
    try:
        sessions_meta = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    # Sessions created before auth existed have no owner. Tag them so they are
    # never matched by a real user id rather than leaving the field absent.
    for session in sessions_meta.values():
        session.setdefault("user_id", LEGACY_OWNER)
    return sessions_meta


def save_sessions(sessions_meta: dict) -> None:
    SESSIONS_FILE.write_text(json.dumps(sessions_meta, indent=2), encoding="utf-8")


def generate_session_name(first_message: str) -> str:
    try:
        response = _rename_llm.invoke(
            [
                {
                    "role": "system",
                    "content": (
                        "Generate a concise 3-5 word title for a research chat session "
                        "based on the user's first message. Return only the title, "
                        "no punctuation at the end, no quotes."
                    ),
                },
                {"role": "user", "content": first_message[:500]},
            ]
        )
        return response.content.strip()
    except Exception:
        return "New Session"


def _serialize_state(values: dict) -> dict:
    out = {}
    for k, v in values.items():
        if k == "messages":
            out[k] = [
                {
                    "type": type(m).__name__,
                    "content": (
                        m.content[:300]
                        if isinstance(m.content, str)
                        else repr(m.content)[:300]
                    ),
                }
                for m in (v or [])
            ]
        elif k == "retrieved_docs":
            out[k] = [
                {"content": d.page_content[:300], "metadata": d.metadata}
                for d in (v or [])
            ]
        else:
            out[k] = v
    return out


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    # Composer controls. Defaults reproduce the pre-auth behaviour exactly.
    deep: bool = False
    corpus: list[str] = Field(default_factory=list, max_length=200)


class UrlRequest(BaseModel):
    urls: list[str] = Field(max_length=20)


class ArxivRequest(BaseModel):
    query: str


class BtwRequest(BaseModel):
    message: str


# Deliberately permissive: the RFC-legal set is far wider than any practical
# regex, so this only rejects obvious nonsense and real delivery is the check.
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SignupRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(
                f"Password must be at most {MAX_PASSWORD_BYTES} bytes "
                f"(non-ASCII characters count as more than one byte)"
            )
        return value


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Auth ─────────────────────────────────────────────────────────────────────

INVALID_CREDENTIALS = "Incorrect email or password"


def _unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(
        status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"}
    )


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Resolve the bearer token to a user, or raise 401."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized()
    user_id = decode_token(authorization[len("bearer "):].strip())
    if user_id is None:
        raise _unauthorized("Invalid or expired token")
    user = users.get_user_by_id(user_id)
    if user is None:
        # Validly signed token for a user that no longer exists.
        raise _unauthorized("Invalid or expired token")
    return users.public_view(user)


@app.post("/api/auth/signup", status_code=201)
def signup(req: SignupRequest):
    try:
        user = users.create_user(req.email, req.name, req.password)
    except users.EmailAlreadyRegistered:
        raise HTTPException(status_code=409, detail="Email is already registered")
    return {"token": make_token(user["id"]), "user": user}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = users.authenticate(req.email, req.password)
    if user is None:
        # One message for both unknown-email and wrong-password so the endpoint
        # cannot be used to enumerate registered accounts.
        raise _unauthorized(INVALID_CREDENTIALS)
    return {"token": make_token(user["id"]), "user": user}


@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    return user


# ── Sessions ─────────────────────────────────────────────────────────────────

def _require_owned_session(session_id: str, user: dict) -> dict:
    """Return the session if `user` owns it, else raise 404/403."""
    with _sessions_lock:
        sessions_meta = load_sessions()
    session = sessions_meta.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not your session")
    return session


@app.get("/api/sessions")
def get_sessions(user: dict = Depends(get_current_user)):
    with _sessions_lock:
        sessions_meta = load_sessions()
    owned = [s for s in sessions_meta.values() if s.get("user_id") == user["id"]]
    return sorted(owned, key=lambda s: s["created_at"], reverse=True)


@app.post("/api/sessions")
def create_session(user: dict = Depends(get_current_user)):
    sid = str(uuid.uuid4())
    session = {
        "id": sid,
        "name": "New Session",
        "created_at": datetime.now().isoformat(),
        "is_named": False,
        "user_id": user["id"],
    }
    with _sessions_lock:
        sessions_meta = load_sessions()
        sessions_meta[sid] = session
        save_sessions(sessions_meta)
    return session


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    """Remove a thread along with its embeddings and its conversation history."""
    _require_owned_session(session_id, user)

    # Drop the vectors first. If Qdrant refuses, keep the session so the user
    # can retry — deleting the record first would orphan the collection with
    # no way to reach it again.
    try:
        vectors_deleted = delete_session_vectors(session_id)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not delete this thread's paper embeddings, so nothing was removed: {e}",
        )

    # Chat history lives in the LangGraph checkpointer, keyed by thread id.
    checkpoints_deleted = True
    try:
        graph.checkpointer.delete_thread(session_id)
    except Exception:
        # Orphaned checkpoint rows are harmless — the session id is a UUID and
        # will never be reused — so this must not block the delete.
        checkpoints_deleted = False

    with _sessions_lock:
        sessions_meta = load_sessions()
        sessions_meta.pop(session_id, None)
        save_sessions(sessions_meta)

    return {
        "id": session_id,
        "vectors_deleted": vectors_deleted,
        "checkpoints_deleted": checkpoints_deleted,
    }


@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str, user: dict = Depends(get_current_user)):
    _require_owned_session(session_id, user)
    config = {"configurable": {"thread_id": session_id}}
    try:
        state = graph.get_state(config)
    except Exception:
        return []
    if not state or not state.values:
        return []
    chats = []
    turn = 0
    for msg in state.values.get("messages", []):
        type_name = type(msg).__name__
        content = msg.content if isinstance(msg.content, str) else str(msg.content)
        if type_name == "HumanMessage":
            chats.append({"role": "user", "content": content})
        elif type_name in ("AIMessage", "AIMessageChunk"):
            turn += 1
            chats.append({"role": "assistant", "content": content, "turn": turn, "graph_state": {}})
    return chats


# ── Chat (streaming) ─────────────────────────────────────────────────────────

# Shown to the user while each graph node runs.
STAGE_LABELS = {
    "router": "Understanding your question",
    "agent_node": "Choosing where to look",
    "retrieval": "Searching your papers",
    "relevancy_check": "Checking whether that answers it",
    "query_rewrite": "Refining the search",
    "verify_claim": "Verifying against recent research",
    "generate_answer": "Writing the answer",
}

@app.post("/api/sessions/{session_id}/chat")
def chat(session_id: str, req: ChatRequest, user: dict = Depends(get_current_user)):
    is_first_message = not _require_owned_session(session_id, user).get("is_named")

    def event_stream():
        input_state = {
            "messages": [HumanMessage(content=req.message)],
            "session_id": session_id,
            "query": req.message,
            "route": None,
            "retrieved_docs": [],
            "retrieval_attempts": 0,
            "claim_verdict": None,
            "claim_source": None,
            "superseding_papers": [],
            "answer": None,
            "is_relevant": None,
            "rewrite_count": 0,
            "deep": req.deep,
            "corpus": req.corpus,
        }
        config = {"configurable": {"thread_id": session_id}}

        response_text = ""
        # A retrieve-and-verify turn runs several nodes back to back, each its
        # own LLM call, so nothing streams for 10s or more. "debug" reports a
        # task *before* it runs, which is what lets the UI show live progress
        # instead of an indefinite spinner.
        for mode, payload in graph.stream(
            input_state, config, stream_mode=["debug", "messages"]
        ):
            if mode == "debug":
                if payload.get("type") != "task":
                    continue
                node = (payload.get("payload") or {}).get("name")
                label = STAGE_LABELS.get(node)
                if label:
                    yield _sse({"type": "stage", "node": node, "label": label})
                continue

            chunk, metadata = payload
            content = getattr(chunk, "content", "")
            if metadata.get("langgraph_node") != "generate_answer" or not content:
                continue

            # The stream carries the incremental AIMessageChunks *and* the
            # completed AIMessage for the same call. Appending both concatenated
            # the whole answer onto itself, so only emit what is genuinely new.
            if type(chunk).__name__ == "AIMessageChunk":
                new_text = content
            elif content.startswith(response_text):
                new_text = content[len(response_text):]
            else:
                new_text = "" if content in response_text else content

            if not new_text:
                continue
            response_text += new_text
            yield _sse({"type": "token", "content": new_text})

        final_values = graph.get_state(config).values
        if not response_text:
            response_text = final_values.get("answer") or "No response generated."

        state_snapshot = _serialize_state(final_values)

        session_name = None
        if is_first_message:
            session_name = generate_session_name(req.message)
            with _sessions_lock:
                sessions_meta = load_sessions()
                sessions_meta[session_id]["name"] = session_name
                sessions_meta[session_id]["is_named"] = True
                save_sessions(sessions_meta)

        yield _sse({
            "type": "done",
            "answer": response_text,
            "graph_state": state_snapshot,
            "session_name": session_name,
        })

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── /btw side channel (streaming) ───────────────────────────────────────────

@app.post("/api/btw")
def btw(req: BtwRequest, user: dict = Depends(get_current_user)):
    def event_stream():
        query = req.message.strip()
        if not query:
            yield _sse({"type": "token", "content": "Please add a question after `/btw`."})
            yield _sse({"type": "done"})
            return
        for chunk in handle_btw(query):
            yield _sse({"type": "token", "content": chunk})
        yield _sse({"type": "done"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Documents ────────────────────────────────────────────────────────────────

@app.get("/api/sessions/{session_id}/documents")
def get_documents(session_id: str, user: dict = Depends(get_current_user)):
    _require_owned_session(session_id, user)
    try:
        return list_papers(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sessions/{session_id}/documents/files")
async def upload_files(
    session_id: str,
    files: list[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
):
    _require_owned_session(session_id, user)
    results = []
    for f in files:
        tmp_path = None
        try:
            suffix = Path(f.filename).suffix
            content = await f.read()
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            docs = load_document(tmp_path)
            for doc in docs:
                doc.metadata["title"] = Path(f.filename).stem
            add_paper(docs, session_id)
            results.append({"name": f.filename, "status": "ok"})
        except Exception as e:
            results.append({"name": f.filename, "status": "error", "error": str(e)})
        finally:
            if tmp_path:
                Path(tmp_path).unlink(missing_ok=True)
    return results


@app.post("/api/sessions/{session_id}/documents/urls")
def load_urls(session_id: str, req: UrlRequest, user: dict = Depends(get_current_user)):
    _require_owned_session(session_id, user)
    results = []
    for url in req.urls:
        try:
            docs = load_webpage(url)
            add_paper(docs, session_id)
            results.append({"name": url, "status": "ok"})
        except Exception as e:
            results.append({"name": url, "status": "error", "error": str(e)})
    return results


@app.post("/api/sessions/{session_id}/documents/arxiv")
def load_arxiv_paper(
    session_id: str, req: ArxivRequest, user: dict = Depends(get_current_user)
):
    _require_owned_session(session_id, user)
    try:
        docs = load_arxiv(req.query.strip())
        add_paper(docs, session_id)
        loaded_title = docs[0].metadata.get("title") if docs else req.query.strip()
        return {"name": loaded_title, "status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Static frontend (production build, served if present) ──────────────────

_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():

    class SPAStaticFiles(StaticFiles):
        """Serve index.html for unknown paths so client-side routes like
        /login survive a hard refresh or a pasted link."""

        async def get_response(self, path: str, scope):
            response = await super().get_response(path, scope)
            if response.status_code == 404:
                return await super().get_response("index.html", scope)
            return response

    app.mount("/", SPAStaticFiles(directory=_frontend_dist, html=True), name="frontend")
