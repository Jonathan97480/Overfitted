import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import json
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport, Response

from app.main import app
from app.services.roast_engine.schemas import ImageAnalysis, RoastResponse
from app.services.roast_engine.llm import roast_image, _build_user_prompt


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

VALID_ANALYSIS = {
    "filename": "logo.png",
    "format": "PNG",
    "size": [100, 100],
    "print_ready": False,
    "dpi": None,
}

VALID_ROAST_JSON = json.dumps({
    "verdict": "Ce fichier est une honte pixellisée.",
    "score": 12,
    "issues": ["DPI insuffisant", "Résolution trop faible"],
    "roast": "72 DPI ? Sérieusement ? Ma grand-mère imprime mieux avec un fax.",
})

# Format OpenAI-compatible (LM Studio / Ollama >= 0.1.24)
OPENAI_RESPONSE = {
    "choices": [{"message": {"content": VALID_ROAST_JSON}}]
}


# ---------------------------------------------------------------------------
# Tests : schemas
# ---------------------------------------------------------------------------

def test_image_analysis_valid():
    a = ImageAnalysis(**VALID_ANALYSIS)
    assert a.filename == "logo.png"
    assert a.print_ready is False


def test_roast_response_score_bounds():
    r = RoastResponse(verdict="Nul", score=50, issues=[], roast="Commentaire")
    assert 0 <= r.score <= 100


def test_roast_response_invalid_score():
    with pytest.raises(Exception):
        RoastResponse(verdict="X", score=150, issues=[], roast="Y")


# ---------------------------------------------------------------------------
# Tests : _build_user_prompt
# ---------------------------------------------------------------------------

def test_build_user_prompt_includes_filename():
    a = ImageAnalysis(**VALID_ANALYSIS)
    prompt = _build_user_prompt(a)
    assert "logo.png" in prompt


def test_build_user_prompt_no_dpi_shows_unknown():
    a = ImageAnalysis(**VALID_ANALYSIS)
    prompt = _build_user_prompt(a)
    assert "inconnu" in prompt


def test_build_user_prompt_with_dpi():
    a = ImageAnalysis(**{**VALID_ANALYSIS, "dpi": (72.0, 72.0)})
    prompt = _build_user_prompt(a)
    assert "72" in prompt


# ---------------------------------------------------------------------------
# Tests : roast_image (mock httpx)
# ---------------------------------------------------------------------------

def test_roast_image_success():
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = OPENAI_RESPONSE

    with patch("app.services.roast_engine.llm.httpx.post", return_value=mock_resp):
        analysis = ImageAnalysis(**VALID_ANALYSIS)
        result = roast_image(analysis)

    assert isinstance(result, RoastResponse)
    assert result.score == 12
    assert "DPI" in result.issues[0]


def test_roast_image_llm_unreachable():
    import httpx as _httpx
    with patch("app.services.roast_engine.llm.httpx.post", side_effect=_httpx.ConnectError("refused")):
        with pytest.raises(ValueError, match="LLM injoignable"):
            roast_image(ImageAnalysis(**VALID_ANALYSIS))


def test_roast_image_invalid_json_response():
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"choices": [{"message": {"content": "pas du json"}}]}

    with patch("app.services.roast_engine.llm.httpx.post", return_value=mock_resp):
        with pytest.raises(ValueError, match="hors-format JSON"):
            roast_image(ImageAnalysis(**VALID_ANALYSIS))


def test_roast_image_missing_fields_in_json():
    bad_json = json.dumps({"verdict": "Nul"})  # score, roast, issues manquants
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"choices": [{"message": {"content": bad_json}}]}

    with patch("app.services.roast_engine.llm.httpx.post", return_value=mock_resp):
        with pytest.raises(Exception):  # Pydantic validation error
            roast_image(ImageAnalysis(**VALID_ANALYSIS))


# ---------------------------------------------------------------------------
# Tests : endpoint POST /roast/analyze (mock Celery)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_roast_analyze_dispatches_task():
    mock_task = MagicMock()
    mock_task.id = "roast-task-abc"
    with patch("app.services.roast_engine.router.roast_task.delay", return_value=mock_task):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/roast/analyze", json=VALID_ANALYSIS)
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == "roast-task-abc"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_roast_analyze_invalid_payload():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/roast/analyze", json={"filename": "x"})  # champs manquants
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests : endpoint GET /roast/status/{task_id} (mock Celery)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_roast_status_pending():
    mock_result = MagicMock()
    mock_result.status = "PENDING"
    mock_result.ready.return_value = False
    mock_result.result = None
    with patch("app.services.roast_engine.router.AsyncResult", return_value=mock_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/roast/status/roast-task-abc")
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"


@pytest.mark.asyncio
async def test_roast_status_success():
    expected_result = {
        "verdict": "Ignominie numérique.",
        "score": 5,
        "issues": ["DPI critique"],
        "roast": "Tu oses appeler ça une image ?",
    }
    mock_result = MagicMock()
    mock_result.status = "SUCCESS"
    mock_result.ready.return_value = True
    mock_result.result = expected_result
    with patch("app.services.roast_engine.router.AsyncResult", return_value=mock_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/roast/status/roast-task-abc")
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["result"]["score"] == 5
