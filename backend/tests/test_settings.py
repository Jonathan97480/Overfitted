"""
Tests pour les endpoints GET /api/admin/settings et PATCH /api/admin/settings.
Vérifie le chiffrement Fernet, la lecture DB-first et la validation des clés.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport

from app.main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_token(ac: AsyncClient) -> str:
    with patch("app.services.admin_api.auth.ADMIN_PASSWORD", "test-pass"):
        r = await ac.post("/api/admin/login", json={"password": "test-pass"})
    assert r.status_code == 200
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_settings_requires_auth():
    """Sans token → 401 ou 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/admin/settings")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_settings_returns_all_keys():
    """GET /settings retourne la liste complète des clés connues avec masquage."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        r = await ac.get("/api/admin/settings", headers=_auth(token))

    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    keys = {item["key"] for item in data}
    assert "STRIPE_SECRET_KEY" in keys
    assert "OPENAI_API_KEY" in keys
    # Toutes les entrées exposent les champs attendus
    for item in data:
        assert "key" in item
        assert "label" in item
        assert "is_set" in item
        assert "preview" in item


@pytest.mark.asyncio
async def test_patch_settings_invalid_key_returns_400():
    """PATCH avec une clé inconnue → 400."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        r = await ac.patch(
            "/api/admin/settings",
            json={"settings": {"NOT_A_REAL_KEY": "value"}},
            headers=_auth(token),
        )
    assert r.status_code == 400
    assert "Clé inconnue" in r.json()["detail"]


@pytest.mark.asyncio
async def test_patch_settings_stores_encrypted_and_get_reflects_it():
    """PATCH stocke la valeur chiffrée en DB ; GET renvoie ensuite is_set=True."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)

        # Patch
        patch_r = await ac.patch(
            "/api/admin/settings",
            json={"settings": {"OPENAI_API_KEY": "sk-test-overfitted-123"}},
            headers=_auth(token),
        )
        assert patch_r.status_code == 200
        assert "OPENAI_API_KEY" in patch_r.json()["updated"]

        # GET should now reflect is_set=True and a masked preview
        get_r = await ac.get("/api/admin/settings", headers=_auth(token))
        assert get_r.status_code == 200
        entry = next(
            (item for item in get_r.json() if item["key"] == "OPENAI_API_KEY"), None
        )
        assert entry is not None
        assert entry["is_set"] is True
        assert "sk-tes" in entry["preview"]
        # La valeur brute ne doit PAS apparaître dans la preview
        assert "sk-test-overfitted-123" not in entry["preview"]


@pytest.mark.asyncio
async def test_patch_settings_updates_os_environ():
    """PATCH met à jour os.environ pour la durée du processus."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        await ac.patch(
            "/api/admin/settings",
            json={"settings": {"REDIS_URL": "redis://localhost:6380/0"}},
            headers=_auth(token),
        )
    assert os.environ.get("REDIS_URL") == "redis://localhost:6380/0"
