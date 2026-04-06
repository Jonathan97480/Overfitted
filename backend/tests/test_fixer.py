import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import io
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, MagicMock

from app.main import app
from app.services.fixer.image_utils import (
    validate_and_open_image,
    check_print_ready,
    upscale_to_print,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_png_bytes(width: int = 100, height: int = 100, dpi: tuple | None = None) -> bytes:
    img = Image.new("RGB", (width, height), color="red")
    buf = io.BytesIO()
    save_kwargs: dict = {"format": "PNG"}
    if dpi:
        save_kwargs["dpi"] = dpi
    img.save(buf, **save_kwargs)
    buf.seek(0)
    return buf.read()


# ---------------------------------------------------------------------------
# Tests : validate_and_open_image
# ---------------------------------------------------------------------------

def test_validate_and_open_image_valid():
    img = validate_and_open_image(make_png_bytes())
    assert img.format == "PNG"
    assert img.size == (100, 100)


def test_validate_and_open_image_invalid_bytes():
    with pytest.raises(ValueError, match="Image invalide"):
        validate_and_open_image(b"not_an_image")


def test_validate_and_open_image_empty():
    with pytest.raises(ValueError, match="Image invalide"):
        validate_and_open_image(b"")


# ---------------------------------------------------------------------------
# Tests : check_print_ready
# ---------------------------------------------------------------------------

def test_check_print_ready_high_dpi():
    img = Image.open(io.BytesIO(make_png_bytes(dpi=(300, 300))))
    assert check_print_ready(img) is True


def test_check_print_ready_low_dpi():
    img = Image.open(io.BytesIO(make_png_bytes(dpi=(72, 72))))
    assert check_print_ready(img) is False


def test_check_print_ready_no_dpi_metadata():
    # Sans metadonnees DPI -> considere comme 0 -> non imprimable
    img = Image.open(io.BytesIO(make_png_bytes()))
    assert check_print_ready(img) is False


def test_check_print_ready_exact_300():
    img_bytes = make_png_bytes(dpi=(300, 300))
    img = Image.open(io.BytesIO(img_bytes))
    assert check_print_ready(img) is True


# ---------------------------------------------------------------------------
# Tests : upscale_to_print
# ---------------------------------------------------------------------------

def test_upscale_increases_size():
    img = Image.open(io.BytesIO(make_png_bytes(width=100, height=100, dpi=(72, 72))))
    upscaled = upscale_to_print(img, target_dpi=300)
    # scale = 300/72 ~ 4.17 -> taille attendue ~ 416x416
    assert upscaled.width > img.width
    assert upscaled.height > img.height


def test_upscale_unchanged_if_already_300dpi():
    img = Image.open(io.BytesIO(make_png_bytes(width=200, height=200, dpi=(300, 300))))
    upscaled = upscale_to_print(img)
    assert upscaled.width == 200
    assert upscaled.height == 200


def test_upscale_returns_image_object():
    img = Image.open(io.BytesIO(make_png_bytes(dpi=(72, 72))))
    result = upscale_to_print(img)
    assert isinstance(result, Image.Image)


# ---------------------------------------------------------------------------
# Tests : endpoint POST /fixer/upload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_image_valid():
    buf = io.BytesIO(make_png_bytes())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/fixer/upload", files={"file": ("test.png", buf, "image/png")})
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.png"
    assert data["format"] == "PNG"
    assert data["size"] == [100, 100]


@pytest.mark.asyncio
async def test_upload_image_invalid_bytes():
    buf = io.BytesIO(b"not_an_image")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/fixer/upload", files={"file": ("bad.png", buf, "image/png")})
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Tests : endpoint POST /fixer/vectorize (mock Celery)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_vectorize_dispatches_task():
    mock_task = MagicMock()
    mock_task.id = "fake-task-id-123"
    buf = io.BytesIO(make_png_bytes())
    with patch("app.services.fixer.router.vectorize_task.delay", return_value=mock_task):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/fixer/vectorize", files={"file": ("img.png", buf, "image/png")})
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == "fake-task-id-123"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_vectorize_rejects_non_image():
    buf = io.BytesIO(b"not an image at all")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/fixer/vectorize",
            files={"file": ("doc.pdf", buf, "application/pdf")},
        )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests : endpoint GET /fixer/status/{task_id} (mock Celery)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_task_status_pending():
    mock_result = MagicMock()
    mock_result.status = "PENDING"
    mock_result.ready.return_value = False
    mock_result.result = None
    with patch("app.services.fixer.router.AsyncResult", return_value=mock_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/fixer/status/fake-task-id-123")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PENDING"
    assert data["result"] is None


@pytest.mark.asyncio
async def test_task_status_done():
    mock_result = MagicMock()
    mock_result.status = "SUCCESS"
    mock_result.ready.return_value = True
    mock_result.result = {"status": "done", "output_path": "/tmp/out.png", "format": "PNG"}
    with patch("app.services.fixer.router.AsyncResult", return_value=mock_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/fixer/status/fake-task-id-123")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["result"]["format"] == "PNG"