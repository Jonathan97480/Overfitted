from PIL import Image
import io

def validate_and_open_image(file_bytes: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Validation rapide
        img = Image.open(io.BytesIO(file_bytes))  # Recharger pour manip
        return img
    except Exception as e:
        raise ValueError(f"Image invalide: {e}")
