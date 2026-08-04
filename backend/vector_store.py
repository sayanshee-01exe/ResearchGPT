import os

from dotenv import load_dotenv
from langchain_classic.embeddings import CacheBackedEmbeddings
from langchain_classic.storage import LocalFileStore
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    PayloadSchemaType,
    VectorParams,
)

load_dotenv()

# ── Config ───────────────────────────────────────────────────────────────────

EMBEDDING_DIM = 1536  # text-embedding-3-small

# Retrieval breadth. "Deep" trades latency for recall on harder questions.
DEFAULT_K = 4
DEEP_K = 12
MAX_K = 50

# ── Singletons ────────────────────────────────────────────────────────────────

base_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
embedding_file_store = LocalFileStore("./embedding_cache/")
embeddings = CacheBackedEmbeddings.from_bytes_store(
    base_embeddings,
    embedding_file_store,
    namespace=base_embeddings.model,
    query_embedding_cache=True,
    key_encoder="blake2b",
)

qdrant_client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_API_KEY"],
    timeout=120,
)


# ── Collection ───────────────────────────────────────────────────────────────

def get_collection_name(session_id: str) -> str:
    return f"papeer_{session_id.replace('-', '_')}"


CORPUS_FIELD = "metadata.title"

# Collections already known to carry the corpus index, so we skip the extra
# round trip on every search.
_indexed_collections: set[str] = set()


def ensure_corpus_index(collection_name: str) -> None:
    """Qdrant rejects a filter on an unindexed payload field with a 400, so the
    index has to exist before Corpus filtering can work. Creating it is
    idempotent; collections made before this existed get it on first use."""
    if collection_name in _indexed_collections:
        return
    try:
        qdrant_client.create_payload_index(
            collection_name=collection_name,
            field_name=CORPUS_FIELD,
            field_schema=PayloadSchemaType.KEYWORD,
        )
    except Exception:
        # Already indexed, or a race with another worker — either way the
        # index is there, which is all we need.
        pass
    _indexed_collections.add(collection_name)


def get_vectorstore(session_id: str) -> QdrantVectorStore:
    collection_name = get_collection_name(session_id)
    if not qdrant_client.collection_exists(collection_name):
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
    ensure_corpus_index(collection_name)
    return QdrantVectorStore(
        client=qdrant_client,
        collection_name=collection_name,
        embedding=embeddings,
    )


# ── Public API ───────────────────────────────────────────────────────────────

def add_paper(docs: list[Document], session_id: str) -> None:
    get_vectorstore(session_id).add_documents(docs)


def list_papers(session_id: str) -> list[str]:
    collection_name = get_collection_name(session_id)
    if not qdrant_client.collection_exists(collection_name):
        return []
    seen: set[str] = set()
    titles: list[str] = []
    offset = None
    while True:
        points, offset = qdrant_client.scroll(
            collection_name=collection_name,
            with_payload=True,
            limit=100,
            offset=offset,
        )
        for point in points:
            title = (point.payload or {}).get("metadata", {}).get("title")
            if title and title not in seen:
                seen.add(title)
                titles.append(title)
        if offset is None:
            break
    return titles


def delete_session_vectors(session_id: str) -> bool:
    """Drop a session's whole collection — every chunk and embedding in it.

    Returns True if a collection existed. Raises if Qdrant refuses, so the
    caller can keep the session rather than orphan the data.
    """
    collection_name = get_collection_name(session_id)
    _indexed_collections.discard(collection_name)
    if not qdrant_client.collection_exists(collection_name):
        return False
    qdrant_client.delete_collection(collection_name)
    return True


def title_filter(titles: list[str] | None) -> Filter | None:
    """Restrict a search to specific papers, or None to search them all."""
    cleaned = [t.strip() for t in (titles or []) if t and t.strip()]
    if not cleaned:
        return None
    # langchain-qdrant nests document metadata under a "metadata" payload key.
    return Filter(must=[FieldCondition(key=CORPUS_FIELD, match=MatchAny(any=cleaned))])


def resolve_k(deep: bool, requested: int | None = None) -> int:
    """How many chunks to pull: deep mode wins, and the total is always capped."""
    k = DEEP_K if deep else (requested if requested is not None else DEFAULT_K)
    if deep and requested is not None:
        k = max(DEEP_K, min(requested, MAX_K))
    return max(1, min(k, MAX_K))


def search(
    query: str,
    session_id: str,
    k: int = DEFAULT_K,
    titles: list[str] | None = None,
) -> list[Document]:
    return get_vectorstore(session_id).similarity_search(
        query, k=k, filter=title_filter(titles)
    )
