import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEWSMATICS_API_KEY = os.getenv("NEWSMATICS_API_KEY")
BASE_URL = "https://api.newsindex.biz/v1"


async def search_news_for_topic(
    topic_title: str,
    opponent_names: list[str],
    context: str,
) -> list[dict]:
    """
    Search Newsmatics for articles relevant to a single strategy topic.
    Returns a list of dicts with keys: title, content, url, article_id.
    """
    if not NEWSMATICS_API_KEY:
        print("⚠️ NEWSMATICS_API_KEY not set — skipping news search.")
        return []

    # Build a focused query for this specific topic + opponents
    opponents_str = ", ".join(opponent_names) if opponent_names else ""
    query = f"{topic_title} {opponents_str} {context}".strip()

    params = {
        "filter[query]": query,
        "weight": 0,  # Balanced semantic + full-text
        "page[size]": 5,
        "include-text": 1,
    }

    headers = {
        "Authorization": f"Bearer {NEWSMATICS_API_KEY}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BASE_URL}/articles/hybrid-search",
                params=params,
                headers=headers,
                timeout=20.0,
            )
            response.raise_for_status()
            data = response.json()

            articles = data.get("data", [])
            formatted = []
            for article in articles:
                attrs = article.get("attributes", {})
                article_id = article.get("id", "")
                title = attrs.get("title", "No Title")
                text = attrs.get("text", attrs.get("snippet", "No Content"))
                url = attrs.get("url", "")
                formatted.append({
                    "article_id": str(article_id),
                    "title": title,
                    "content": text[:800] if len(text) > 800 else text,
                    "url": url,
                })
            return formatted

        except Exception as e:
            import traceback
            print(f"❌ Newsmatics search error for topic '{topic_title}': {e}")
            print(traceback.format_exc())
            return []
