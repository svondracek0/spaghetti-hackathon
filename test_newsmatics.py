import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("NEWSMATICS_API_KEY")

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.newsmatics.com/v1/articles/hybrid-search",
            headers={"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"},
            params={"filter[query]": "climate change", "filter[from]": "2024-01-01", "filter[to]": "2024-01-31", "page[size]": 1}
        )
        print(f"Status: {res.status_code}")
        try:
            data = res.json()
            print(f"Total: {data.get('meta', {}).get('total')}")
        except:
            print(res.text)

asyncio.run(test())
