"""
Utilitaires de sécurité pour l'auth utilisateurs publics.
- Hachage bcrypt direct (sans passlib)
- Création / vérification JWT HttpOnly
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, status

USER_JWT_SECRET = os.getenv("USER_JWT_SECRET", "overfitted-user-dev-secret-CHANGE-IN-PROD")
ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_HOURS = 24 * 7   # 7 jours

# TTL des tokens email (différents du token de session)
EMAIL_VERIFY_TOKEN_TTL_HOURS = 24
PASSWORD_RESET_TOKEN_TTL_HOURS = 1


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_user_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, USER_JWT_SECRET, algorithm=ALGORITHM)


def _decode_user_token(token: str) -> dict:
    try:
        return jwt.decode(token, USER_JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expiré.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide.")


def get_current_user_id(user_token: Annotated[str | None, Cookie()] = None) -> int:
    """Dependency FastAPI : lit le cookie `user_token`, retourne l'user_id."""
    if not user_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié.")
    payload = _decode_user_token(user_token)
    return int(payload["sub"])


# ─── Tokens email (vérification + reset) ────────────────────────────────────

def create_email_token(purpose: str, user_id: int, email: str, ttl_hours: int) -> str:
    """Crée un JWT court-terme pour la vérification d'email ou le reset de mot de passe."""
    payload = {
        "sub": str(user_id),
        "email": email,
        "purpose": purpose,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ttl_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, USER_JWT_SECRET, algorithm=ALGORITHM)


def decode_email_token(token: str, expected_purpose: str) -> dict:
    """Décode et valide un token email. Lève HTTPException si invalide/expiré/mauvais purpose."""
    try:
        payload = jwt.decode(token, USER_JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Lien expiré. Veuillez en demander un nouveau.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Lien invalide.")

    if payload.get("purpose") != expected_purpose:
        raise HTTPException(status_code=400, detail="Lien invalide.")

    return payload
