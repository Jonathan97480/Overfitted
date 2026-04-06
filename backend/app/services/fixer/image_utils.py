from PIL import Image
import io

MIN_DPI = 300

# Import conditionnel — rembg et vtracer sont optionnels en dev local,
# requis en production (installés dans le Dockerfile via Rust toolchain).
try:
    from rembg import remove as _rembg_remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

try:
    import vtracer as _vtracer
    VTRACER_AVAILABLE = True
except ImportError:
    VTRACER_AVAILABLE = False


def validate_and_open_image(file_bytes: bytes) -> Image.Image:
    """Valide et ouvre une image depuis des bytes.

    Leve ValueError si le format est invalide.
    """
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Ferme le stream — doit rouvrir apres
        img = Image.open(io.BytesIO(file_bytes))
        return img
    except Exception as e:
        raise ValueError(f"Image invalide: {e}")


def check_print_ready(img: Image.Image) -> bool:
    """Retourne True si l image est imprimable (>= 300 DPI sur les deux axes)."""
    dpi = img.info.get("dpi", (0, 0))
    return round(float(dpi[0])) >= MIN_DPI and round(float(dpi[1])) >= MIN_DPI


def upscale_to_print(img: Image.Image, target_dpi: int = MIN_DPI) -> Image.Image:
    """Upscale l image pour atteindre target_dpi si elle est trop petite.

    Utilise LANCZOS (meilleure qualite pour agrandissement).
    Si le DPI est deja suffisant, retourne l image inchangee.
    """
    dpi = img.info.get("dpi", (72, 72))
    current_dpi = float(dpi[0])
    if current_dpi >= target_dpi:
        return img

    scale = target_dpi / current_dpi
    new_size = (int(img.width * scale), int(img.height * scale))
    upscaled = img.resize(new_size, Image.LANCZOS)
    return upscaled


def remove_background(image_bytes: bytes) -> bytes:
    """Supprime le fond d une image via rembg (ONNX U2Net).

    Retourne les bytes PNG avec canal alpha.
    Leve ImportError si rembg n est pas installe (prod uniquement).
    Leve ValueError si les bytes ne sont pas une image valide.
    """
    if not REMBG_AVAILABLE:
        raise ImportError(
            "rembg n est pas installe. "
            "En production, il est fourni via le Dockerfile. "
            "En local : pip install rembg (necessite ONNX runtime)"
        )
    try:
        result = _rembg_remove(image_bytes)
        return bytes(result)
    except Exception as e:
        raise ValueError(f"Erreur rembg : {e}")


def vectorize_to_svg(image_bytes: bytes) -> str:
    """Vectorise une image en SVG via vtracer.

    Retourne le contenu SVG sous forme de chaine de caracteres.
    Leve ImportError si vtracer n est pas installe (prod uniquement).
    Leve ValueError si les bytes ne sont pas une image valide.

    Note : vtracer fonctionne mieux sur des images avec fond transparent
    (passer dans remove_background d abord si necessaire).
    """
    if not VTRACER_AVAILABLE:
        raise ImportError(
            "vtracer n est pas installe. "
            "En production, il est fourni via le Dockerfile (Rust toolchain). "
            "En local : pip install vtracer (necessite Rust)"
        )
    try:
        # vtracer attend un chemin fichier — on passe via bytes
        svg_str = _vtracer.convert_raw_image_to_svg(
            image_bytes,
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=4,
            color_precision=6,
            layer_difference=16,
            corner_threshold=60,
            length_threshold=4.0,
            max_iterations=10,
            splice_threshold=45,
            path_precision=8,
        )
        return svg_str
    except Exception as e:
        raise ValueError(f"Erreur vtracer : {e}")
