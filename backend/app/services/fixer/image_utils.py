from PIL import Image
import io

MIN_DPI = 300


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