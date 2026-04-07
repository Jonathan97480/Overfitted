"""
Auth JWT pour l'API admin Next.js.
Distinct de AdminAuth (SQLAdmin HMAC) — ce module émet des Bearer tokens.
"""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.database import SessionLocal
from app.models import AdminUser

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent.parent / ".env")

ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "overfitted-admin-dev-secret-CHANGE-IN-PROD")
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


async def verify_password(plain: str) -> bool:
    """Vérifie le mot de passe contre le hash bcrypt stocké en base de données."""
    async with SessionLocal() as session:
        result = await session.execute(
            select(AdminUser).where(AdminUser.username == "admin")
        )
        admin = result.scalar_one_or_none()

    if admin is None:
        # Hash factice pour éviter les timing attacks
        bcrypt.checkpw(b"dummy", bcrypt.hashpw(b"dummy", bcrypt.gensalt()))
        return False

    return bcrypt.checkpw(plain.encode(), admin.hashed_password.encode())
