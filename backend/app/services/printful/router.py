"""
Printful — router FastAPI.

Endpoints publics (front-facing) :
  GET  /api/products                   — liste du store Printful
  GET  /api/products/{product_id}      — détail produit + variants
  POST /api/products/mockup            — lance une tâche mockup (async)
  GET  /api/products/mockup/{task_key} — poll le statut d'une tâche mockup
  POST /api/shipping/rates             — calcule les options de livraison

Webhook entrant :
  POST /webhooks/printful              — reçoit les événements Printful
"""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Order, OrderStatus
from app.services.printful.client import (
    create_mockup_task,
    get_mockup_task,
    get_order,
    get_shipping_rates,
    get_store_product,
    list_store_products,
    resolve_api_key,
    resolve_store_id,
)

router = APIRouter(tags=["printful"])

DBDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _key(db: AsyncSession) -> str:
    try:
        return await resolve_api_key(db)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


async def _key_and_store(db: AsyncSession) -> tuple[str, int | None]:
    api_key = await _key(db)
    store_id = await resolve_store_id(api_key, db)
    return api_key, store_id


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.get("/api/products")
async def products_list(
    db: DBDep,
    offset: int = 0,
    limit: int = 20,
) -> dict[str, Any]:
    """Liste les produits du store Printful avec pagination.

    Paramètres : offset (défaut: 0), limit (défaut: 20, max: 100)
    Retourne   : { paging: { total, offset, limit }, result: [ SyncProduct ] }
    """
    limit = min(limit, 100)
    api_key, store_id = await _key_and_store(db)
    try:
        return await list_store_products(api_key, offset=offset, limit=limit, store_id=store_id)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/api/products/mockup/{task_key}")
async def mockup_status(task_key: str, db: DBDep) -> dict[str, Any]:
    """Poll le statut d'une tâche mockup Printful.

    Retourne { result: { task_key, status: pending|completed|failed, mockups: [...] } }
    """
    api_key = await _key(db)
    try:
        return await get_mockup_task(api_key, task_key)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/api/products/{product_id}")
async def product_detail(product_id: int, db: DBDep) -> dict[str, Any]:
    """Détail d'un produit Printful — inclut sync_variants (taille, couleur, dispo).

    Retourne { result: { sync_product: {...}, sync_variants: [...] } }
    sync_variant fields utiles : id, name, size, color, availability_status, retail_price
    """
    api_key, store_id = await _key_and_store(db)
    try:
        return await get_store_product(api_key, product_id, store_id=store_id)
    except ValueError as exc:
        status = 404 if "404" in str(exc) else 502
        raise HTTPException(status_code=status, detail=str(exc))


# ---------------------------------------------------------------------------
# Mockup Generator
# ---------------------------------------------------------------------------

class MockupTaskRequest(BaseModel):
    product_id: int
    variant_ids: list[int]
    image_url: str
    format: str = "jpg"


@router.post("/api/products/mockup")
async def mockup_create(body: MockupTaskRequest, db: DBDep) -> dict[str, Any]:
    """Lance une tâche de génération de mockup Printful.

    Retourne { result: { task_key: "gt-...", status: "pending" } }
    Poller ensuite GET /api/products/mockup/{task_key} jusqu'à status=completed.
    """
    api_key = await _key(db)
    try:
        return await create_mockup_task(
            api_key,
            product_id=body.product_id,
            variant_ids=body.variant_ids,
            image_url=body.image_url,
            format_=body.format,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ---------------------------------------------------------------------------
# Shipping Rates
# ---------------------------------------------------------------------------

class ShippingRatesRequest(BaseModel):
    recipient: dict[str, Any]  # { country_code, state_code?, city?, zip? }
    items: list[dict[str, Any]]  # [ { variant_id: int, quantity: int } ]
    currency: str = "EUR"
    locale: str = "fr_FR"


@router.post("/api/shipping/rates")
async def shipping_rates(body: ShippingRatesRequest, db: DBDep) -> dict[str, Any]:
    """Calcule les options de livraison Printful pour un panier.

    recipient.country_code est obligatoire (ex: "FR", "US").
    Retourne { result: [ { id, name, rate, currency, minDeliveryDays, maxDeliveryDays } ] }
    """
    api_key = await _key(db)
    try:
        return await get_shipping_rates(
            api_key,
            recipient=body.recipient,
            items=body.items,
            currency=body.currency,
            locale=body.locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ---------------------------------------------------------------------------
# Webhook Printful entrant
# ---------------------------------------------------------------------------

# Mapping statuts Printful → OrderStatus interne
_PRINTFUL_STATUS_MAP: dict[str, OrderStatus] = {
    "fulfilled": OrderStatus.shipped,
    "shipped": OrderStatus.shipped,
    "canceled": OrderStatus.cancelled,
    "failed": OrderStatus.cancelled,
}


@router.post("/webhooks/printful", status_code=200)
async def printful_webhook(request: Request, db: DBDep) -> dict[str, str]:
    """Reçoit les événements Printful et met à jour les commandes en base.

    Événements traités :
      - package_shipped  → Order.status = shipped, printful_order_id sauvegardé
      - order_failed     → Order.status = cancelled
      - order_canceled   → Order.status = cancelled

    Retourne toujours {"received": "ok"} pour acquitter l'événement.
    """
    try:
        payload: dict[str, Any] = await request.json()
    except Exception:
        # Corps invalide — on acquitte quand même pour éviter les retries Printful
        return {"received": "ok"}

    event_type: str = payload.get("type", "")
    data: dict[str, Any] = payload.get("data", {})

    # Extraire l'id de commande Printful
    order_data: dict[str, Any] = data.get("order", data)
    printful_order_id: str | None = str(order_data.get("id")) if order_data.get("id") else None

    if not printful_order_id:
        return {"received": "ok"}

    # Retrouver la commande en base
    order = (
        await db.execute(
            select(Order).where(Order.printful_order_id == printful_order_id)
        )
    ).scalar_one_or_none()

    if order is None:
        # Commande inconnue — acquitter silencieusement
        return {"received": "ok"}

    if event_type == "package_shipped":
        order.status = OrderStatus.shipped
        await db.commit()

    elif event_type in ("order_failed", "order_canceled"):
        order.status = OrderStatus.cancelled
        await db.commit()

    return {"received": "ok"}


# ---------------------------------------------------------------------------
# Statut d'une commande Printful (suivi client)
# ---------------------------------------------------------------------------

@router.get("/commerce/order/{order_id}/printful")
async def printful_order_status(order_id: int, db: DBDep) -> dict[str, Any]:
    """Retourne le statut live Printful d'une commande interne.

    Effectue une requête Printful en temps réel. Prévoir un cache éventuel
    côté frontend (RTK Query avec keepUnusedDataFor).
    """
    order = (
        await db.execute(select(Order).where(Order.id == order_id))
    ).scalar_one_or_none()

    if order is None:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    if not order.printful_order_id:
        raise HTTPException(status_code=404, detail="Commande non encore soumise à Printful")

    api_key = await _key(db)
    try:
        printful_data = await get_order(api_key, order.printful_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {
        "order_id": order_id,
        "printful_order_id": order.printful_order_id,
        "internal_status": order.status,
        "printful_status": printful_data.get("status"),
        "shipments": printful_data.get("shipments", []),
        "estimated_delivery": printful_data.get("estimated_delivery_dates"),
    }
