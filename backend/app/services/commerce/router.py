from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os

from app.services.commerce.client import (
    create_checkout_session,
    verify_webhook,
    create_printful_order,
)

router = APIRouter(prefix="/commerce", tags=["commerce"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class CheckoutRequest(BaseModel):
    design_id: int
    product_name: str
    unit_amount: int    # centimes
    quantity: int = 1
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class PrintfulOrderRequest(BaseModel):
    variant_id: str
    quantity: int = 1
    design_url: str
    shipping_address: dict   # name, address1, city, country_code, zip


@router.post("/checkout")
async def checkout(body: CheckoutRequest) -> dict:
    """Crée une Stripe Checkout Session pour un design.

    Retourne { session_id, url } avec l'URL de paiement Stripe.
    """
    success = body.success_url or f"{FRONTEND_URL}/order/success"
    cancel = body.cancel_url or f"{FRONTEND_URL}/order/cancel"
    try:
        return create_checkout_session(
            design_id=body.design_id,
            product_name=body.product_name,
            unit_amount=body.unit_amount,
            quantity=body.quantity,
            success_url=success,
            cancel_url=cancel,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def webhook(request: Request, stripe_signature: str = Header(None, alias="stripe-signature")) -> dict:
    """Reçoit les événements Stripe (payment_intent.succeeded, etc.).

    Vérifie la signature HMAC via STRIPE_WEBHOOK_SECRET.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Header stripe-signature manquant")

    payload = await request.body()
    try:
        event = verify_webhook(payload, stripe_signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Traitement des événements métier
    event_type = event.get("type", "")
    if event_type == "checkout.session.completed":
        # TODO : créer l'Order en DB + déclencher soumission Printful
        pass

    return {"received": True, "type": event_type}


@router.post("/printful/order")
async def printful_order(body: PrintfulOrderRequest) -> dict:
    """Soumet une commande POD à Printful (après paiement confirmé).

    En production, cet endpoint est appelé depuis le webhook Stripe,
    pas directement depuis le frontend.
    """
    try:
        return create_printful_order(
            variant_id=body.variant_id,
            quantity=body.quantity,
            shipping_address=body.shipping_address,
            design_url=body.design_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
