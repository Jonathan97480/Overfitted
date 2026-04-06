from pydantic import BaseModel, Field


class ImageAnalysis(BaseModel):
    """Données techniques de l'image — input du Roast Engine."""
    filename: str
    format: str
    size: list[int]
    print_ready: bool
    dpi: tuple[float, float] | None = None


class RoastResponse(BaseModel):
    """Verdict satirique généré par le LLM local."""
    verdict: str = Field(..., description="Jugement acide en une phrase.")
    score: int = Field(..., ge=0, le=100, description="Score de qualité 0-100.")
    issues: list[str] = Field(default_factory=list, description="Problèmes détectés.")
    roast: str = Field(..., description="Commentaire ironique long pour le client.")
