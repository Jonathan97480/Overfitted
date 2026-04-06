from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "overfitted",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
)


@celery_app.task(bind=True, name="fixer.vectorize")
def vectorize_task(self, file_bytes_hex: str) -> dict:
    """Tache Celery : pipeline complet — background removal + upscale + vectorisation SVG.

    Accepte les bytes encodes en hex (JSON-serialisable).
    Retourne le chemin du fichier SVG (ou PNG si vtracer absent) + format.
    rembg et vtracer sont optionnels en dev ; requis en prod (Dockerfile).
    """
    import tempfile
    import io as _io
    from app.services.fixer.image_utils import (
        validate_and_open_image,
        upscale_to_print,
        remove_background,
        vectorize_to_svg,
        REMBG_AVAILABLE,
        VTRACER_AVAILABLE,
    )

    self.update_state(state="PROCESSING", meta={"step": "validation"})
    file_bytes = bytes.fromhex(file_bytes_hex)
    img = validate_and_open_image(file_bytes)

    # Étape 1 : suppression du fond (si rembg disponible)
    if REMBG_AVAILABLE:
        self.update_state(state="PROCESSING", meta={"step": "rembg"})
        buf = _io.BytesIO()
        img.save(buf, format="PNG")
        file_bytes = remove_background(buf.getvalue())
        img = validate_and_open_image(file_bytes)

    # Étape 2 : upscale si DPI insuffisant
    self.update_state(state="PROCESSING", meta={"step": "upscale"})
    img = upscale_to_print(img)

    # Étape 3 : vectorisation SVG (si vtracer disponible) ou fallback PNG
    self.update_state(state="PROCESSING", meta={"step": "output"})
    if VTRACER_AVAILABLE:
        buf = _io.BytesIO()
        img.save(buf, format="PNG")
        svg_str = vectorize_to_svg(buf.getvalue())
        with tempfile.NamedTemporaryFile(delete=False, suffix=".svg", mode="w", encoding="utf-8") as tmp:
            tmp.write(svg_str)
            output_path = tmp.name
        return {"status": "done", "output_path": output_path, "format": "SVG"}
    else:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            img.save(tmp.name)
            output_path = tmp.name
        return {"status": "done", "output_path": output_path, "format": "PNG", "note": "vtracer absent — PNG upscale"}


@celery_app.task(bind=True, name="roast.analyze")
def roast_task(self, analysis_data: dict) -> dict:
    """Tache Celery : genere un verdict satirique via Ollama (LLM local).

    Accepte un dict ImageAnalysis serialise (JSON-compatible).
    Retourne le RoastResponse serialise en dict.
    """
    from app.services.roast_engine.schemas import ImageAnalysis
    from app.services.roast_engine.llm import roast_image

    self.update_state(state="PROCESSING", meta={"step": "llm_call"})

    analysis = ImageAnalysis(**analysis_data)
    response = roast_image(analysis)

    return response.model_dump()

@celery_app.task(bind=True, name="soul.score")
def soul_score_task(self, file_bytes_hex: str) -> dict:
    """Tache Celery : calcule le score Soul-O-Meter d une image.

    Accepte les bytes encodes en hex (JSON-serialisable).
    Retourne SoulScore serialise en dict.
    """
    from app.services.soul_o_meter.scorer import score_image

    self.update_state(state="PROCESSING", meta={"step": "scoring"})

    file_bytes = bytes.fromhex(file_bytes_hex)
    result = score_image(file_bytes)

    return dict(result)