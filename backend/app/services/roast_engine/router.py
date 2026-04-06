from fastapi import APIRouter, HTTPException
from celery.result import AsyncResult
from app.worker import celery_app, roast_task
from app.services.roast_engine.schemas import ImageAnalysis

router = APIRouter(prefix="/roast", tags=["roast"])


@router.post("/analyze")
async def analyze(analysis: ImageAnalysis) -> dict:
    """Dispatche une analyse image vers la tâche Celery de roast.

    Retourne immédiatement un task_id pour polling.
    """
    task = roast_task.delay(analysis.model_dump())
    return {"task_id": task.id, "status": "pending"}


@router.get("/status/{task_id}")
async def roast_status(task_id: str) -> dict:
    """Retourne le statut et le verdict d'une tâche roast."""
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }
