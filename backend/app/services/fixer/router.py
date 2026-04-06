from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from celery.result import AsyncResult
from app.worker import celery_app, vectorize_task
import asyncio

router = APIRouter(prefix="/fixer", tags=["fixer"])


@router.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...)) -> Response:
    """Supprime le fond d'une image via rembg et retourne le PNG transparent.

    Lève 503 si rembg n'est pas disponible (dev local sans ONNX).
    """
    from app.services.fixer.image_utils import remove_background, REMBG_AVAILABLE

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Fichier image requis.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image trop lourde (max 20 Mo).")

    if not REMBG_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Suppression de fond non disponible (rembg non installé).",
        )

    try:
        result_bytes = await asyncio.to_thread(remove_background, content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur traitement image : {exc}")

    return Response(
        content=result_bytes,
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="no-bg.png"'},
    )


@router.post("/vectorize")
async def vectorize(file: UploadFile = File(...)) -> dict:
    """Dispatche l'image vers la tâche Celery de vectorisation.

    Retourne immédiatement un task_id pour polling.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Fichier image requis.")

    file_bytes = await file.read()
    file_bytes_hex = file_bytes.hex()
    task = vectorize_task.delay(file_bytes_hex)
    return {"task_id": task.id, "status": "pending"}


@router.get("/status/{task_id}")
async def task_status(task_id: str) -> dict:
    """Retourne le statut d'une tâche Celery en cours."""
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }
