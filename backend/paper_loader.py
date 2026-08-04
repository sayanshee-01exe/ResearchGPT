import re
import tempfile
from pathlib import Path

import requests
from langchain_community.document_loaders import PyMuPDFLoader, TextLoader, WebBaseLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.url_guard import resolve_safe_url

_ARXIV_ID_RE = re.compile(r"(\d{4}\.\d{4,5}(?:v\d+)?)")
_BARE_ARXIV_ID_RE = re.compile(r"\d{4}\.\d{4,5}")

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP, add_start_index=True
)
_md_splitter = RecursiveCharacterTextSplitter.from_language(
    "markdown", chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP, add_start_index=True
)


def _stamp_title(docs: list[Document], title: str) -> list[Document]:
    for doc in docs:
        doc.metadata["title"] = title
    return docs


def load_pdf(file_path: str) -> list[Document]:
    docs = PyMuPDFLoader(file_path).load()
    return _stamp_title(_splitter.split_documents(docs), Path(file_path).stem)


def load_text(file_path: str) -> list[Document]:
    docs = TextLoader(file_path, encoding="utf-8").load()
    return _stamp_title(_splitter.split_documents(docs), Path(file_path).stem)


def load_markdown(file_path: str) -> list[Document]:
    docs = TextLoader(file_path, encoding="utf-8").load()
    return _stamp_title(_md_splitter.split_documents(docs), Path(file_path).stem)


def load_webpage(url: str) -> list[Document]:
    # User-supplied: validated against SSRF before anything is fetched.
    safe_url = resolve_safe_url(url)
    docs = WebBaseLoader(
        safe_url, requests_kwargs={"timeout": 30, "allow_redirects": False}
    ).load()
    title = (docs[0].metadata.get("title") or safe_url) if docs else safe_url
    return _stamp_title(_splitter.split_documents(docs), title)


def _extract_arxiv_id(query: str) -> str | None:
    """Return bare ArXiv ID (no version suffix) if one appears in the query."""
    m = _ARXIV_ID_RE.search(query)
    if m:
        return re.sub(r"v\d+$", "", m.group(1))
    return None


def _check_arxiv_id(arxiv_id: str) -> str:
    """Reject anything that is not a bare ArXiv ID before it reaches a URL."""
    if not _BARE_ARXIV_ID_RE.fullmatch(arxiv_id):
        raise ValueError(f"Not a valid ArXiv ID: {arxiv_id}")
    return arxiv_id


def _arxiv_api_lookup(arxiv_id: str) -> str:
    """Fetch paper title by ID from the ArXiv Atom API."""
    response = requests.get(
        "https://export.arxiv.org/api/query",
        params={"id_list": _check_arxiv_id(arxiv_id)},
        timeout=10,
    )
    response.raise_for_status()
    xml = response.text
    titles = re.findall(r"<title>(.*?)</title>", xml, re.DOTALL)
    return titles[1].strip() if len(titles) > 1 else arxiv_id


def _arxiv_search(query: str) -> str:
    """Search ArXiv Atom API by title phrase and return the top result's bare paper ID."""
    phrase = query.strip('"')
    response = requests.get(
        "https://export.arxiv.org/api/query",
        params={
            "search_query": f'ti:"{phrase}"',
            "max_results": 1,
            "sortBy": "relevance",
        },
        timeout=15,
    )
    response.raise_for_status()
    xml = response.text
    m = re.search(r"<id>https?://arxiv\.org/abs/(\d{4}\.\d{4,5}(?:v\d+)?)</id>", xml)
    if not m:
        raise ValueError(f"No ArXiv paper found for: {query}")
    return re.sub(r"v\d+$", "", m.group(1))


def _load_arxiv_by_id(arxiv_id: str) -> list[Document]:
    """Download and chunk an ArXiv paper PDF by its bare ID."""
    response = requests.get(
        f"https://arxiv.org/pdf/{_check_arxiv_id(arxiv_id)}", timeout=60
    )
    response.raise_for_status()
    pdf_bytes = response.content
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        docs = PyMuPDFLoader(tmp_path).load()
        if not docs:
            raise ValueError(f"Could not load PDF for ArXiv ID: {arxiv_id}")
        title = (docs[0].metadata.get("title") or "").strip() or _arxiv_api_lookup(arxiv_id)
        return _stamp_title(_splitter.split_documents(docs), title)
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


def load_arxiv(query: str) -> list[Document]:
    arxiv_id = _extract_arxiv_id(query) or _arxiv_search(query)
    return _load_arxiv_by_id(arxiv_id)


def load_document(source: str) -> list[Document]:
    """Dispatch to the appropriate loader based on URL prefix or file extension.

    Only local paths produced by the upload endpoint and validated http(s) URLs
    reach this function; any other scheme falls through to the extension check
    and is rejected there.
    """
    if source.startswith(("http://", "https://")):
        return load_webpage(source)
    ext = Path(source).suffix.lower()
    if ext == ".pdf":
        return load_pdf(source)
    if ext == ".txt":
        return load_text(source)
    if ext in (".md", ".markdown"):
        return load_markdown(source)
    raise ValueError(f"Unsupported file type: {ext}")
