"""
Router contact — POST /contact
Envoie un email via SMTP (smtplib stdlib).
Variables d'env requises :
    CONTACT_EMAIL       : destinataire (ex: contact@overfitted.io)
    SMTP_HOST           : serveur SMTP (ex: smtp.gmail.com)
    SMTP_PORT           : port (ex: 587)
    SMTP_USER           : login SMTP
    SMTP_PASSWORD       : mot de passe SMTP
En dev, si SMTP_HOST n'est pas défini, le message est loggé sans être envoyé.
"""
from __future__ import annotations

import logging
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])

SUBJECTS = {
    "general": "Question générale",
    "order": "Ma commande",
    "design": "Mon design / Upload",
    "partnership": "Partenariat",
    "legal": "Demande légale / RGPD",
    "other": "Autre",
}


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide.")
        if len(v) > 100:
            raise ValueError("Le nom est trop long (max 100 caractères).")
        return v

    @field_validator("subject")
    @classmethod
    def subject_valid(cls, v: str) -> str:
        if v not in SUBJECTS:
            raise ValueError(f"Sujet invalide. Valeurs autorisées : {list(SUBJECTS.keys())}")
        return v

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Le message est trop court (min 10 caractères).")
        if len(v) > 5000:
            raise ValueError("Le message est trop long (max 5000 caractères).")
        return v


def _send_email(req: ContactRequest) -> None:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    contact_email = os.getenv("CONTACT_EMAIL", smtp_user or "contact@overfitted.io")

    subject_label = SUBJECTS.get(req.subject, req.subject)

    body_html = f"""
    <html><body style="font-family:monospace;background:#0A0A0A;color:#AAAAAA;padding:24px;">
    <h2 style="color:#FF6B00;">NOUVEAU MESSAGE — OVERFITTED.IO CONTACT</h2>
    <table>
      <tr><td style="color:#555;padding-right:16px;">DE :</td><td style="color:#fff;">{req.name}</td></tr>
      <tr><td style="color:#555;padding-right:16px;">EMAIL :</td><td style="color:#fff;">{req.email}</td></tr>
      <tr><td style="color:#555;padding-right:16px;">SUJET :</td><td style="color:#00F0FF;">{subject_label}</td></tr>
    </table>
    <hr style="border-color:#1A1A1A;margin:16px 0;">
    <pre style="color:#AAAAAA;white-space:pre-wrap;">{req.message}</pre>
    </body></html>
    """

    body_text = (
        f"NOUVEAU MESSAGE — OVERFITTED.IO CONTACT\n\n"
        f"DE : {req.name}\nEMAIL : {req.email}\nSUJET : {subject_label}\n\n"
        f"{req.message}"
    )

    if not smtp_host:
        logger.info(
            "[contact] SMTP non configuré — message loggé (dev only).\n%s",
            body_text,
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Overfitted Contact] {subject_label} — {req.name}"
    msg["From"] = smtp_user
    msg["To"] = contact_email
    msg["Reply-To"] = req.email
    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, contact_email, msg.as_string())


@router.post("", status_code=status.HTTP_200_OK)
async def send_contact_message(req: ContactRequest) -> dict[str, str]:
    try:
        _send_email(req)
    except smtplib.SMTPException as exc:
        logger.error("[contact] SMTP error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Impossible d'envoyer le message pour le moment. Utilisez l'email de contact direct.",
        )
    except Exception as exc:
        logger.error("[contact] Unexpected error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne. Veuillez réessayer.",
        )
    return {"status": "sent", "message": "MESSAGE_TRANSMITTED_SUCCESSFULLY"}
