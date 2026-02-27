import os
import httpx
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
print(f"Using API Key: {api_key[:10]}...")

# 1. Simple HTTP Test
print("\n--- Testing via direct HTTP ---")
url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
try:
    response = httpx.get(url, timeout=10)
    print(f"HTTP Status: {response.status_code}")
    if response.status_code == 200:
        models = response.json().get("models", [])
        print(f"Number of models found: {len(models)}")
        for m in models[:5]:
            print(f" - {m['name']}")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"HTTP Error: {e}")

# 2. SDK Test
print("\n--- Testing via SDK ---")
from google import genai
client = genai.Client(api_key=api_key)
try:
    for model in client.models.list():
        print(f"SDK Model: {model.name}")
except Exception as e:
    print(f"SDK Error: {e}")
