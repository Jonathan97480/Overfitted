"""Auth SQLAdmin — login/password via variables d'environnement.

ADMIN_USERNAME et ADMIN_PASSWORD doivent être définis dans .env.
La session est signée avec SECRET_KEY via itsdangerous.TimestampSigner.

Pattern :
- login()      → vérifie credentials, pose le cookie signé, retourne True
- logout()     → supprime le cookie
- authenticate() → vérifie que le cookie est valide et non expiré
"""

import os
import hashlib
import hmac
from starlette.requests import Request
from sqladmin.authentication import AuthenticationBackend

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
SECRET_KEY = os.getenv("SECRET_KEY", "overfitted-dev-secret")

# Durée de session : 8 heures
_SESSION_MAX_AGE = 8 * 3600
_COOKIE_NAME = "overfitted_admin_session"


def _constant_time_compare(a: str, b: str) -> bool:
    """Comparaison résistante aux timing attacks."""
    return hmac.compare_digest(
        hashlib.sha256(a.encode()).digest(),
        hashlib.sha256(b.encode()).digest(),
    )


def _sign(value: str) -> str:
    """Signe value avec SECRET_KEY (HMAC-SHA256)."""
    sig = hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()
    return f"{value}.{sig}"


def _unsign(signed: str) -> str | None:
    """Vérifie et retourne la valeur signée, ou None si invalide."""
    if "." not in signed:
        return None
    value, sig = signed.rsplit(".", 1)
    expected = hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(sig, expected):
        return value
    return None


class AdminAuth(AuthenticationBackend):
    """Backend d'authentification SQLAdmin — credentials depuis les variables d'env.

    Configuration requise dans .env :
        ADMIN_USERNAME=admin
        ADMIN_PASSWORD=<mot_de_passe_fort>
        SECRET_KEY=<clé_secrète_longue>

    Si ADMIN_USERNAME ou ADMIN_PASSWORD est vide, l'accès admin est refusé
    pour éviter qu'un oubli de config ouvre l'admin en prod.
    """

    async def login(self, request: Request) -> bool:
        if not ADMIN_USERNAME or not ADMIN_PASSWORD:
            return False

        form = await request.form()
        username = str(form.get("username", ""))
        password = str(form.get("password", ""))

        username_ok = _constant_time_compare(username, ADMIN_USERNAME)
        password_ok = _constant_time_compare(password, ADMIN_PASSWORD)

        if username_ok and password_ok:
            import time
            token = _sign(f"admin:{int(time.time())}")
            request.session["admin_token"] = token
            return True
        return False

    async def logout(self, request: Request) -> None:
        request.session.pop("admin_token", None)

    async def authenticate(self, request: Request) -> bool:
        import time

        token = request.session.get("admin_token")
        if not token:
            return False

        value = _unsign(token)
        if not value:
            return False

        # Vérifier l'expiration
        try:
            _, ts_str = value.split(":", 1)
            issued_at = int(ts_str)
            if time.time() - issued_at > _SESSION_MAX_AGE:
                request.session.pop("admin_token", None)
                return False
        except (ValueError, TypeError):
            return False

        return True
