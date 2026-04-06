from fastapi import APIRouter, Request, HTTPException, Header, Depends, Query
from pydantic import BaseModel
from typing import Optional
import json as _json
import os
from datetime import datetime as _dt

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models import Invoice, Order, OrderStatus, PromoCode
from app.services.commerce.client import (
    create_checkout_session,
    verify_webhook,
    create_printful_order,
)

router = APIRouter(prefix="/commerce", tags=["commerce"])


async def _next_invoice_number(db: AsyncSession) -> str:
    """Génère le prochain numéro de facture séquentiel OVF-YYYY-XXXX."""
    year = _dt.now().year
    prefix = f"OVF-{year}-"
    result = await db.execute(
        select(Invoice.invoice_number)
        .where(Invoice.invoice_number.like(f"{prefix}%"))
        .order_by(Invoice.invoice_number.desc())
        .limit(1)
    )
    last = result.scalar()
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

DBDep = Annotated[AsyncSession, Depends(get_db)]


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
async def webhook(
    request: Request,
    db: DBDep,
    stripe_signature: str = Header(None, alias="stripe-signature"),
) -> dict:
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
        sess = event.get("data", {}).get("object", {})
        stripe_sid = sess.get("id", "")
        if stripe_sid:
            order = (await db.execute(
                select(Order).where(Order.stripe_session_id == stripe_sid)
            )).scalar_one_or_none()
            if order:
                if order.status != OrderStatus.paid:
                    order.status = OrderStatus.paid
                    await db.flush()
                existing_inv = (await db.execute(
                    select(Invoice).where(Invoice.order_id == order.id)
                )).scalar_one_or_none()
                if not existing_inv:
                    amount_total = (sess.get("amount_total") or 0) / 100
                    tva_rate = 0.20
                    amount_ttc = round(amount_total, 2)
                    amount_ht = round(amount_ttc / (1 + tva_rate), 2)
                    amount_tva = round(amount_ttc - amount_ht, 2)
                    customer_details = sess.get("customer_details") or {}
                    inv = Invoice(
                        order_id=order.id,
                        invoice_number=await _next_invoice_number(db),
                        user_email=sess.get("customer_email") or customer_details.get("email", ""),
                        user_name=customer_details.get("name", ""),
                        billing_address=_json.dumps(customer_details.get("address") or {}),
                        items_json=_json.dumps([{
                            "description": "Commande Overfitted",
                            "quantity": 1,
                            "unit_price_ht": amount_ht,
                        }]),
                        amount_ht=amount_ht,
                        tva_rate=tva_rate,
                        amount_tva=amount_tva,
                        amount_ttc=amount_ttc,
                        discount_amount=0.0,
                    )
                    db.add(inv)
                    await db.commit()

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


# ─── Promo validate ────────────────────────────────────────────────────────

class PromoValidateRequest(BaseModel):
    code: str
    cart_total_ht: float   # montant HT avant remise, en euros


class PromoValidateResponse(BaseModel):
    valid: bool
    discount_type: str
    discount_value: float
    discount_amount: float
    final_price_ht: float
    message: str


@router.post("/promo/validate", response_model=PromoValidateResponse)
async def validate_promo(body: PromoValidateRequest, db: DBDep):
    """Vérifie un code promo : actif, non expiré, quota non atteint.

    Retourne le montant de la remise et le prix final HT.
    N'incrémente PAS uses_count (cela se fait à la confirmation de commande).
    """
    from datetime import datetime, timezone as _tz
    code = body.code.strip().upper()
    promo = (await db.execute(
        select(PromoCode).where(PromoCode.code == code)
    )).scalar_one_or_none()

    def _invalid(msg: str) -> PromoValidateResponse:
        return PromoValidateResponse(
            valid=False,
            discount_type="percent",
            discount_value=0.0,
            discount_amount=0.0,
            final_price_ht=round(body.cart_total_ht, 2),
            message=msg,
        )

    if not promo:
        return _invalid("Code promo invalide.")
    if not promo.is_active:
        return _invalid("Code promo inactif.")
    if promo.expires_at and promo.expires_at.replace(tzinfo=_tz.utc) < datetime.now(_tz.utc):
        return _invalid("Code promo expiré.")
    if promo.max_uses != 0 and promo.uses_count >= promo.max_uses:
        return _invalid("Code promo épuisé.")

    if promo.discount_type == "fixed":
        discount_amount = round(min(promo.discount_value, body.cart_total_ht), 2)
        label = f"{promo.discount_value:.2f} € de remise"
    else:
        discount_amount = round(body.cart_total_ht * promo.discount_value / 100, 2)
        label = f"{promo.discount_value:g}% de remise"
    final = round(body.cart_total_ht - discount_amount, 2)
    return PromoValidateResponse(
        valid=True,
        discount_type=promo.discount_type,
        discount_value=promo.discount_value,
        discount_amount=discount_amount,
        final_price_ht=final,
        message=f"Code valide — {label}.",
    )


# ─── Checkout confirm ──────────────────────────────────────────────────────

class CheckoutConfirmResponse(BaseModel):
    order_id: Optional[int]
    session_id: str
    status: str
    message: str


@router.get("/checkout/confirm", response_model=CheckoutConfirmResponse)
async def checkout_confirm(session_id: str = Query(...), db: DBDep = None):
    """Vérifie une Stripe Checkout Session après redirection success_url.

    Retourne le statut de la session et l'order_id associé si présent.
    """
    import stripe as _stripe
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
    if not stripe_key:
        order = (await db.execute(
            select(Order).where(Order.stripe_session_id == session_id)
        )).scalar_one_or_none()
        return CheckoutConfirmResponse(
            order_id=order.id if order else None,
            session_id=session_id,
            status="paid" if order and order.status == OrderStatus.paid else "unknown",
            message="Mode dev — Stripe non configuré.",
        )

    _stripe.api_key = stripe_key
    try:
        session = _stripe.checkout.Session.retrieve(session_id)
    except _stripe.InvalidRequestError:
        raise HTTPException(status_code=404, detail="Session Stripe introuvable.")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erreur Stripe : {exc}")

    order = (await db.execute(
        select(Order).where(Order.stripe_session_id == session_id)
    )).scalar_one_or_none()

    return CheckoutConfirmResponse(
        order_id=order.id if order else None,
        session_id=session_id,
        status=session.payment_status,
        message="Paiement confirmé." if session.payment_status == "paid" else "Paiement en attente.",
    )


# ─── Invoice PDF ───────────────────────────────────────────────────────────

@router.get("/invoice/{order_id}")
async def get_invoice_pdf(order_id: int, db: DBDep):
    """Génère la facture PDF d'une commande via reportlab.

    Retourne application/pdf avec Content-Disposition attachment.
    """
    from fastapi.responses import Response as _Response
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    import io as _io
    import json as _json

    invoice = (await db.execute(
        select(Invoice).where(Invoice.order_id == order_id)
    )).scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable pour cette commande.")

    buf = _io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    elements: list = []

    elements.append(Paragraph("OVERFITTED.IO", styles["Title"]))
    elements.append(Paragraph("SIRET : [À COMPLÉTER] — N° TVA : FR[XX][SIRET]", small))
    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph(f"<b>FACTURE {invoice.invoice_number}</b>", styles["Heading2"]))
    elements.append(Paragraph(f"Date : {invoice.issued_at.strftime('%d/%m/%Y')}", styles["Normal"]))
    elements.append(Spacer(1, 4 * mm))

    elements.append(Paragraph("<b>Acheteur</b>", styles["Heading3"]))
    elements.append(Paragraph(invoice.user_name, styles["Normal"]))
    elements.append(Paragraph(invoice.user_email, styles["Normal"]))
    if invoice.billing_address:
        try:
            addr = _json.loads(invoice.billing_address)
            parts = filter(None, [
                addr.get("line1"), addr.get("line2"),
                f"{addr.get('postal_code', '')} {addr.get('city', '')}".strip(),
                addr.get("country"),
            ])
            for part in parts:
                elements.append(Paragraph(part, styles["Normal"]))
        except Exception:
            pass
    elements.append(Spacer(1, 6 * mm))

    try:
        items = _json.loads(invoice.items_json)
    except Exception:
        items = []

    table_data = [["Description", "Qté", "P.U. HT", "Total HT"]]
    for item in items:
        unit = float(item.get("unit_price_ht", 0))
        qty = int(item.get("quantity", 1))
        table_data.append([
            item.get("description", ""),
            str(qty),
            f"{unit:.2f} €",
            f"{unit * qty:.2f} €",
        ])

    if invoice.discount_amount and invoice.discount_amount > 0:
        table_data.append([
            f"Remise ({invoice.promo_code or 'code promo'})",
            "", "", f"-{invoice.discount_amount:.2f} €",
        ])

    table_data.extend([
        ["", "", "Sous-total HT", f"{invoice.amount_ht:.2f} €"],
        ["", "", f"TVA ({invoice.tva_rate * 100:.0f}%)", f"{invoice.amount_tva:.2f} €"],
        ["", "", "<b>TOTAL TTC</b>", f"<b>{invoice.amount_ttc:.2f} €</b>"],
    ])

    tbl = Table(table_data, colWidths=[90 * mm, 15 * mm, 40 * mm, 30 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -4), [colors.white, colors.HexColor("#f5f5f5")]),
        ("GRID", (0, 0), (-1, -4), 0.25, colors.lightgrey),
        ("LINEABOVE", (0, -3), (-1, -3), 0.5, colors.grey),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph(
        "Produit fabriqué à la demande — pas de droit de rétractation (art. L221-28 12° C. conso.).",
        small,
    ))
    elements.append(Paragraph("Paiement reçu via Stripe. TVA française 20%.", small))

    doc.build(elements)
    buf.seek(0)

    return _Response(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'},
    )
