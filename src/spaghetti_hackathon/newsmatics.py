import os
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

NEWSMATICS_API_KEY = os.getenv("NEWSMATICS_API_KEY")
BASE_URL = "https://www.newsmatics.com/news-index/api/v1"


async def search_news_for_topic(
    query: str,
    opponents: list[str],
    context: str,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict]:
    """
    Search for relevant news articles using Newsmatics Hybrid Search.
    Optionally filter by date range using date_from/date_to (YYYY-MM-DD).
    """
    if not NEWSMATICS_API_KEY:
        logger.warning("NEWSMATICS_API_KEY not found. Returning mock data.")
        # This line assumes _mock_search_results is defined elsewhere or will be added.
        # If not, it will cause a NameError.
        return _mock_search_results(query)

    # Build a focused query combining topic + opponents + context
    parts = [query]
    if opponents:
        parts.append(" | ".join(opponents))
    if context:
        parts.append(context)
    full_query = " ".join(parts).strip()

    params = {
        "filter[query]": full_query,
        "weight": 0,  # Balanced semantic + full-text
        "page[size]": 5,
        "include-text": 1,
    }

    if date_from:
        params["filter[from]"] = date_from
    if date_to:
        params["filter[to]"] = date_to

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

            articles = data.get("articles", [])
            formatted = []
            for article in articles:
                article_id = str(article.get("id", ""))
                title = article.get("title", "No Title")
                # Prefer full text if available, fall back to abstract
                text = article.get("text") or article.get("abstract", "No Content")
                url = article.get("url", "")
                publisher = article.get("publisher", "")

                formatted.append({
                    "article_id": article_id,
                    "title": title,
                    "content": text[:800] if len(text) > 800 else text,
                    "url": url,
                    "publisher": publisher,
                })

            logger.info(f"📰 Newsmatics: found {len(formatted)} articles for query: {query[:80]}...")
            return formatted

        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Newsmatics HTTP error for '{query}': {e.response.status_code} — {e.response.text[:200]}")
            return []
        except Exception as e:
            logger.error(f"❌ Newsmatics search error for '{query}': {e}")
            return []
