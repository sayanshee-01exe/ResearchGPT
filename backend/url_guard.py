"""Guard against SSRF in user-supplied URLs.

The URL loader accepts arbitrary addresses from authenticated users. Without a
check, a user could point it at cloud metadata (169.254.169.254) or a service
bound to localhost and have the server fetch it on their behalf. Every hop of a
redirect chain is validated too, since only checking the first URL lets a
public host redirect inward.
"""

import ipaddress
import socket
from urllib.parse import urlparse

ALLOWED_SCHEMES = ("http", "https")
MAX_REDIRECTS = 5


class UnsafeUrl(ValueError):
    """Raised when a URL may not be fetched."""


def resolve_host(host: str) -> list[str]:
    """Every address `host` resolves to. Separate function so tests can stub it."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return []
    return [info[4][0] for info in infos]


def _is_internal(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return True  # Unparseable means we cannot prove it is safe.
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def validate_public_http_url(url: str) -> str:
    """Return the URL if it is safe to fetch, else raise UnsafeUrl."""
    candidate = (url or "").strip()
    if not candidate:
        raise UnsafeUrl("Enter a URL starting with http:// or https://")

    parsed = urlparse(candidate)
    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise UnsafeUrl(
            f"Only http and https URLs can be loaded (got '{parsed.scheme or 'no scheme'}')"
        )

    host = parsed.hostname
    if not host:
        raise UnsafeUrl("That URL has no hostname")

    addresses = resolve_host(host)
    if not addresses:
        raise UnsafeUrl(f"Could not resolve '{host}'")

    for address in addresses:
        if _is_internal(address):
            raise UnsafeUrl(
                f"'{host}' resolves to a private or internal address and cannot be loaded"
            )

    return candidate


def resolve_safe_url(url: str) -> str:
    """Validate `url`, following redirects and validating each hop.

    Returns the final URL, which is what should actually be fetched.
    """
    import requests

    current = validate_public_http_url(url)
    for _ in range(MAX_REDIRECTS):
        try:
            response = requests.head(
                current, allow_redirects=False, timeout=15, headers={"User-Agent": "ResearchGPT"}
            )
        except requests.RequestException:
            # HEAD is not universally supported; the initial URL is validated,
            # so fetching it directly is still safe.
            return current

        if response.status_code not in (301, 302, 303, 307, 308):
            return current

        location = response.headers.get("Location")
        if not location:
            return current
        current = validate_public_http_url(requests.compat.urljoin(current, location))

    raise UnsafeUrl("Too many redirects")
