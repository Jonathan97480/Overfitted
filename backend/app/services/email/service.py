"""
Service email transactionnel — Overfitted.io
Utilise fastapi-mail + Jinja2 pour tous les emails transactionnels.

Configuration via variables d'environnement :
  MAIL_FROM        ex: noreply@overfitted.io
  MAIL_USERNAME    ex: noreply@overfitted.io
  MAIL_PASSWORD    ex: xxxxxxxx
  MAIL_SERVER      ex: smtp.mailgun.org
  MAIL_PORT        ex: 587
  MAIL_STARTTLS    ex: true
  MAIL_SSL_TLS     ex: false
  FRONTEND_URL     ex: https://overfitted.io

Si MAIL_FROM est absent, les emails sont loggés en console (dev mode).
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

# ─── Jinja2 setup ──────────────────────────────────────────────────────────

_TEMPLATES_DIR = Path(__file__).parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _render(template_name: str, context: dict[str, Any]) -> str:
    tpl = _jinja_env.get_template(template_name)
    return tpl.render(**context)


# ─── FastMail setup (lazy — instancié uniquement si MAIL_FROM est défini) ──

def _get_fastmail():
    """Retourne une instance FastMail ou None si la config est absente."""
    mail_from = os.getenv("MAIL_FROM")
    if not mail_from:
        return None

    try:
        from fastapi_mail import ConnectionConfig, FastMail

        conf = ConnectionConfig(
            MAIL_USERNAME=os.getenv("MAIL_USERNAME", mail_from),
            MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
            MAIL_FROM=mail_from,
            MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "Overfitted.io"),
            MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
            MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.mailgun.org"),
            MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "true").lower() == "true",
            MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "false").lower() == "true",
            USE_CREDENTIALS=bool(os.getenv("MAIL_PASSWORD")),
            VALIDATE_CERTS=True,
        )
        return FastMail(conf)
    except Exception:
        logger.warning("fastapi-mail non configuré — emails désactivés.")
        return None


# ─── Envoi générique ───────────────────────────────────────────────────────

async def _send(to: str, subject: str, html_body: str) -> None:
    """Envoie un email HTML. En mode dev (pas de MAIL_FROM), log en console."""
    mail_from = os.getenv("MAIL_FROM")
    if not mail_from:
        logger.info(
            "[EMAIL-DEV] To: %s | Subject: %s\n--- HTML (tronqué) ---\n%s\n---",
            to, subject, html_body[:400],
        )
        return

    try:
        from fastapi_mail import MessageSchema, MessageType
        fm = _get_fastmail()
        if fm is None:
            return
        message = MessageSchema(
            subject=subject,
            recipients=[to],
            body=html_body,
            subtype=MessageType.html,
        )
        await fm.send_message(message)
    except Exception as exc:
        logger.error("Échec envoi email à %s : %s", to, exc)


# ─── Fonctions métier ──────────────────────────────────────────────────────

_FRONTEND_URL = lambda: os.getenv("FRONTEND_URL", "http://localhost:3000")  # noqa: E731


async def send_verification_email(to: str, display_name: str | None, token: str) -> None:
    """Email de vérification d'adresse email post-inscription."""
    verify_url = f"{_FRONTEND_URL()}/verify-email?token={token}"
    html = _render("verify_email.html", {
        "display_name": display_name or to.split("@")[0],
        "verify_url": verify_url,
        "frontend_url": _FRONTEND_URL(),
    })
    await _send(to, "Vérifiez votre email — Overfitted.io", html)


async def send_welcome_email(to: str, display_name: str | None) -> None:
    """Email de bienvenue après vérification réussie."""
    html = _render("welcome.html", {
        "display_name": display_name or to.split("@")[0],
        "shop_url": f"{_FRONTEND_URL()}/shop",
        "upload_url": f"{_FRONTEND_URL()}/upload",
        "frontend_url": _FRONTEND_URL(),
    })
    await _send(to, "Bienvenue dans le chaos organique — Overfitted.io", html)


async def send_password_reset_email(to: str, display_name: str | None, token: str) -> None:
    """Email de réinitialisation de mot de passe."""
    reset_url = f"{_FRONTEND_URL()}/reset-password?token={token}"
    html = _render("reset_password.html", {
        "display_name": display_name or to.split("@")[0],
        "reset_url": reset_url,
        "frontend_url": _FRONTEND_URL(),
    })
    await _send(to, "Réinitialisation de mot de passe — Overfitted.io", html)


async def send_order_confirmation_email(
    to: str,
    display_name: str | None,
    order_id: int,
    invoice_number: str | None,
    items: list[dict],
    amount_ttc: float,
) -> None:
    """Email de confirmation de commande post-paiement Stripe."""
    tracking_url = f"{_FRONTEND_URL()}/account/orders"
    invoice_url = f"{_FRONTEND_URL()}/account/orders" if not invoice_number else None
    html = _render("order_confirmation.html", {
        "display_name": display_name or to.split("@")[0],
        "order_id": order_id,
        "invoice_number": invoice_number,
        "items": items,
        "amount_ttc": f"{amount_ttc:.2f}",
        "tracking_url": tracking_url,
        "invoice_url": invoice_url,
        "frontend_url": _FRONTEND_URL(),
    })
    await _send(to, f"Commande #{order_id} confirmée — Overfitted.io", html)


async def send_shipment_email(
    to: str,
    display_name: str | None,
    order_id: int,
    tracking_number: str | None,
    carrier: str | None,
    tracking_url: str | None,
) -> None:
    """Email d'expédition avec numéro de tracking."""
    html = _render("shipment.html", {
        "display_name": display_name or to.split("@")[0],
        "order_id": order_id,
        "tracking_number": tracking_number,
        "carrier": carrier or "Transporteur",
        "tracking_url": tracking_url,
        "account_url": f"{_FRONTEND_URL()}/account/orders",
        "frontend_url": _FRONTEND_URL(),
    })
    await _send(to, f"Votre commande #{order_id} est en route — Overfitted.io", html)


# ─── Preview (admin) ───────────────────────────────────────────────────────

AVAILABLE_TEMPLATES = {
    "verify_email": {
        "label": "Vérification email",
        "fn": lambda: _render("verify_email.html", {
            "display_name": "Human_Error_42",
            "verify_url": "https://overfitted.io/verify-email?token=PREVIEW_TOKEN",
            "frontend_url": "https://overfitted.io",
        }),
    },
    "welcome": {
        "label": "Bienvenue",
        "fn": lambda: _render("welcome.html", {
            "display_name": "Human_Error_42",
            "shop_url": "https://overfitted.io/shop",
            "upload_url": "https://overfitted.io/upload",
            "frontend_url": "https://overfitted.io",
        }),
    },
    "reset_password": {
        "label": "Reset mot de passe",
        "fn": lambda: _render("reset_password.html", {
            "display_name": "Human_Error_42",
            "reset_url": "https://overfitted.io/reset-password?token=PREVIEW_TOKEN",
            "frontend_url": "https://overfitted.io",
        }),
    },
    "order_confirmation": {
        "label": "Confirmation commande",
        "fn": lambda: _render("order_confirmation.html", {
            "display_name": "Human_Error_42",
            "order_id": 42,
            "invoice_number": "OVF-2026-0042",
            "items": [{"name": "HALLUCINATION DROP — T-Shirt L", "qty": 1, "price": "34.99"}],
            "amount_ttc": "34.99",
            "tracking_url": "https://overfitted.io/account/orders",
            "invoice_url": None,
            "frontend_url": "https://overfitted.io",
        }),
    },
    "shipment": {
        "label": "Expédition",
        "fn": lambda: _render("shipment.html", {
            "display_name": "Human_Error_42",
            "order_id": 42,
            "tracking_number": "1Z999AA10123456784",
            "carrier": "UPS",
            "tracking_url": "https://www.ups.com/track?loc=fr&tracknum=1Z999AA10123456784",
            "account_url": "https://overfitted.io/account/orders",
            "frontend_url": "https://overfitted.io",
        }),
    },
}
