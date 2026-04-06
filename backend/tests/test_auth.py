import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.auth import AdminAuth, _sign, _unsign, _constant_time_compare


# ---------------------------------------------------------------------------
# Tests : fonctions utilitaires
# ---------------------------------------------------------------------------

def test_constant_time_compare_equal():
    assert _constant_time_compare("abc", "abc") is True


def test_constant_time_compare_different():
    assert _constant_time_compare("abc", "xyz") is False


def test_constant_time_compare_empty():
    assert _constant_time_compare("", "") is True
    assert _constant_time_compare("a", "") is False


def test_sign_and_unsign_roundtrip():
    token = _sign("admin:12345")
    assert _unsign(token) == "admin:12345"


def test_unsign_tampered_returns_none():
    token = _sign("admin:12345")
    tampered = token[:-4] + "xxxx"
    assert _unsign(tampered) is None


def test_unsign_no_dot_returns_none():
    assert _unsign("nodottoken") is None


def test_unsign_wrong_key_returns_none():
    with patch("app.auth.SECRET_KEY", "key_a"):
        token = _sign("admin:99")
    with patch("app.auth.SECRET_KEY", "key_b"):
        assert _unsign(token) is None


# ---------------------------------------------------------------------------
# Tests : AdminAuth.login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_valid_credentials_returns_true():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    request.session = {}
    request.form = AsyncMock(return_value={"username": "admin", "password": "secure123"})

    with patch("app.auth.ADMIN_USERNAME", "admin"), \
         patch("app.auth.ADMIN_PASSWORD", "secure123"):
        result = await auth.login(request)

    assert result is True
    assert "admin_token" in request.session


@pytest.mark.asyncio
async def test_login_wrong_password_returns_false():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    request.session = {}
    request.form = AsyncMock(return_value={"username": "admin", "password": "wrong"})

    with patch("app.auth.ADMIN_USERNAME", "admin"), \
         patch("app.auth.ADMIN_PASSWORD", "secure123"):
        result = await auth.login(request)

    assert result is False
    assert "admin_token" not in request.session


@pytest.mark.asyncio
async def test_login_wrong_username_returns_false():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    request.session = {}
    request.form = AsyncMock(return_value={"username": "hacker", "password": "secure123"})

    with patch("app.auth.ADMIN_USERNAME", "admin"), \
         patch("app.auth.ADMIN_PASSWORD", "secure123"):
        result = await auth.login(request)

    assert result is False


@pytest.mark.asyncio
async def test_login_empty_config_returns_false():
    """Si ADMIN_USERNAME/PASSWORD non configurés, login toujours refusé."""
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    request.session = {}
    request.form = AsyncMock(return_value={"username": "", "password": ""})

    with patch("app.auth.ADMIN_USERNAME", ""), \
         patch("app.auth.ADMIN_PASSWORD", ""):
        result = await auth.login(request)

    assert result is False


# ---------------------------------------------------------------------------
# Tests : AdminAuth.logout
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_logout_clears_session():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    request.session = {"admin_token": "sometoken", "other": "data"}

    await auth.logout(request)

    assert "admin_token" not in request.session
    assert "other" in request.session  # autres clés préservées


# ---------------------------------------------------------------------------
# Tests : AdminAuth.authenticate
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_authenticate_valid_token_returns_true():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    token = _sign(f"admin:{int(time.time())}")
    request.session = {"admin_token": token}

    result = await auth.authenticate(request)
    assert result is True


@pytest.mark.asyncio
async def test_authenticate_no_token_returns_false():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    request.session = {}

    result = await auth.authenticate(request)
    assert result is False


@pytest.mark.asyncio
async def test_authenticate_tampered_token_returns_false():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    request.session = {"admin_token": "admin:12345.invalidsig"}

    result = await auth.authenticate(request)
    assert result is False


@pytest.mark.asyncio
async def test_authenticate_expired_token_returns_false():
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    # Token émis il y a 9h (> 8h max)
    old_ts = int(time.time()) - 9 * 3600
    token = _sign(f"admin:{old_ts}")
    request.session = {"admin_token": token}

    result = await auth.authenticate(request)
    assert result is False
    assert "admin_token" not in request.session  # nettoyé


@pytest.mark.asyncio
async def test_authenticate_malformed_value_returns_false():
    """Valeur signée correctement mais format invalide → False."""
    auth = AdminAuth(secret_key="test_secret")
    request = MagicMock()
    token = _sign("notadminformat")
    request.session = {"admin_token": token}

    result = await auth.authenticate(request)
    assert result is False


# ===========================================================================
# Tests : /auth/* (utilisateurs publics — JWT HttpOnly cookie)
# ===========================================================================

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app as _app
from app.database import Base, get_db
from app.models import Order, OrderStatus, User, Design


async def _make_db():
    """DB SQLite en mémoire — nouvel engine à chaque appel."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine


async def _client_with_db(engine):
    """Client HTTP isolé avec la DB en mémoire."""
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override():
        async with TestSession() as s:
            yield s

    _app.dependency_overrides[get_db] = override
    return AsyncClient(transport=ASGITransport(app=_app), base_url="http://test")


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_register_success():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/auth/register", json={"email": "user@x.io", "password": "password123"})
    assert r.status_code == 201
    assert "user_id" in r.json()
    assert "user_token" in r.cookies
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_register_duplicate_email():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        await ac.post("/auth/register", json={"email": "dup@x.io", "password": "password123"})
        r = await ac.post("/auth/register", json={"email": "dup@x.io", "password": "password123"})
    assert r.status_code == 409
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_register_short_password():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/auth/register", json={"email": "x@x.io", "password": "abc"})
    assert r.status_code == 422
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_login_success():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        await ac.post("/auth/register", json={"email": "login@x.io", "password": "password123"})
        r = await ac.post("/auth/login", json={"email": "login@x.io", "password": "password123"})
    assert r.status_code == 200
    assert "user_token" in r.cookies
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_login_wrong_password():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        await ac.post("/auth/register", json={"email": "wp@x.io", "password": "password123"})
        r = await ac.post("/auth/login", json={"email": "wp@x.io", "password": "wrongpass"})
    assert r.status_code == 401
    # Message générique — pas d'énumération email (OWASP)
    assert "incorrect" in r.json()["detail"].lower()
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_login_unknown_email():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/auth/login", json={"email": "nobody@x.io", "password": "password123"})
    # Même message que wrong password (OWASP anti-enumeration)
    assert r.status_code == 401
    assert "incorrect" in r.json()["detail"].lower()
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_get_me_authenticated():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        await ac.post("/auth/register", json={"email": "me@x.io", "password": "password123"})
        r = await ac.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "me@x.io"
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_get_me_unauthenticated():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        r = await ac.get("/auth/me")
    assert r.status_code == 401
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


# ---------------------------------------------------------------------------
# PATCH /auth/me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_patch_display_name():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        await ac.post("/auth/register", json={"email": "patch@x.io", "password": "password123"})
        r = await ac.patch("/auth/me", json={"display_name": "Overfitter"})
    assert r.status_code == 200
    assert r.json()["display_name"] == "Overfitter"
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_patch_password_wrong_current():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        await ac.post("/auth/register", json={"email": "pwd@x.io", "password": "correct_pass"})
        r = await ac.patch("/auth/me", json={"current_password": "wrong", "new_password": "new_pass_99"})
    assert r.status_code == 401
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


# ---------------------------------------------------------------------------
# GET /auth/me/export  (RGPD Art. 15)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_export_me():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        await ac.post("/auth/register", json={"email": "export@x.io", "password": "password123"})
        r = await ac.get("/auth/me/export")
    assert r.status_code == 200
    data = r.json()
    assert "user" in data and "designs" in data and "orders" in data and "invoices" in data
    assert data["user"]["email"] == "export@x.io"
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


# ---------------------------------------------------------------------------
# DELETE /auth/me  (RGPD Art. 17)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_delete_me_success():
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override():
        async with TestSession() as s:
            yield s

    _app.dependency_overrides[get_db] = override
    async with AsyncClient(transport=ASGITransport(app=_app), base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "del@x.io", "password": "password123"})
        r = await ac.delete("/auth/me")
    assert r.status_code == 200

    # Vérifier anonymisation
    from sqlalchemy import select
    async with TestSession() as s:
        user = (await s.execute(select(User))).scalar_one()
    assert user.email.startswith("deleted_")
    assert user.is_active == 0
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_delete_me_blocked_active_order():
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override():
        async with TestSession() as s:
            yield s

    _app.dependency_overrides[get_db] = override
    async with AsyncClient(transport=ASGITransport(app=_app), base_url="http://test") as ac:
        await ac.post("/auth/register", json={"email": "active@x.io", "password": "password123"})
        me_r = await ac.get("/auth/me")
        user_id = me_r.json()["id"]

        # Injection commande active directement en DB
        async with TestSession() as s:
            design = Design(user_id=user_id, original_url="http://x.io/img.png", status="pending")
            s.add(design)
            await s.flush()
            order = Order(user_id=user_id, design_id=design.id, status=OrderStatus.paid)
            s.add(order)
            await s.commit()

        r = await ac.delete("/auth/me")
    assert r.status_code == 409
    assert "commande" in r.json()["detail"].lower()
    _app.dependency_overrides.pop(get_db, None)
    await engine.dispose()
