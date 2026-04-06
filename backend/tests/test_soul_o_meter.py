import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import io
import struct
import zlib
import pytest
from unittest.mock import MagicMock, patch

import numpy as np
from PIL import Image
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.soul_o_meter.scorer import (
    score_image,
    _compute_entropy,
    _compute_fft_regularity,
    _compute_edge_irregularity,
    _compute_color_variance,
    SoulScore,
)


# ---------------------------------------------------------------------------
# Helpers — fabrication d'images synthétiques
# ---------------------------------------------------------------------------

def make_image_bytes(mode: str = "RGB", size: tuple = (128, 128), color=None) -> bytes:
    """Image unie (couleur plate) — entropie basse, très AI-like."""
    if color is None:
        color = (128, 128, 128) if mode == "RGB" else 128
    img = Image.new(mode, size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_noise_image_bytes(size: tuple = (128, 128)) -> bytes:
    """Image de bruit aléatoire — entropie haute, très humain-like."""
    rng = np.random.RandomState(42)
    arr = rng.randint(0, 255, (*size, 3), dtype=np.uint8)
    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_gradient_image_bytes(size: tuple = (128, 128)) -> bytes:
    """Dégradé progressif — entropie modérée."""
    arr = np.zeros((*size, 3), dtype=np.uint8)
    for i in range(size[0]):
        arr[i, :, 0] = int(i / size[0] * 255)  # rouge progressif
    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Tests : fonctions internes (métriques individuelles)
# ---------------------------------------------------------------------------

def test_compute_entropy_uniform_is_low():
    """Image uniforme → entropie proche de 0."""
    arr = np.full((64, 64), 128, dtype=np.uint8)
    e = _compute_entropy(arr)
    assert e < 0.2, f"Entropie image uniforme trop haute : {e}"


def test_compute_entropy_noise_is_high():
    """Image bruit aléatoire → entropie proche de 1."""
    rng = np.random.RandomState(0)
    arr = rng.randint(0, 255, (64, 64), dtype=np.uint8)
    e = _compute_entropy(arr)
    assert e > 0.8, f"Entropie image bruit trop basse : {e}"


def test_compute_entropy_bounded():
    """La valeur retournée est toujours dans [0, 1]."""
    for seed in range(5):
        rng = np.random.RandomState(seed)
        arr = rng.randint(0, 255, (64, 64), dtype=np.uint8)
        assert 0.0 <= _compute_entropy(arr) <= 1.0


def test_compute_fft_regularity_uniform_is_high():
    """Image uniforme → très basse fréquence → régularité élevée (AI-like)."""
    arr = np.full((64, 64), 200, dtype=np.uint8)
    reg = _compute_fft_regularity(arr)
    assert reg > 0.5, f"Régularité image uniforme trop basse : {reg}"


def test_compute_fft_regularity_bounded():
    """La valeur retournée est toujours dans [0, 1]."""
    rng = np.random.RandomState(7)
    arr = rng.randint(0, 255, (64, 64), dtype=np.uint8)
    val = _compute_fft_regularity(arr)
    assert 0.0 <= val <= 1.0


def test_compute_edge_irregularity_uniform_is_zero():
    """Image unie → pas de contours → irrégularité 0."""
    arr = np.full((64, 64), 100, dtype=np.uint8)
    val = _compute_edge_irregularity(arr)
    assert val == 0.0


def test_compute_edge_irregularity_bounded():
    """La valeur retournée est toujours dans [0, 1]."""
    rng = np.random.RandomState(3)
    arr = rng.randint(0, 255, (64, 64), dtype=np.uint8)
    val = _compute_edge_irregularity(arr)
    assert 0.0 <= val <= 1.0


def test_compute_color_variance_uniform_is_zero():
    """Image RGB uniforme → variance nulle."""
    arr = np.full((64, 64, 3), 128, dtype=np.uint8)
    val = _compute_color_variance(arr)
    assert val < 0.01, f"Variance couleur image uniforme : {val}"


def test_compute_color_variance_noise_is_high():
    """Image bruit aléatoire → variance importante."""
    rng = np.random.RandomState(1)
    arr = rng.randint(0, 255, (64, 64, 3), dtype=np.uint8)
    val = _compute_color_variance(arr)
    assert val > 0.2, f"Variance couleur image bruit trop basse : {val}"


def test_compute_color_variance_bounded():
    """La valeur retournée est toujours dans [0, 1]."""
    rng = np.random.RandomState(9)
    arr = rng.randint(0, 255, (64, 64, 3), dtype=np.uint8)
    val = _compute_color_variance(arr)
    assert 0.0 <= val <= 1.0


# ---------------------------------------------------------------------------
# Tests : score_image() — résultat global
# ---------------------------------------------------------------------------

def test_score_image_returns_soul_score_keys():
    """score_image retourne un dict avec les clés attendues."""
    result = score_image(make_image_bytes())
    assert "human" in result
    assert "ai" in result
    assert "score" in result
    assert "signals" in result


def test_score_image_human_plus_ai_equals_one():
    """human + ai = 1.0 (à 0.001 près)."""
    result = score_image(make_image_bytes())
    assert abs(result["human"] + result["ai"] - 1.0) < 0.001


def test_score_image_score_equals_human():
    """score == human."""
    result = score_image(make_image_bytes())
    assert result["score"] == result["human"]


def test_score_image_bounded_01():
    """Tous les scores sont dans [0.0, 1.0]."""
    for make_fn in [make_image_bytes, make_noise_image_bytes, make_gradient_image_bytes]:
        result = score_image(make_fn())
        assert 0.0 <= result["human"] <= 1.0
        assert 0.0 <= result["ai"] <= 1.0
        assert 0.0 <= result["score"] <= 1.0


def test_score_image_noise_is_more_human_than_flat():
    """Image bruit > image plate côté score humain."""
    flat = score_image(make_image_bytes())
    noisy = score_image(make_noise_image_bytes())
    assert noisy["human"] > flat["human"], (
        f"Bruit ({noisy['human']}) devrait être > plat ({flat['human']})"
    )


def test_score_image_signals_has_all_keys():
    """signals contient les 4 métriques brutes."""
    result = score_image(make_image_bytes())
    signals = result["signals"]
    for key in ("entropy", "fft_regularity", "edge_irregularity", "color_variance"):
        assert key in signals, f"Clé manquante dans signals : {key}"


def test_score_image_invalid_bytes_raises_value_error():
    """Bytes invalides lèvent ValueError."""
    with pytest.raises(ValueError, match="Image invalide"):
        score_image(b"not an image at all")


def test_score_image_jpeg():
    """Fonctionne aussi avec des images JPEG."""
    buf = io.BytesIO()
    Image.new("RGB", (128, 128), (200, 100, 50)).save(buf, format="JPEG")
    result = score_image(buf.getvalue())
    assert 0.0 <= result["score"] <= 1.0


def test_score_image_large_is_downsampled():
    """Les grandes images (> 512px) sont acceptées sans erreur."""
    img = Image.new("RGB", (2048, 2048), (10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    result = score_image(buf.getvalue())
    assert result is not None


# ---------------------------------------------------------------------------
# Tests : endpoint POST /soul/score (mock Celery)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_soul_score_endpoint_dispatches_task():
    """POST /soul/score dispatche une tâche Celery et retourne task_id."""
    mock_task = MagicMock()
    mock_task.id = "soul-task-xyz"
    with patch("app.services.soul_o_meter.router.soul_score_task.delay", return_value=mock_task):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            files = {"file": ("test.png", make_image_bytes(), "image/png")}
            response = await ac.post("/soul/score", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == "soul-task-xyz"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_soul_score_endpoint_rejects_non_image():
    """POST /soul/score rejette un fichier non-image (422)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("doc.pdf", b"PDF content", "application/pdf")}
        response = await ac.post("/soul/score", files=files)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests : endpoint GET /soul/status/{task_id} (mock Celery)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_soul_status_pending():
    """GET /soul/status retourne PENDING quand la tâche n'est pas terminée."""
    mock_result = MagicMock()
    mock_result.status = "PENDING"
    mock_result.ready.return_value = False
    mock_result.result = None
    with patch("app.services.soul_o_meter.router.AsyncResult", return_value=mock_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/soul/status/soul-task-xyz")
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"


@pytest.mark.asyncio
async def test_soul_status_success():
    """GET /soul/status retourne le résultat quand la tâche est terminée."""
    expected = {"human": 0.75, "ai": 0.25, "score": 0.75, "signals": {}}
    mock_result = MagicMock()
    mock_result.status = "SUCCESS"
    mock_result.ready.return_value = True
    mock_result.result = expected
    with patch("app.services.soul_o_meter.router.AsyncResult", return_value=mock_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/soul/status/soul-task-xyz")
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["result"]["score"] == 0.75
