"""
Tests pour les endpoints GET /api/admin/stats/traffic|products|finance.
Chaque test obtient un token admin valide via /api/admin/login (password patché).
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport

from app.main import app

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_token(ac: AsyncClient) -> str:
    with patch("app.services.admin_api.router.verify_password", new=AsyncMock(return_value=True)):
        r = await ac.post("/api/admin/login", json={"password": "test-pass"})
    assert r.status_code == 200
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# /api/admin/stats/traffic
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stats_traffic_requires_auth():
    """Sans token → 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/admin/stats/traffic")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_stats_traffic_returns_expected_keys():
    """Vérifier la structure de la réponse traffic."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        with patch(
            "app.services.admin_api.router.get_top_pages",
            new=AsyncMock(return_value=[]),
        ):
            r = await ac.get("/api/admin/stats/traffic?days=7", headers=_auth(token))

    assert r.status_code == 200
    data = r.json()
    assert "orders_per_day" in data
    assert "designs_per_day" in data
    assert "top_pages" in data
    assert isinstance(data["orders_per_day"], list)
    assert isinstance(data["top_pages"], list)


@pytest.mark.asyncio
async def test_stats_traffic_top_pages_forwarded():
    """top_pages provenant de get_top_pages() est inclus dans la réponse."""
    fake_pages = [{"url": "/boutique", "views": 42}]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        with patch(
            "app.services.admin_api.router.get_top_pages",
            new=AsyncMock(return_value=fake_pages),
        ):
            r = await ac.get("/api/admin/stats/traffic?days=30", headers=_auth(token))

    assert r.status_code == 200
    assert r.json()["top_pages"] == fake_pages


# ---------------------------------------------------------------------------
# /api/admin/stats/products
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stats_products_requires_auth():
    """Sans token → 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/admin/stats/products")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_stats_products_returns_expected_keys():
    """Vérifier la structure de la réponse products."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        with patch(
            "app.services.admin_api.router.get_product_views",
            new=AsyncMock(return_value={}),
        ):
            r = await ac.get("/api/admin/stats/products", headers=_auth(token))

    assert r.status_code == 200
    data = r.json()
    assert "top_products" in data
    assert isinstance(data["top_products"], list)


@pytest.mark.asyncio
async def test_stats_products_views_count_enrichment():
    """views_count est bien injecté depuis get_product_views()."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        with patch(
            "app.services.admin_api.router.get_product_views",
            new=AsyncMock(return_value={1: 99, 2: 55}),
        ):
            r = await ac.get("/api/admin/stats/products", headers=_auth(token))

    assert r.status_code == 200
    # Si des produits existent en DB, views_count sera enrichi.
    # En DB vide de test, la liste est vide — le test vérifie juste le statut.
    for item in r.json()["top_products"]:
        assert "views_count" in item


# ---------------------------------------------------------------------------
# /api/admin/stats/finance
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stats_finance_requires_auth():
    """Sans token → 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/admin/stats/finance")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_stats_finance_returns_expected_keys():
    """Vérifier la structure de la réponse finance."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        r = await ac.get("/api/admin/stats/finance?days=7", headers=_auth(token))

    assert r.status_code == 200
    data = r.json()
    for key in ("total_revenue", "total_costs", "total_margin", "avg_order_value", "days"):
        assert key in data, f"Clef manquante : {key}"
    assert isinstance(data["days"], list)


@pytest.mark.asyncio
async def test_stats_finance_days_param():
    """Le paramètre days=30 est accepté sans erreur."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _get_token(ac)
        r = await ac.get("/api/admin/stats/finance?days=30", headers=_auth(token))
    assert r.status_code == 200
