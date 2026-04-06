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

    Retourne les bytes PNG avec canal alpha propre (sans frange sombre).
    Utilise alpha_matting pour des bords nets, puis supprime les pixels
    semi-transparents sombres residuels (defringing).
    """
    if not REMBG_AVAILABLE:
        raise ImportError(
            "rembg n est pas installe. "
            "En production, il est fourni via le Dockerfile. "
            "En local : pip install rembg (necessite ONNX runtime)"
        )
    try:
        # Alpha matting = bords beaucoup plus propres (plus lent mais necessaire)
        result_bytes = bytes(_rembg_remove(
            image_bytes,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=6,
        ))
    except Exception:
        # Fallback sans alpha_matting si l image est trop petite pour pymatting
        try:
            result_bytes = bytes(_rembg_remove(image_bytes))
        except Exception as e:
            raise ValueError(f"Erreur rembg : {e}")

    # Defringing : supprimer les pixels de bord parasites (sombres ET clairs)
    try:
        img = Image.open(io.BytesIO(result_bytes)).convert("RGBA")

        import numpy as _np
        rgba_arr = _np.array(img, dtype=_np.uint8)
        a_arr = rgba_arr[:, :, 3]

        # 1 — Pixels quasi-transparents : forcer à transparent pur
        mask_low = a_arr < 25
        rgba_arr[mask_low] = [0, 0, 0, 0]

        luminance = (0.299 * rgba_arr[:, :, 0].astype(float)
                   + 0.587 * rgba_arr[:, :, 1].astype(float)
                   + 0.114 * rgba_arr[:, :, 2].astype(float))

        # 2 — Frange sombre : pixels noirs/gris foncés semi-transparents sur bord
        mask_dark = (luminance < 50) & (a_arr < 200)
        rgba_arr[mask_dark] = [0, 0, 0, 0]

        # 3 — Frange claire/blanche : pixels très lumineux résidus de fond clair
        #     Seuil alpha plus strict ici pour ne pas effacer les cheveux blancs
        #     On cible uniquement les pixels qui sont PRESQUE transparents
        mask_white = (luminance > 210) & (a_arr < 80)
        rgba_arr[mask_white] = [0, 0, 0, 0]

        # 4 — Érosion douce du canal alpha pour réduire la frange résiduelle
        #     (scipy optionnel, fallback sans)
        try:
            from scipy.ndimage import binary_erosion as _be
            alpha_binary = a_arr > 128
            eroded = _be(alpha_binary, iterations=1)
            # Pixels retirés par l'érosion : transparents
            removed = alpha_binary & ~eroded
            rgba_arr[removed] = [0, 0, 0, 0]
        except ImportError:
            pass

        out = Image.fromarray(rgba_arr, "RGBA")
        buf = io.BytesIO()
        out.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        return result_bytes
    except Exception:
        return result_bytes


def autocrop_transparent(img: Image.Image, padding: int = 4) -> Image.Image:
    """Rogne les marges entièrement transparentes autour du sujet.

    Fonctionne uniquement sur les images RGBA. Retourne l'image originale
    inchangée si elle n'a pas de canal alpha ou si le contenu est vide.
    padding : pixels de marge conservés autour du sujet (default 4).
    """
    if img.mode != "RGBA":
        return img
    try:
        import numpy as _np
        rgba = _np.array(img)
        alpha = rgba[:, :, 3]
        rows = _np.any(alpha > 0, axis=1)
        cols = _np.any(alpha > 0, axis=0)
        if not rows.any() or not cols.any():
            return img  # image entierement transparente — rien a rogner
        r_min, r_max = int(_np.argmax(rows)), int(len(rows) - 1 - _np.argmax(rows[::-1]))
        c_min, c_max = int(_np.argmax(cols)), int(len(cols) - 1 - _np.argmax(cols[::-1]))
        # Ajouter le padding sans depasser les dimensions
        r_min = max(0, r_min - padding)
        r_max = min(img.height - 1, r_max + padding)
        c_min = max(0, c_min - padding)
        c_max = min(img.width - 1, c_max + padding)
        return img.crop((c_min, r_min, c_max + 1, r_max + 1))
    except ImportError:
        # Fallback sans numpy via getbbox PIL
        bbox = img.split()[3].getbbox()  # bounding box du canal alpha
        if bbox is None:
            return img
        pad = padding
        bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(img.width, bbox[2] + pad),
            min(img.height, bbox[3] + pad),
        )
        return img.crop(bbox)


def autocrop_transparent(img: Image.Image, padding: int = 4) -> Image.Image:
    """Rogne les marges entièrement transparentes autour du sujet.

    Fonctionne uniquement sur les images RGBA. Retourne l'image originale
    inchangée si elle n'a pas de canal alpha ou si le contenu est vide.
    padding : pixels de marge conservés autour du sujet (default 4).
    """
    if img.mode != "RGBA":
        return img
    try:
        import numpy as _np
        alpha = _np.array(img)[:, :, 3]
        rows = _np.any(alpha > 0, axis=1)
        cols = _np.any(alpha > 0, axis=0)
        if not rows.any() or not cols.any():
            return img  # image entièrement transparente — rien à rogner
        r_min = int(_np.argmax(rows))
        r_max = int(len(rows) - 1 - _np.argmax(rows[::-1]))
        c_min = int(_np.argmax(cols))
        c_max = int(len(cols) - 1 - _np.argmax(cols[::-1]))
        r_min = max(0, r_min - padding)
        r_max = min(img.height - 1, r_max + padding)
        c_min = max(0, c_min - padding)
        c_max = min(img.width - 1, c_max + padding)
        return img.crop((c_min, r_min, c_max + 1, r_max + 1))
    except ImportError:
        # Fallback PIL getbbox sur le canal alpha
        bbox = img.split()[3].getbbox()
        if bbox is None:
            return img
        bbox = (
            max(0, bbox[0] - padding),
            max(0, bbox[1] - padding),
            min(img.width, bbox[2] + padding),
            min(img.height, bbox[3] + padding),
        )
        return img.crop(bbox)


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
        svg_str = _vtracer.convert_raw_image_to_svg(
            image_bytes,
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=2,        # moins de bruit supprimé → plus de détail
            color_precision=8,       # précision couleur maximale
            layer_difference=8,      # plus de couches couleur → moins de blocs plats
            corner_threshold=40,     # coins plus nets
            length_threshold=2.0,    # chemins plus fins → plus de détail
            max_iterations=20,       # meilleur ajustement des courbes
            splice_threshold=35,
            path_precision=10,
        )
        return svg_str
    except Exception as e:
        raise ValueError(f"Erreur vtracer : {e}")
