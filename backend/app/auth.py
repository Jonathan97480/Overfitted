"""Auth SQLAdmin — login/password hashé bcrypt stocké en base de données.

Le mot de passe n'est JAMAIS stocké en clair (ni en .env, ni en BDD).
Seul le hash bcrypt est persisté dans la table `admin_users`.

Utiliser backend/app/set_admin_password.py pour initialiser ou changer le mot de passe.

Pattern :
- login()      → vérifie credentials via BDD + bcrypt, pose le token signé en session
- logout()     → supprime le token de session
- authenticate() → vérifie que le token signé est valide et non expiré
"""

import os
import time
import hashlib
import hmac

import bcrypt
from sqlalchemy import select
from starlette.requests import Request
from sqladmin.authentication import AuthenticationBackend

from app.database import SessionLocal
from app.models import AdminUser

SECRET_KEY = os.getenv("SECRET_KEY", "overfitted-dev-secret")

# Durée de session : 8 heures
_SESSION_MAX_AGE = 8 * 3600


def _sign(value: str) -> str:
    sig = hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()
    return f"{value}.{sig}"


def _unsign(signed: str) -> str | None:
    if "." not in signed:
        return None
    value, sig = signed.rsplit(".", 1)
    expected = hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(sig, expected):
        return value
    return None


class AdminAuth(AuthenticationBackend):
    """Backend d'authentification SQLAdmin.

    Le mot de passe est vérifié contre le hash bcrypt stocké en BDD.
    Initialiser avec : python -m app.set_admin_password
    """

    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = str(form.get("username", "")).strip()
        password = str(form.get("password", ""))

        if not username or not password:
            return False

        async with SessionLocal() as session:
            result = await session.execute(
                select(AdminUser).where(AdminUser.username == username)
            )
            admin = result.scalar_one_or_none()

        if admin is None:
            # Hash factice pour éviter les timing attacks (user enumeration)
            bcrypt.checkpw(b"dummy", bcrypt.hashpw(b"dummy", bcrypt.gensalt()))
            return False

        if not bcrypt.checkpw(password.encode(), admin.hashed_password.encode()):
            return False

        token = _sign(f"admin:{int(time.time())}")
        request.session["admin_token"] = token
        return True

    async def logout(self, request: Request) -> None:
        request.session.pop("admin_token", None)

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("admin_token")
        if not token:
            return False

        value = _unsign(token)
        if not value:
            return False

        try:
            _, ts_str = value.split(":", 1)
            issued_at = int(ts_str)
            if time.time() - issued_at > _SESSION_MAX_AGE:
                request.session.pop("admin_token", None)
                return False
        except (ValueError, TypeError):
            return False

        return True
