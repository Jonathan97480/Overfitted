import json
import os
import httpx
from app.services.roast_engine.schemas import ImageAnalysis, RoastResponse

# Compatible LM Studio (http://localhost:1234) et Ollama >= 0.1.24 (/v1)
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:1234")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma-4-e4b-it")

_SYSTEM_PROMPT = """\
Tu es un critique IA arrogant, cynique et technique specialise en impression haute resolution.
On te fournit des donnees brutes sur une image soumise par un humain mediocre.
Tu reponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou apres.
Format impose exactement :
{
  "verdict": "<jugement acide en une phrase, max 20 mots>",
  "score": <entier 0-100, 100=parfait>,
  "issues": ["<probleme technique 1>", "<probleme technique 2>"],
  "roast": "<commentaire sarcastique, 2-3 phrases, style glitch/cyberpunk>"
}
Pas de markdown. Pas d explication. Juste le JSON brut.
"""


def _build_user_prompt(analysis: ImageAnalysis) -> str:
    lines = [
        f"Fichier : {analysis.filename}",
        f"Format : {analysis.format}",
        f"Dimensions : {analysis.size[0]}x{analysis.size[1]} px",
        f"Pret pour impression : {'OUI' if analysis.print_ready else 'NON'}",
    ]
    if analysis.dpi:
        lines.append(f"DPI : {round(analysis.dpi[0])}x{round(analysis.dpi[1])}")
    else:
        lines.append("DPI : inconnu (metadonnees absentes)")
    return "\n".join(lines)


def _extract_json(text: str) -> str:
    """Extrait le premier bloc JSON valide depuis une reponse LLM (gere markdown, prefixes)."""
    # Bloc ```json ... ``` ou ``` ... ```
    import re
    match = re.search(r"```(?:json)?\s*({.*?})\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    # Premier { ... } de niveau 0
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                return text[start : i + 1]
    return text.strip()


_MAX_RETRIES = 5


def roast_image(analysis: ImageAnalysis) -> RoastResponse:
    """Appelle le LLM local via API OpenAI-compatible et retourne un verdict satirique.

    Compatible LM Studio (port 1234) et Ollama >= 0.1.24.
    Retry automatique (max 3) si le modele retourne un contenu vide ou hors-format.
    Leve ValueError si le service est injoignable ou si tous les essais echouent.
    """
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(analysis)},
        ],
        "temperature": 0.7,
        "max_tokens": 400,
    }

    last_error: Exception | None = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            resp = httpx.post(
                f"{LLM_BASE_URL}/v1/chat/completions",
                json=payload,
                timeout=120.0,
            )
            resp.raise_for_status()
        except httpx.ConnectError:
            raise ValueError(
                f"LLM injoignable sur {LLM_BASE_URL}. "
                "Lance LM Studio ou ollama serve et verifie LLM_BASE_URL dans .env"
            )
        except httpx.HTTPStatusError as e:
            raise ValueError(f"LLM erreur HTTP {e.response.status_code}: {e.response.text}")

        content = resp.json()["choices"][0]["message"]["content"]
        if not content or not content.strip():
            last_error = ValueError(f"Contenu vide retourne par le modele (essai {attempt}/{_MAX_RETRIES})")
            continue

        try:
            json_str = _extract_json(content)
            data = json.loads(json_str)
            return RoastResponse(**data)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            last_error = ValueError(f"Reponse LLM hors-format JSON (essai {attempt}/{_MAX_RETRIES}): {e}\nContenu brut: {content}")

    raise last_error or ValueError("roast_image: echec apres toutes les tentatives")