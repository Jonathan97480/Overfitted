FROM python:3.11-slim

# --- Dépendances système ---
# build-essential : requis pour compiler vtracer (Rust via maturin) et certaines roues C
# libgomp1       : OpenMP requis par scikit-image / numpy sur Linux
# libgl1         : requis par opencv-python (headless)
# curl            : healthcheck + debug
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgomp1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# --- Rust (requis pour vtracer via maturin) ---
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

COPY requirements.txt ./

# Installer les dépendances Python
# rembg  : background removal (ONNX Runtime — ~200MB de modèles téléchargés au premier appel)
# vtracer : vectorisation SVG (compile depuis Rust)
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir rembg vtracer

COPY ./app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
