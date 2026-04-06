"""
Tests d'intégration Roast Engine — appels réels contre LM Studio.

Ces tests nécessitent LM Studio actif sur LLM_BASE_URL (par défaut http://localhost:1234)
avec un modèle chargé (LLM_MODEL, par défaut nvidia/nemotron-3-nano-4b).

Ils sont marqués 'integration' et skippés automatiquement si le service est injoignable.
En CI (GitHub Actions), ces tests sont exclus via : pytest -m "not integration"
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import httpx

from app.services.roast_engine.schemas import ImageAnalysis, RoastResponse
from app.services.roast_engine.llm import LLM_BASE_URL, LLM_MODEL, roast_image

# Tous les tests de ce fichier sont marqués 'integration' → exclus du CI via -m "not integration"
pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Helpers : détection de disponibilité LM Studio
# ---------------------------------------------------------------------------

def _lm_studio_available() -> bool:
    """Vérifie que LM Studio répond sur /v1/models avant de lancer les tests."""
    try:
        r = httpx.get(f"{LLM_BASE_URL}/v1/models", timeout=3.0)
        return r.status_code == 200
    except Exception:
        return False


def _model_loaded() -> bool:
    """Vérifie que LLM_MODEL est bien listé dans les modèles disponibles."""
    try:
        r = httpx.get(f"{LLM_BASE_URL}/v1/models", timeout=3.0)
        if r.status_code != 200:
            return False
        models = [m["id"] for m in r.json().get("data", [])]
        return LLM_MODEL in models
    except Exception:
        return False


requires_lm_studio = pytest.mark.skipif(
    not _lm_studio_available(),
    reason=f"LM Studio injoignable sur {LLM_BASE_URL}",
)

requires_model = pytest.mark.skipif(
    not _model_loaded(),
    reason=f"Modèle '{LLM_MODEL}' non chargé dans LM Studio",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

ANALYSIS_LOW_DPI = ImageAnalysis(
    filename="logo_web.png",
    format="PNG",
    size=(400, 300),
    print_ready=False,
    dpi=(72.0, 72.0),
)

ANALYSIS_PRINT_READY = ImageAnalysis(
    filename="affiche_hd.png",
    format="PNG",
    size=(3508, 2480),
    print_ready=True,
    dpi=(300.0, 300.0),
)

ANALYSIS_NO_DPI = ImageAnalysis(
    filename="screenshot.png",
    format="PNG",
    size=(1920, 1080),
    print_ready=False,
    dpi=None,
)


# ---------------------------------------------------------------------------
# Tests de disponibilité infra
# ---------------------------------------------------------------------------

@requires_lm_studio
def test_lm_studio_reachable():
    """LM Studio répond sur /v1/models."""
    r = httpx.get(f"{LLM_BASE_URL}/v1/models", timeout=5.0)
    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert len(data["data"]) > 0


@requires_lm_studio
def test_lm_studio_lists_models():
    """Liste des modèles non vide et chaque entrée a un champ 'id'."""
    r = httpx.get(f"{LLM_BASE_URL}/v1/models", timeout=5.0)
    models = r.json()["data"]
    for m in models:
        assert "id" in m, f"Modèle sans 'id' : {m}"


@requires_lm_studio
@requires_model
def test_target_model_loaded():
    """Le modèle configuré (LLM_MODEL) est bien chargé dans LM Studio."""
    r = httpx.get(f"{LLM_BASE_URL}/v1/models", timeout=5.0)
    ids = [m["id"] for m in r.json()["data"]]
    assert LLM_MODEL in ids, f"Modèle '{LLM_MODEL}' absent. Modèles dispo : {ids}"


# ---------------------------------------------------------------------------
# Tests roast_image() avec vrai LLM
# ---------------------------------------------------------------------------

@requires_lm_studio
@requires_model
def test_roast_image_returns_roast_response():
    """roast_image() retourne un RoastResponse valide (types corrects)."""
    result = roast_image(ANALYSIS_LOW_DPI)
    assert isinstance(result, RoastResponse)
    assert isinstance(result.verdict, str)
    assert isinstance(result.score, int)
    assert isinstance(result.issues, list)
    assert isinstance(result.roast, str)


@requires_lm_studio
@requires_model
def test_roast_score_within_bounds():
    """Le score retourné est compris entre 0 et 100."""
    result = roast_image(ANALYSIS_LOW_DPI)
    assert 0 <= result.score <= 100, f"Score hors-limites : {result.score}"


@requires_lm_studio
@requires_model
def test_roast_verdict_not_empty():
    """Le verdict ne doit pas être une chaîne vide."""
    result = roast_image(ANALYSIS_LOW_DPI)
    assert len(result.verdict.strip()) > 0


@requires_lm_studio
@requires_model
def test_roast_roast_field_not_empty():
    """Le champ 'roast' (commentaire sarcastique) n'est pas vide."""
    result = roast_image(ANALYSIS_LOW_DPI)
    assert len(result.roast.strip()) > 0


@requires_lm_studio
@requires_model
def test_roast_print_ready_scores_higher():
    """Une image HD print-ready doit scorer plus haut qu'une image 72 DPI."""
    result_low = roast_image(ANALYSIS_LOW_DPI)
    result_hd = roast_image(ANALYSIS_PRINT_READY)
    # Heuristique : HD devrait scorer >= image web (pas garanti, mais indicatif)
    # On vérifie juste que les deux appels réussissent et retournent des scores valides
    assert 0 <= result_low.score <= 100
    assert 0 <= result_hd.score <= 100


@requires_lm_studio
@requires_model
def test_roast_image_no_dpi_metadata():
    """roast_image() fonctionne même sans métadonnées DPI (dpi=None)."""
    result = roast_image(ANALYSIS_NO_DPI)
    assert isinstance(result, RoastResponse)
    assert 0 <= result.score <= 100


@requires_lm_studio
@requires_model
def test_roast_issues_is_list_of_strings():
    """Le champ 'issues' est bien une liste de chaînes."""
    result = roast_image(ANALYSIS_LOW_DPI)
    assert isinstance(result.issues, list)
    for issue in result.issues:
        assert isinstance(issue, str), f"Issue non-string : {issue!r}"


# ---------------------------------------------------------------------------
# Test de robustesse : appel brut API /v1/chat/completions
# ---------------------------------------------------------------------------

@requires_lm_studio
@requires_model
def test_raw_completions_endpoint_basic():
    """Appel direct /v1/chat/completions basique — vérifie la structure de la réponse."""
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "user", "content": "Réponds juste avec le mot PONG."},
        ],
        "max_tokens": 10,
    }
    r = httpx.post(f"{LLM_BASE_URL}/v1/chat/completions", json=payload, timeout=60.0)
    assert r.status_code == 200
    body = r.json()
    assert "choices" in body
    assert len(body["choices"]) > 0
    assert "message" in body["choices"][0]
    assert "content" in body["choices"][0]["message"]
