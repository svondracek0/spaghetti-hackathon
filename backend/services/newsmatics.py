import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEWSMATICS_API_KEY = os.getenv("NEWSMATICS_API_KEY")
BASE_URL = "https://api.newsindex.biz/v1"

async def search_news(opponents: str, context: str, topics: str):
    """
    Search for relevant news articles using Newsmatics Hybrid Search.
    """
    if not NEWSMATICS_API_KEY:
        print("NEWSMATICS_API_KEY not found in environment variables.")
        return []

    # Construct the query from input fields
    query = f"{opponents} {context} {topics}".strip()
    
    params = {
        "filter[query]": query,
        "weight": 0,  # Balanced semantic and full-text search
        "page[size]": 5,
        "include-text": 1
    }
    
    headers = {
        "Authorization": f"Bearer {NEWSMATICS_API_KEY}",
        "Accept": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/articles/hybrid-search", params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Format results for the LLM
            articles = data.get("data", [])
            formatted_articles = []
            for article in articles:
                attributes = article.get("attributes", {})
                title = attributes.get("title", "No Title")
                text = attributes.get("text", attributes.get("snippet", "No Content"))
                url = attributes.get("url", "No URL")
                formatted_articles.append({
                    "title": title,
                    "content": text[:500] + "..." if len(text) > 500 else text, # Limit content size
                    "url": url
                })
            return formatted_articles
        except Exception as e:
            print(f"Error fetching news from Newsmatics: {e}")
            return []
