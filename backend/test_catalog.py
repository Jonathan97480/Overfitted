"""Script de debug temporaire pour inspecter l'API Printful catalogue."""
import asyncio
import json
import sys
import os

sys.path.insert(0, ".")
os.chdir(os.path.dirname(os.path.abspath(__file__)))


async def main():
    from app.database import get_db
    from app.services.printful.client import resolve_api_key, _headers, PRINTFUL_BASE_URL
    import httpx

    async for db in get_db():
        key = await resolve_api_key(db)
        async with httpx.AsyncClient(timeout=30) as client:

            # --- Test 1 : search natif Printful ---
            print("=== TEST SEARCH NATIF /products?search=stella ===")
            r = await client.get(
                f"{PRINTFUL_BASE_URL}/products?search=stella&limit=100",
                headers=_headers(key),
            )
            d = r.json()
            print(f"status={r.status_code}, nb={len(d.get('result', []))}, code={d.get('code')}")
            print()

            # --- Test 2 : v1 detail pour Stella id=479 (fonctionne ?) ---
            print("=== V1 /products/479 (Stella STSU177) ===")
            import json
            r2 = await client.get(
                f"{PRINTFUL_BASE_URL}/products/479", headers=_headers(key)
            )
            d2 = r2.json()
            print(f"status={r2.status_code}, code={d2.get('code')}")
            if r2.status_code == 200:
                variants = d2.get("result", {}).get("variants", [])
                print(f"nb variants: {len(variants)}")
                if variants:
                    print(json.dumps(variants[0], indent=2))
            else:
                print(d2)
            print()

            # --- Test 3 : v2 catalog-variants pour Stella id=479 ---
            print("=== V2 /v2/catalog-products/479/catalog-variants ===")
            r3 = await client.get(
                "https://api.printful.com/v2/catalog-products/479/catalog-variants?limit=3",
                headers=_headers(key),
            )
            d3 = r3.json()
            print(f"status={r3.status_code}")
            if r3.status_code == 200:
                items = d3.get("data", [])
                paging = d3.get("paging", {})
                print(f"nb variants: {paging.get('total','?')}")
                if items:
                    print(json.dumps(items[0], indent=2))
            else:
                print(d3)
            print()

        break


asyncio.run(main())
