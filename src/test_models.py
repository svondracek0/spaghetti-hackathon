import asyncio
import os
import time
import httpx
from dotenv import load_dotenv

# Load from the root directory instead of src/
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

EINFRA_API_KEY = os.getenv("EINFRA_API_KEY")
EINFRA_BASE_URL = "https://llm.ai.e-infra.cz/v1"

async def test_llm():
    print("Testing LLM (gpt-oss-120b)...")
    start = time.time()
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EINFRA_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {EINFRA_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "qwen3-coder-next",
                    "messages": [{"role": "user", "content": "Say hello world and nothing else."}],
                    "max_tokens": 10
                },
                timeout=60.0
            )
            print(f"Status: {response.status_code}")
            print(f"LLM Response in {time.time() - start:.2f}s: {response.text}")
    except Exception as e:
        print(f"LLM Error after {time.time() - start:.2f}s: {e}")

async def test_embedding():
    print("\nTesting Embedding (qwen3-embedding-4b)...")
    start = time.time()
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EINFRA_BASE_URL}/embeddings",
                headers={
                    "Authorization": f"Bearer {EINFRA_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "qwen3-embedding-4b",
                    "input": "This is a test document."
                },
                timeout=60.0
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                dim = len(data["data"][0]["embedding"]) if "data" in data and len(data["data"]) > 0 else 0
                print(f"Embedding Response in {time.time() - start:.2f}s, dimension: {dim}")
            else:
                 print(f"Embedding Error: {response.text}")
    except Exception as e:
        print(f"Embedding Request Error after {time.time() - start:.2f}s: {e}")

async def main():
    if not EINFRA_API_KEY:
        print("EINFRA_API_KEY is not set. Check path to .env file.")
        return
    await test_llm()
    await test_embedding()

if __name__ == "__main__":
    asyncio.run(main())
