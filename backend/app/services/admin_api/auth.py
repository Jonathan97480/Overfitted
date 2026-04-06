"""
Auth JWT pour l'API admin Next.js.
Distinct de AdminAuth (SQLAdmin HMAC) — ce module émet des Bearer tokens.
"""
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "overfitted-admin-dev-secret-CHANGE-IN-PROD")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 8

_bearer = HTTPBearer(auto_error=True)


def create_admin_token() -> str:
    payload = {
        "sub": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ALGORITHM)


def verify_admin_token(credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)]) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("sub") != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
        return "admin"
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expiré.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide.")


def verify_password(plain: str) -> bool:
    """Compare en temps constant pour éviter les timing attacks."""
    expected = ADMIN_PASSWORD
    return secrets.compare_digest(plain.encode(), expected.encode())
