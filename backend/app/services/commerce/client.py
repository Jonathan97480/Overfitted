"""Commerce — client Stripe et client Printful.

Toute logique métier est ici, les endpoints HTTP sont dans router.py.
Aucune dépendance directe à FastAPI dans ce fichier.
"""

import os
import httpx
import stripe as _stripe

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
PRINTFUL_API_KEY = os.getenv("PRINTFUL_API_KEY", "")
PRINTFUL_BASE_URL = "https://api.printful.com"

_stripe.api_key = STRIPE_SECRET_KEY


# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------

def create_checkout_session(
    design_id: int,
    product_name: str,
    unit_amount: int,  # centimes
    quantity: int,
    success_url: str,
    cancel_url: str,
) -> dict:
    """Crée une Stripe Checkout Session et retourne son id + url de paiement.

    unit_amount est en centimes (ex: 2500 = 25.00 EUR).
    Lève ValueError si STRIPE_SECRET_KEY n'est pas configurée.
    """
    if not STRIPE_SECRET_KEY:
        raise ValueError("STRIPE_SECRET_KEY non configurée dans les variables d'environnement")

    session = _stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": product_name},
                    "unit_amount": unit_amount,
                },
                "quantity": quantity,
            }
        ],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"design_id": str(design_id)},
    )
    return {"session_id": session.id, "url": session.url}


def verify_webhook(payload: bytes, sig_header: str) -> dict:
    """Vérifie la signature d'un webhook Stripe et retourne l'événement.

    Lève ValueError si la signature est invalide ou le secret manquant.
    """
    if not STRIPE_WEBHOOK_SECRET:
        raise ValueError("STRIPE_WEBHOOK_SECRET non configurée dans les variables d'environnement")
    try:
        event = _stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        return dict(event)
    except _stripe.SignatureVerificationError as e:
        raise ValueError(f"Signature webhook Stripe invalide : {e}")


# ---------------------------------------------------------------------------
# Printful
# ---------------------------------------------------------------------------

def create_printful_order(
    variant_id: str,
    quantity: int,
    shipping_address: dict,
    design_url: str,
) -> dict:
    """Soumet une commande POD à Printful.

    shipping_address doit contenir : name, address1, city, country_code, zip.
    Retourne le dict de la commande Printful (id, status, etc.).
    Lève ValueError si PRINTFUL_API_KEY manquant ou si l'API répond en erreur.
    """
    if not PRINTFUL_API_KEY:
        raise ValueError("PRINTFUL_API_KEY non configurée dans les variables d'environnement")

    payload = {
        "recipient": shipping_address,
        "items": [
            {
                "variant_id": variant_id,
                "quantity": quantity,
                "files": [{"url": design_url}],
            }
        ],
    }
    headers = {"Authorization": f"Bearer {PRINTFUL_API_KEY}"}

    try:
        resp = httpx.post(
            f"{PRINTFUL_BASE_URL}/orders",
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        resp.raise_for_status()
    except httpx.ConnectError:
        raise ValueError(f"Printful API injoignable sur {PRINTFUL_BASE_URL}")
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Printful erreur HTTP {e.response.status_code}: {e.response.text}")

    return resp.json().get("result", {})


def get_printful_order(printful_order_id: str) -> dict:
    """Récupère le statut d'une commande Printful par son id.

    Lève ValueError si PRINTFUL_API_KEY manquant ou erreur API.
    """
    if not PRINTFUL_API_KEY:
        raise ValueError("PRINTFUL_API_KEY non configurée dans les variables d'environnement")

    headers = {"Authorization": f"Bearer {PRINTFUL_API_KEY}"}
    try:
        resp = httpx.get(
            f"{PRINTFUL_BASE_URL}/orders/{printful_order_id}",
            headers=headers,
            timeout=15.0,
        )
        resp.raise_for_status()
    except httpx.ConnectError:
        raise ValueError(f"Printful API injoignable sur {PRINTFUL_BASE_URL}")
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Printful erreur HTTP {e.response.status_code}: {e.response.text}")

    return resp.json().get("result", {})
