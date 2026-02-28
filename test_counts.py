import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("NEWSMATICS_API_KEY")

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.newsindex.biz/v1/articles/counts",
            headers={"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"},
            params={"filter[query]": "climate change", "filter[from]": "2024-01-01", "filter[to]": "2024-01-31"}
        )
        print(f"Status: {res.status_code}")
        try:
            print(res.json())
        except:
            print(res.text)

asyncio.run(test())
