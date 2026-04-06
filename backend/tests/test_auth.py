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
