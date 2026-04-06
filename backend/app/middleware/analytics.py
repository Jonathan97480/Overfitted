"""
Middleware analytics — compteur Redis de vues produits et pages.

- GET /api/products/{id}  → INCR views:{product_id}  (vues produit)
- GET /* (pages publiques) → INCR pageviews:{path}    (top pages)

Redis est requis mais optionnel : si absent ou timeout, le middleware est transparent.
"""
from __future__ import annotations

import os
import re
from datetime import date

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_PRODUCT_RE = re.compile(r"^/api/products/(\d+)$")

# Chemins ignorés pour le comptage générique
_SKIP_PREFIXES = ("/api/", "/admin", "/docs", "/openapi", "/static", "/fixer", "/_next")

try:
    import redis.asyncio as aioredis  # type: ignore

    _redis_client: "aioredis.Redis | None" = aioredis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=1,
    )
except Exception:
    _redis_client = None


async def _redis_incr(key: str) -> None:
    """INCR Redis en silence — no-op si Redis indisponible."""
    if _redis_client is None:
        return
    try:
        await _redis_client.incr(key)
    except Exception:
        pass


async def get_top_pages(limit: int = 10) -> list[dict]:
    """Retourne les N pages les plus vues depuis Redis. Retourne [] si Redis absent."""
    if _redis_client is None:
        return []
    try:
        keys = await _redis_client.keys("pageviews:*")
        if not keys:
            return []
        counts = await _redis_client.mget(*keys)
        items = [
            {"url": k.replace("pageviews:", ""), "views": int(v or 0)}
            for k, v in zip(keys, counts)
            if v
        ]
        items.sort(key=lambda x: x["views"], reverse=True)
        return items[:limit]
    except Exception:
        return []


async def get_product_views(product_ids: list[int]) -> dict[int, int]:
    """Retourne {product_id: views_count} pour la liste donnée. Retourne {} si Redis absent."""
    if not product_ids or _redis_client is None:
        return {}
    try:
        keys = [f"views:{pid}" for pid in product_ids]
        counts = await _redis_client.mget(*keys)
        return {
            pid: int(v or 0)
            for pid, v in zip(product_ids, counts)
        }
    except Exception:
        return {}


class AnalyticsMiddleware(BaseHTTPMiddleware):
    """Middleware Starlette — enregistre les vues via Redis."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Uniquement les GET réussis
        if request.method != "GET" or response.status_code >= 400:
            return response

        path = request.url.path

        # Vues produit public
        m = _PRODUCT_RE.match(path)
        if m:
            product_id = m.group(1)
            await _redis_incr(f"views:{product_id}")
            await _redis_incr(f"pageviews:{path}")
            return response

        # Pages publiques génériques (exclure routes admin/API/assets)
        if not any(path.startswith(prefix) for prefix in _SKIP_PREFIXES):
            await _redis_incr(f"pageviews:{path}")

        return response
