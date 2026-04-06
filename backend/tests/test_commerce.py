import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.commerce.client import (
    create_checkout_session,
    verify_webhook,
    create_printful_order,
    get_printful_order,
)


# ---------------------------------------------------------------------------
# Tests : create_checkout_session
# ---------------------------------------------------------------------------

def test_create_checkout_session_missing_key_raises():
    """ValueError si STRIPE_SECRET_KEY vide."""
    with patch("app.services.commerce.client.STRIPE_SECRET_KEY", ""):
        with pytest.raises(ValueError, match="STRIPE_SECRET_KEY"):
            create_checkout_session(1, "T-shirt", 2500, 1, "http://ok", "http://cancel")


def test_create_checkout_session_calls_stripe():
    """create_checkout_session appelle stripe.checkout.Session.create avec les bons args."""
    mock_session = MagicMock()
    mock_session.id = "cs_test_abc"
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_abc"

    with patch("app.services.commerce.client.STRIPE_SECRET_KEY", "sk_test_fake"), \
         patch("app.services.commerce.client._stripe.checkout.Session.create", return_value=mock_session) as mock_create:

        result = create_checkout_session(42, "Poster A3", 1500, 2, "http://ok", "http://cancel")

    mock_create.assert_called_once()
    call_kwargs = mock_create.call_args.kwargs
    assert call_kwargs["mode"] == "payment"
    assert call_kwargs["metadata"]["design_id"] == "42"
    assert result["session_id"] == "cs_test_abc"
    assert "checkout.stripe.com" in result["url"]


def test_create_checkout_session_returns_session_id_and_url():
    """Le dict retourné contient session_id et url."""
    mock_session = MagicMock()
    mock_session.id = "cs_xyz"
    mock_session.url = "https://stripe.com/pay/xyz"

    with patch("app.services.commerce.client.STRIPE_SECRET_KEY", "sk_test_x"), \
         patch("app.services.commerce.client._stripe.checkout.Session.create", return_value=mock_session):

        result = create_checkout_session(1, "Mug", 1000, 1, "http://ok", "http://cancel")

    assert "session_id" in result
    assert "url" in result


def test_create_checkout_session_line_items_amount():
    """unit_amount est bien transmis dans line_items."""
    mock_session = MagicMock()
    mock_session.id = "cs_amt"
    mock_session.url = "https://stripe.com"

    with patch("app.services.commerce.client.STRIPE_SECRET_KEY", "sk_test_x"), \
         patch("app.services.commerce.client._stripe.checkout.Session.create", return_value=mock_session) as mock_create:

        create_checkout_session(1, "Sticker", 500, 3, "http://ok", "http://cancel")

    line_items = mock_create.call_args.kwargs["line_items"]
    assert line_items[0]["price_data"]["unit_amount"] == 500
    assert line_items[0]["quantity"] == 3


# ---------------------------------------------------------------------------
# Tests : verify_webhook
# ---------------------------------------------------------------------------

def test_verify_webhook_missing_secret_raises():
    """ValueError si STRIPE_WEBHOOK_SECRET vide."""
    with patch("app.services.commerce.client.STRIPE_WEBHOOK_SECRET", ""):
        with pytest.raises(ValueError, match="STRIPE_WEBHOOK_SECRET"):
            verify_webhook(b"payload", "t=123,v1=abc")


def test_verify_webhook_invalid_signature_raises():
    """ValueError si la signature Stripe est invalide."""
    import stripe as _stripe_lib
    with patch("app.services.commerce.client.STRIPE_WEBHOOK_SECRET", "whsec_test"), \
         patch("app.services.commerce.client._stripe.Webhook.construct_event",
               side_effect=_stripe_lib.SignatureVerificationError("bad sig", "t=1")):
        with pytest.raises(ValueError, match="invalide"):
            verify_webhook(b"payload", "t=1,v1=bad")


def test_verify_webhook_valid_returns_event():
    """verify_webhook retourne le dict de l'événement si la signature est valide."""
    fake_event = {"type": "checkout.session.completed", "id": "evt_123"}
    with patch("app.services.commerce.client.STRIPE_WEBHOOK_SECRET", "whsec_test"), \
         patch("app.services.commerce.client._stripe.Webhook.construct_event", return_value=fake_event):

        result = verify_webhook(b"payload", "t=1,v1=ok")

    assert result["type"] == "checkout.session.completed"
    assert result["id"] == "evt_123"


# ---------------------------------------------------------------------------
# Tests : create_printful_order
# ---------------------------------------------------------------------------

def test_create_printful_order_missing_key_raises():
    """ValueError si PRINTFUL_API_KEY vide."""
    with patch("app.services.commerce.client.PRINTFUL_API_KEY", ""):
        with pytest.raises(ValueError, match="PRINTFUL_API_KEY"):
            create_printful_order("var_1", 1, {}, "https://example.com/img.png")


def test_create_printful_order_success():
    """create_printful_order retourne le dict result de l'API Printful."""
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {"result": {"id": "pf_order_99", "status": "pending"}}

    with patch("app.services.commerce.client.PRINTFUL_API_KEY", "pf_key"), \
         patch("app.services.commerce.client.httpx.post", return_value=fake_response):

        result = create_printful_order(
            variant_id="123",
            quantity=1,
            shipping_address={"name": "Alice", "address1": "1 rue du Test", "city": "Paris", "country_code": "FR", "zip": "75001"},
            design_url="https://cdn.example.com/design.png",
        )

    assert result["id"] == "pf_order_99"
    assert result["status"] == "pending"


def test_create_printful_order_connect_error_raises():
    """ValueError si l'API Printful est injoignable."""
    import httpx as _httpx
    with patch("app.services.commerce.client.PRINTFUL_API_KEY", "pf_key"), \
         patch("app.services.commerce.client.httpx.post", side_effect=_httpx.ConnectError("refused")):
        with pytest.raises(ValueError, match="injoignable"):
            create_printful_order("v1", 1, {}, "https://img.png")


def test_create_printful_order_http_error_raises():
    """ValueError si Printful répond 4xx/5xx."""
    import httpx as _httpx
    mock_resp = MagicMock()
    mock_resp.raise_for_status.side_effect = _httpx.HTTPStatusError(
        "error", request=MagicMock(), response=MagicMock(status_code=422, text="Unprocessable")
    )
    with patch("app.services.commerce.client.PRINTFUL_API_KEY", "pf_key"), \
         patch("app.services.commerce.client.httpx.post", return_value=mock_resp):
        with pytest.raises(ValueError, match="422"):
            create_printful_order("v1", 1, {}, "https://img.png")


# ---------------------------------------------------------------------------
# Tests : get_printful_order
# ---------------------------------------------------------------------------

def test_get_printful_order_missing_key_raises():
    """ValueError si PRINTFUL_API_KEY vide."""
    with patch("app.services.commerce.client.PRINTFUL_API_KEY", ""):
        with pytest.raises(ValueError, match="PRINTFUL_API_KEY"):
            get_printful_order("pf_order_1")


def test_get_printful_order_success():
    """get_printful_order retourne le dict result de l'API Printful."""
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {"result": {"id": "pf_order_1", "status": "shipped"}}

    with patch("app.services.commerce.client.PRINTFUL_API_KEY", "pf_key"), \
         patch("app.services.commerce.client.httpx.get", return_value=fake_response):

        result = get_printful_order("pf_order_1")

    assert result["status"] == "shipped"


# ---------------------------------------------------------------------------
# Tests : endpoint POST /commerce/checkout (mock Stripe)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_checkout_endpoint_success():
    """POST /commerce/checkout retourne session_id et url."""
    mock_session = MagicMock()
    mock_session.id = "cs_endpoint_test"
    mock_session.url = "https://stripe.com/pay/test"

    with patch("app.services.commerce.client.STRIPE_SECRET_KEY", "sk_test_x"), \
         patch("app.services.commerce.client._stripe.checkout.Session.create", return_value=mock_session):

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/commerce/checkout", json={
                "design_id": 1,
                "product_name": "Poster",
                "unit_amount": 2000,
                "quantity": 1,
            })

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "cs_endpoint_test"
    assert "url" in data


@pytest.mark.asyncio
async def test_checkout_endpoint_missing_key_returns_400():
    """POST /commerce/checkout retourne 400 si Stripe non configuré."""
    with patch("app.services.commerce.client.STRIPE_SECRET_KEY", ""):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/commerce/checkout", json={
                "design_id": 1,
                "product_name": "Mug",
                "unit_amount": 1500,
            })
    assert response.status_code == 400
    assert "STRIPE_SECRET_KEY" in response.json()["detail"]


@pytest.mark.asyncio
async def test_checkout_endpoint_invalid_payload_returns_422():
    """POST /commerce/checkout retourne 422 si payload incomplet."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/commerce/checkout", json={"design_id": 1})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests : endpoint POST /commerce/webhook
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_endpoint_missing_header_returns_400():
    """POST /commerce/webhook sans header stripe-signature → 400."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/commerce/webhook", content=b"payload")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_webhook_endpoint_invalid_sig_returns_400():
    """POST /commerce/webhook avec signature invalide → 400."""
    import stripe as _stripe_lib
    with patch("app.services.commerce.client.STRIPE_WEBHOOK_SECRET", "whsec_test"), \
         patch("app.services.commerce.client._stripe.Webhook.construct_event",
               side_effect=_stripe_lib.SignatureVerificationError("bad", "t=1")):

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/commerce/webhook",
                content=b"bad_payload",
                headers={"stripe-signature": "t=1,v1=bad"},
            )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_webhook_endpoint_valid_returns_received():
    """POST /commerce/webhook valide → { received: true, type: ... }."""
    fake_event = {"type": "checkout.session.completed", "id": "evt_ok"}
    with patch("app.services.commerce.client.STRIPE_WEBHOOK_SECRET", "whsec_test"), \
         patch("app.services.commerce.client._stripe.Webhook.construct_event", return_value=fake_event):

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/commerce/webhook",
                content=b"payload",
                headers={"stripe-signature": "t=1,v1=ok"},
            )
    assert response.status_code == 200
    data = response.json()
    assert data["received"] is True
    assert data["type"] == "checkout.session.completed"


# ===========================================================================
# Tests : nouveaux endpoints commerce (promo/validate, checkout/confirm, invoice PDF)
# ===========================================================================

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.models import Invoice, Order, OrderStatus, PromoCode, Design


async def _make_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine


async def _client_with_db(engine):
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override():
        async with TestSession() as s:
            yield s

    app.dependency_overrides[get_db] = override
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ---------------------------------------------------------------------------
# POST /commerce/promo/validate
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_promo_validate_valid_code():
    """Un code promo actif retourne valid=True et le montant de remise."""
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with TestSession() as s:
        promo = PromoCode(code="CHAOS10", discount_percent=10, is_active=1)
        s.add(promo)
        await s.commit()

    async with await _client_with_db(engine) as ac:
        r = await ac.post("/commerce/promo/validate", json={"code": "CHAOS10", "cart_total_ht": 100.0})

    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is True
    assert data["discount_percent"] == 10
    assert data["discount_amount"] == 10.0
    assert data["final_price_ht"] == 90.0
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_promo_validate_unknown_code():
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/commerce/promo/validate", json={"code": "UNKNOWN", "cart_total_ht": 50.0})
    assert r.status_code == 200
    assert r.json()["valid"] is False
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_promo_validate_inactive_code():
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as s:
        s.add(PromoCode(code="INACTIVE", discount_percent=20, is_active=0))
        await s.commit()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/commerce/promo/validate", json={"code": "INACTIVE", "cart_total_ht": 50.0})
    assert r.status_code == 200
    assert r.json()["valid"] is False
    assert "inactif" in r.json()["message"].lower()
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_promo_validate_exhausted_code():
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as s:
        s.add(PromoCode(code="USED", discount_percent=15, is_active=1, max_uses=5, uses_count=5))
        await s.commit()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/commerce/promo/validate", json={"code": "USED", "cart_total_ht": 50.0})
    assert r.status_code == 200
    assert r.json()["valid"] is False
    assert "épuisé" in r.json()["message"].lower()
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_promo_validate_expired_code():
    from datetime import datetime, timezone
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as s:
        s.add(PromoCode(
            code="EXPIRED", discount_percent=5, is_active=1,
            expires_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
        ))
        await s.commit()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/commerce/promo/validate", json={"code": "EXPIRED", "cart_total_ht": 50.0})
    assert r.status_code == 200
    assert r.json()["valid"] is False
    assert "expiré" in r.json()["message"].lower()
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_promo_validate_case_insensitive():
    """L'endpoint accepte le code en minuscules et normalise en UPPERCASE."""
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSession() as s:
        s.add(PromoCode(code="UPPER10", discount_percent=10, is_active=1))
        await s.commit()
    async with await _client_with_db(engine) as ac:
        r = await ac.post("/commerce/promo/validate", json={"code": "upper10", "cart_total_ht": 100.0})
    assert r.status_code == 200
    assert r.json()["valid"] is True
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


# ---------------------------------------------------------------------------
# GET /commerce/checkout/confirm
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_checkout_confirm_no_stripe_key_dev_mode():
    """Sans STRIPE_SECRET_KEY, retourne le mode dev avec status unknown."""
    engine = await _make_db()
    with patch.dict("os.environ", {"STRIPE_SECRET_KEY": ""}):
        async with await _client_with_db(engine) as ac:
            r = await ac.get("/commerce/checkout/confirm?session_id=cs_fake_123")
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == "cs_fake_123"
    assert "dev" in data["message"].lower()
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_checkout_confirm_missing_session_id():
    """Sans session_id query param → 422."""
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        r = await ac.get("/commerce/checkout/confirm")
    assert r.status_code == 422
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


# ---------------------------------------------------------------------------
# GET /commerce/invoice/{order_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invoice_pdf_not_found():
    """Commande sans facture associée → 404."""
    engine = await _make_db()
    async with await _client_with_db(engine) as ac:
        r = await ac.get("/commerce/invoice/9999")
    assert r.status_code == 404
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_invoice_pdf_returns_pdf():
    """Facture existante → réponse application/pdf avec Content-Disposition."""
    from datetime import datetime, timezone
    engine = await _make_db()
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with TestSession() as s:
        # Design + Order + Invoice minimaux
        design = Design(original_url="http://x.io/img.png", status="pending")
        s.add(design)
        await s.flush()
        order = Order(design_id=design.id, status=OrderStatus.paid)
        s.add(order)
        await s.flush()
        invoice = Invoice(
            order_id=order.id,
            invoice_number="OVF-2026-0001",
            issued_at=datetime(2026, 4, 6, tzinfo=timezone.utc),
            user_email="buyer@x.io",
            user_name="Jean Chaos",
            items_json='[{"description": "T-shirt", "quantity": 1, "unit_price_ht": 25.0}]',
            amount_ht=25.0,
            tva_rate=0.20,
            amount_tva=5.0,
            amount_ttc=30.0,
            discount_amount=0.0,
        )
        s.add(invoice)
        await s.commit()
        order_id = order.id

    async with await _client_with_db(engine) as ac:
        r = await ac.get(f"/commerce/invoice/{order_id}")

    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert "attachment" in r.headers.get("content-disposition", "")
    assert len(r.content) > 500   # un PDF non vide
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()
