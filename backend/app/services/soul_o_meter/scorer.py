"""Soul-O-Meter — détecte l'origine Human vs AI d'une image.

Stratégie multi-critères (aucun modèle ML externe requis) :
1. Entropie de Shannon (humans: haute variabilité locale, AI: parfois trop lisse)
2. Analyse fréquentielle FFT (artefacts réguliers dans les images AI)
3. Irrégularité des contours (edges — photos réelles plus organiques)
4. Distribution chromatique (variance des canaux RGB)

Retourne un dict { "human": float, "ai": float, "score": float, "signals": dict }
  - human + ai = 1.0
  - score = human (0.0 = pur AI, 1.0 = pur humain)
  - signals = détail des métriques brutes pour debug/display
"""

import io
import math
from typing import TypedDict

import numpy as np
from PIL import Image
from skimage.filters import sobel
from skimage.measure import shannon_entropy


class SoulSignals(TypedDict):
    entropy: float
    fft_regularity: float
    edge_irregularity: float
    color_variance: float


class SoulScore(TypedDict):
    human: float
    ai: float
    score: float
    signals: SoulSignals


def _compute_entropy(gray: np.ndarray) -> float:
    """Entropie de Shannon normalisée [0, 1] sur l'image en niveaux de gris."""
    raw = float(shannon_entropy(gray))
    # shannon_entropy max théorique ≈ 8 bits pour uint8
    return min(raw / 8.0, 1.0)


def _compute_fft_regularity(gray: np.ndarray) -> float:
    """Régularité fréquentielle via FFT.

    Les images AI synthétiques tendent à avoir moins d'énergie haute fréquence
    résiduelle (artefacts de génération). Retourne 0.0 (irrégulier, humain)
    à 1.0 (très régulier, potentiellement AI).
    """
    f = np.fft.fft2(gray.astype(np.float32))
    fshift = np.fft.fftshift(f)
    magnitude = np.abs(fshift)

    h, w = magnitude.shape
    cy, cx = h // 2, w // 2
    # Ratio énergie haute fréquence / énergie totale
    mask_low = np.zeros((h, w), dtype=bool)
    r = min(h, w) // 4
    y_grid, x_grid = np.ogrid[:h, :w]
    mask_low[(y_grid - cy) ** 2 + (x_grid - cx) ** 2 <= r ** 2] = True

    total = float(magnitude.sum()) + 1e-9
    low_freq_energy = float(magnitude[mask_low].sum())
    high_freq_ratio = 1.0 - (low_freq_energy / total)

    # Régularité = faible haute fréquence → potentiellement AI
    # On normalise en [0,1] : 0 = beaucoup de hautes fréquences (organique), 1 = lisse (AI)
    regularity = 1.0 - min(high_freq_ratio * 5.0, 1.0)
    return float(regularity)


def _compute_edge_irregularity(gray: np.ndarray) -> float:
    """Irrégularité des contours via filtre Sobel.

    Retourne 0.0 (contours réguliers, AI) à 1.0 (contours organiques, humain).
    """
    edges = sobel(gray.astype(np.float64) / 255.0)
    if edges.max() < 1e-9:
        return 0.0
    # Coefficient de variation des magnitudes de gradient non-nuls
    nonzero = edges[edges > 0.01]
    if len(nonzero) < 10:
        return 0.0
    cv = float(np.std(nonzero) / (np.mean(nonzero) + 1e-9))
    return min(cv, 1.0)


def _compute_color_variance(rgb: np.ndarray) -> float:
    """Variance normalisée de la distribution RGB.

    Images photo réelles : palette large et variée.
    Images AI simples (logos, illustrations) : moins de variance inter-canaux.
    Retourne 0.0 (uniforme) à 1.0 (très varié).
    """
    variances = [float(np.var(rgb[:, :, c].astype(np.float32))) for c in range(3)]
    mean_var = float(np.mean(variances))
    # Max théorique pour uint8 : (255/2)^2 ≈ 16256
    return min(mean_var / 16256.0, 1.0)


def score_image(image_bytes: bytes) -> SoulScore:
    """Calcule le score Soul-O-Meter d'une image depuis ses bytes bruts.

    Lève ValueError si les bytes ne représentent pas une image valide.
    Retourne SoulScore avec human + ai = 1.0.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise ValueError(f"Image invalide : {e}")

    # Normaliser : RGB, taille réduite pour la perf (max 512px)
    img = img.convert("RGB")
    img.thumbnail((512, 512), Image.LANCZOS)

    rgb = np.array(img)
    gray = np.array(img.convert("L"))

    entropy = _compute_entropy(gray)
    fft_regularity = _compute_fft_regularity(gray)
    edge_irregularity = _compute_edge_irregularity(gray)
    color_variance = _compute_color_variance(rgb)

    signals: SoulSignals = {
        "entropy": round(entropy, 4),
        "fft_regularity": round(fft_regularity, 4),
        "edge_irregularity": round(edge_irregularity, 4),
        "color_variance": round(color_variance, 4),
    }

    # Score "humain" = combinaison pondérée des indicateurs organiques
    # Pondérations calibrées empiriquement (à affiner avec un dataset annoté)
    human_raw = (
        entropy * 0.30
        + (1.0 - fft_regularity) * 0.25
        + edge_irregularity * 0.25
        + color_variance * 0.20
    )
    human = round(min(max(human_raw, 0.0), 1.0), 4)
    ai = round(1.0 - human, 4)

    return SoulScore(
        human=human,
        ai=ai,
        score=human,
        signals=signals,
    )
