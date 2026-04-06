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
    """Tache Celery : upscale + vectorisation SVG d une image.

    Accepte les bytes encodes en hex (JSON-serialisable).
    Retourne le chemin du fichier SVG genere.
    """
    import tempfile
    from app.services.fixer.image_utils import validate_and_open_image, upscale_to_print

    self.update_state(state="PROCESSING", meta={"step": "validation"})

    file_bytes = bytes.fromhex(file_bytes_hex)
    img = validate_and_open_image(file_bytes)

    self.update_state(state="PROCESSING", meta={"step": "upscale"})
    img = upscale_to_print(img)

    # Placeholder : vtracer non installe — sauvegarde PNG upscale en attendant
    self.update_state(state="PROCESSING", meta={"step": "output"})
    suffix = ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        img.save(tmp.name)
        output_path = tmp.name

    return {"status": "done", "output_path": output_path, "format": "PNG"}

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