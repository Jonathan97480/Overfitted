"""
Printful API — client HTTP async.

Toutes les fonctions prennent `api_key` en paramètre (résolu par le router
via la DB Settings ou l'env). Aucune dépendance FastAPI ici.

Base URL : https://api.printful.com
Auth      : Authorization: Bearer {api_key}
Rate limit: 120 req/min
"""
from __future__ import annotations

import base64
import hashlib
import os
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

PRINTFUL_BASE_URL = "https://api.printful.com"
_TIMEOUT = 20.0


# ---------------------------------------------------------------------------
# Résolution de la clé API depuis la DB Settings (+ fallback env)
# ---------------------------------------------------------------------------

def _get_fernet():
    from cryptography.fernet import Fernet
    key = os.environ.get("SETTINGS_ENCRYPTION_KEY")
    if not key:
        raw = hashlib.sha256(b"overfitted_dev_settings_enc_key").digest()
        key = base64.urlsafe_b64encode(raw).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


async def resolve_api_key(db: AsyncSession) -> str:
    """Retourne PRINTFUL_API_KEY depuis la DB (déchiffrée) ou l'env.

    Lève ValueError si aucune clé n'est disponible.
    """
    from app.models import Setting

    row = (
        await db.execute(select(Setting).where(Setting.key == "PRINTFUL_API_KEY"))
    ).scalar_one_or_none()

    if row:
        try:
            return _get_fernet().decrypt(row.value.encode()).decode()
        except Exception:
            pass

    key = os.environ.get("PRINTFUL_API_KEY", "")
    if not key:
        raise ValueError("PRINTFUL_API_KEY non configurée (Settings DB ou variable d'env)")
    return key


async def resolve_store_id(api_key: str, db: AsyncSession) -> int | None:
    """Retourne PRINTFUL_STORE_ID depuis la DB, sinon auto-détecte via GET /stores.

    Pour les tokens OAuth Printful multi-store, le store_id est obligatoire.
    Il peut être configuré dans Settings (clé PRINTFUL_STORE_ID) ou auto-détecté
    si le compte ne possède qu'un seul store.

    Lève ValueError si le store_id est introuvable (token sans stores liés).
    """
    from app.models import Setting

    row = (
        await db.execute(select(Setting).where(Setting.key == "PRINTFUL_STORE_ID"))
    ).scalar_one_or_none()

    if row:
        try:
            raw = _get_fernet().decrypt(row.value.encode()).decode()
            return int(raw)
        except Exception:
            try:
                return int(row.value)
            except Exception:
                pass

    store_id_env = os.environ.get("PRINTFUL_STORE_ID", "")
    if store_id_env:
        return int(store_id_env)

    # Auto-détection : récupère le premier store disponible
    try:
        stores = await get_stores(api_key)
        result = stores.get("result", [])
        if result:
            return int(result[0]["id"])
    except Exception:
        pass

    return None


async def get_stores(api_key: str) -> dict[str, Any]:
    """GET /stores — liste les stores associés au token OAuth."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{PRINTFUL_BASE_URL}/stores",
            headers=_headers(api_key),
        )
    _raise_for_printful(resp)
    return resp.json()


def _store_header(api_key: str, store_id: int | None) -> dict[str, str]:
    """En-têtes avec X-PF-Store-Id optionnel."""
    h = _headers(api_key)
    if store_id is not None:
        h["X-PF-Store-Id"] = str(store_id)
    return h


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _raise_for_printful(resp: httpx.Response) -> None:
    """Lève ValueError avec le message Printful si la réponse est une erreur."""
    if resp.status_code >= 400:
        try:
            detail = resp.json().get("result", resp.text)
        except Exception:
            detail = resp.text
        raise ValueError(f"Printful {resp.status_code}: {detail}")


# ---------------------------------------------------------------------------
# Store Products (Sync Products = notre catalogue Printful)
# ---------------------------------------------------------------------------

async def list_store_products(
    api_key: str,
    offset: int = 0,
    limit: int = 20,
    store_id: int | None = None,
) -> dict[str, Any]:
    """GET /store/products — liste les produits synchronisés du store.

    Retourne { paging: {...}, result: [ SyncProduct, ... ] }
    store_id : requis pour les tokens OAuth multi-store (passé via X-PF-Store-Id).
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{PRINTFUL_BASE_URL}/store/products",
            headers=_store_header(api_key, store_id),
            params={"offset": offset, "limit": limit},
        )
    _raise_for_printful(resp)
    return resp.json()


async def get_store_product(
    api_key: str,
    product_id: int | str,
    store_id: int | None = None,
) -> dict[str, Any]:
    """GET /store/products/{id} — détail d'un produit + ses sync_variants.

    Retourne { result: { sync_product: {...}, sync_variants: [...] } }
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{PRINTFUL_BASE_URL}/store/products/{product_id}",
            headers=_store_header(api_key, store_id),
        )
    _raise_for_printful(resp)
    return resp.json()


# ---------------------------------------------------------------------------
# Shipping Rates
# ---------------------------------------------------------------------------

async def get_shipping_rates(
    api_key: str,
    recipient: dict[str, Any],
    items: list[dict[str, Any]],
    currency: str = "EUR",
    locale: str = "fr_FR",
) -> dict[str, Any]:
    """POST /shipping/rates — calcule les options de livraison.

    recipient : { country_code, state_code?, city?, zip? }
    items     : [ { variant_id, quantity } ]
    Retourne  : { result: [ { id, name, rate, currency, minDeliveryDays, ... } ] }
    """
    payload: dict[str, Any] = {
        "recipient": recipient,
        "items": items,
        "currency": currency,
        "locale": locale,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{PRINTFUL_BASE_URL}/shipping/rates",
            headers=_headers(api_key),
            json=payload,
        )
    _raise_for_printful(resp)
    return resp.json()


# ---------------------------------------------------------------------------
# Mockup Generator (async task flow)
# ---------------------------------------------------------------------------

async def create_mockup_task(
    api_key: str,
    product_id: int | str,
    variant_ids: list[int],
    image_url: str,
    format_: str = "jpg",
    placement: str = "front",
    position: dict[str, int] | None = None,
    store_id: int | None = None,
) -> dict[str, Any]:
    """POST /mockup-generator/create-task/{product_id} — démarre la génération.

    placement : emplacement d'impression (front | back | sleeve_left | sleeve_right…)
    position  : optionnel — dict {area_width, area_height, width, height, top, left}
                Si absent, Printful utilise le positionnement par défaut du template.

    Retourne { result: { task_key: "gt-...", status: "pending" } }
    """
    file_entry: dict[str, Any] = {"placement": placement, "image_url": image_url}
    if position:
        file_entry["position"] = position

    payload: dict[str, Any] = {
        "variant_ids": variant_ids,
        "format": format_,
        "files": [file_entry],
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{PRINTFUL_BASE_URL}/mockup-generator/create-task/{product_id}",
            headers=_store_header(api_key, store_id),
            json=payload,
        )
    _raise_for_printful(resp)
    return resp.json()


async def get_mockup_task(
    api_key: str,
    task_key: str,
    store_id: int | None = None,
) -> dict[str, Any]:
    """GET /mockup-generator/task?task_key=... — poll jusqu'à completed.

    Retourne { result: { task_key, status, mockups: [...] } }
    status possibles: pending | completed | failed
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{PRINTFUL_BASE_URL}/mockup-generator/task",
            headers=_store_header(api_key, store_id),
            params={"task_key": task_key},
        )
    _raise_for_printful(resp)
    return resp.json()


# ---------------------------------------------------------------------------
# Orders (helpers complémentaires au commerce/client.py existant)
# ---------------------------------------------------------------------------

async def submit_order(
    api_key: str,
    recipient: dict[str, Any],
    items: list[dict[str, Any]],
    confirm: bool = True,
) -> dict[str, Any]:
    """POST /orders[?confirm=1] — crée (et confirme) une commande Printful.

    items: [ { sync_variant_id: int, quantity: int } ]
    Retourne le dict commande Printful (id, status, costs, ...).
    """
    payload: dict[str, Any] = {
        "recipient": recipient,
        "items": items,
    }
    params = {"confirm": "1"} if confirm else {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{PRINTFUL_BASE_URL}/orders",
            headers=_headers(api_key),
            json=payload,
            params=params,
        )
    _raise_for_printful(resp)
    return resp.json().get("result", {})


async def get_order(
    api_key: str,
    printful_order_id: int | str,
) -> dict[str, Any]:
    """GET /orders/{id} — statut + tracking d'une commande."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{PRINTFUL_BASE_URL}/orders/{printful_order_id}",
            headers=_headers(api_key),
        )
    _raise_for_printful(resp)
    return resp.json().get("result", {})


# ---------------------------------------------------------------------------
# Catalogue Printful (tous les produits disponibles, pas ceux du store)
# ---------------------------------------------------------------------------

async def list_catalog_products(
    api_key: str,
    offset: int = 0,
    limit: int = 20,
    category_id: int | None = None,
) -> dict[str, Any]:
    """GET /v2/catalog-products — liste tous les produits du catalogue Printful.

    Utilise l'API v2 (469+ produits vs 98 en v1, inclut les marques EU comme Stanley/Stella).
    Normalise la réponse en { result: [...], paging: {total, offset, limit} } pour
    compatibilité avec le code existant. Ajoute type_name = name pour le frontend.
    """
    params: dict[str, Any] = {"offset": offset, "limit": min(limit, 100)}
    if category_id is not None:
        params["category_id"] = category_id
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{PRINTFUL_BASE_URL}/v2/catalog-products",
            headers=_headers(api_key),
            params=params,
        )
    _raise_for_printful(resp)
    data = resp.json()
    products = data.get("data", [])
    # Normaliser v2 → format v1 : ajouter type_name depuis name pour compat frontend
    for p in products:
        if "type_name" not in p:
            p["type_name"] = p.get("name", "")
    return {"result": products, "paging": data.get("paging", {})}


async def get_catalog_product(
    api_key: str,
    product_id: int | str,
) -> dict[str, Any]:
    """GET /products/{id} — détail d'un produit catalogue avec ses variants.

    Retourne { result: { product: {...}, variants: [ { id, name, size, color, price, ... } ] } }
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            f"{PRINTFUL_BASE_URL}/products/{product_id}",
            headers=_headers(api_key),
        )
    _raise_for_printful(resp)
    return resp.json()


async def create_store_product(
    api_key: str,
    store_id: int | None,
    name: str,
    sync_variants: list[dict[str, Any]],
    thumbnail: str | None = None,
) -> dict[str, Any]:
    """POST /store/products — ajoute un produit au store Printful.

    sync_variants: [ { variant_id: int, retail_price: str, files?: [...] } ]
    Retourne { result: { id, sync_product: {...}, sync_variants: [...] } }
    """
    payload: dict[str, Any] = {
        "sync_product": {"name": name},
        "sync_variants": sync_variants,
    }
    if thumbnail:
        payload["sync_product"]["thumbnail"] = thumbnail
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{PRINTFUL_BASE_URL}/store/products",
            headers=_store_header(api_key, store_id),
            json=payload,
        )
    _raise_for_printful(resp)
    return resp.json()
