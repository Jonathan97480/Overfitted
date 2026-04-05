import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from httpx import AsyncClient
from app.main import app

import io
from PIL import Image

@pytest.mark.asyncio
async def test_upload_image():
    # Génère une image PNG valide en mémoire
    img = Image.new('RGB', (100, 100), color='red')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    files = {'file': ('test.png', buf, 'image/png')}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/fixer/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data['filename'] == 'test.png'
    assert data['format'] == 'PNG'
    assert data['size'] == [100, 100]
