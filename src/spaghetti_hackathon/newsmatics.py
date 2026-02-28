import os
import asyncio
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

NEWSMATICS_API_KEY = os.getenv("NEWSMATICS_API_KEY")
BASE_URL = "https://www.newsmatics.com/news-index/api/v1"

# Retry configuration
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


async def search_news_for_topic(
    topic_title: str,
    opponent_names: list[str],
    context: str,
) -> list[dict]:
    """
    Search Newsmatics for articles relevant to a single strategy topic.
    Uses hybrid search (combined semantic + full-text).
    Returns a list of dicts with keys: article_id, title, content, url, publisher.
    """
    if not NEWSMATICS_API_KEY:
        logger.warning("⚠️ NEWSMATICS_API_KEY not set — skipping news search.")
        return []

    # Build a focused query combining topic + opponents + context
    parts = [topic_title]
    if opponent_names:
        parts.append(" | ".join(opponent_names))
    if context:
        parts.append(context)
    query = " ".join(parts).strip()

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
            logger.error(f"❌ Newsmatics HTTP error for '{topic_title}': {e.response.status_code} — {e.response.text[:200]}")
            return []
        except Exception as e:
            logger.error(f"❌ Newsmatics search error for '{topic_title}': {e}")
            return []


async def get_total_article_count(
    opponent_name: str,
    published_after: str = "",
    published_before: str = "",
) -> int:
    """
    Query Newsmatics for the total number of articles available for an opponent.
    Uses a minimal page_size=1 request to read the total from response metadata.
    Returns 0 if the count cannot be determined.
    """
    if not NEWSMATICS_API_KEY:
        return 0

    params = {
        "filter[query]": opponent_name,
        "page[size]": 1,
        "page[offset]": 0,
        "include-text": 0,
    }

    if published_after:
        params["filter[start-date]"] = published_after
    if published_before:
        params["filter[end-date]"] = published_before

    headers = {
        "Authorization": f"Bearer {NEWSMATICS_API_KEY}",
        "Accept": "application/json",
    }

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/articles/by-relevance",
                    params=params,
                    headers=headers,
                    timeout=20.0,
                )
                response.raise_for_status()
                data = response.json()

                # Try multiple common response formats for total count
                total = (
                    data.get("total")
                    or data.get("totalResults")
                    or (data.get("meta", {}) or {}).get("total")
                    or (data.get("meta", {}) or {}).get("totalResults")
                    or (data.get("meta", {}) or {}).get("total_results")
                    or (data.get("pagination", {}) or {}).get("total")
                )

                if total is not None:
                    count = int(total)
                    logger.info(f"📊 Newsmatics total for '{opponent_name}': {count} articles")
                    return count

                # Fallback: if no total metadata, log the keys so we can debug
                logger.warning(
                    f"⚠️ Could not find total count in Newsmatics response for '{opponent_name}'. "
                    f"Response keys: {list(data.keys())}"
                )
                return 0

        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning(f"⚠️ Retry {attempt + 1}/{MAX_RETRIES} for count query '{opponent_name}': {e}. Waiting {wait}s...")
                await asyncio.sleep(wait)
            else:
                logger.error(f"❌ Failed to get article count for '{opponent_name}' after {MAX_RETRIES} attempts: {e}")
                return 0

    return 0


async def search_articles_for_opponent(
    opponent_name: str,
    published_after: str = "",
    published_before: str = "",
    page: int = 1,
    page_size: int = 100,
) -> list[dict]:
    """
    Search Newsmatics for articles about an opponent.
    Optimized for KB ingestion: supports date filtering, pagination, full text.
    Includes retry logic with exponential backoff.
    Returns a list of dicts with keys: article_id, title, content, url, publisher, published_datetime.
    """
    if not NEWSMATICS_API_KEY:
        logger.warning("⚠️ NEWSMATICS_API_KEY not set — skipping KB article search.")
        return []

    # Using the exact relevance-based search endpoint
    params = {
        "filter[query]": opponent_name,
        "page[size]": page_size,
        "page[offset]": (page - 1) * page_size,
        "include-text": 1,
    }

    if published_after:
        params["filter[start-date]"] = published_after
    if published_before:
        params["filter[end-date]"] = published_before

    headers = {
        "Authorization": f"Bearer {NEWSMATICS_API_KEY}",
        "Accept": "application/json",
    }

    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/articles/by-relevance",
                    params=params,
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                articles = data.get("articles", [])
                formatted = []
                for article in articles:
                    article_id = str(article.get("id", ""))
                    title = article.get("title", "No Title")
                    text = article.get("text") or article.get("abstract", "No Content")
                    url = article.get("url", "")
                    publisher = article.get("publisher", "")

                    formatted.append({
                        "article_id": article_id,
                        "title": title,
                        "content": text,  # Full text, not truncated
                        "url": url,
                        "publisher": publisher,
                    })

                logger.info(f"📰 KB search: {len(formatted)} articles for '{opponent_name}' (page {page}, after {published_after or 'all'})")
                return formatted

        except httpx.HTTPStatusError as e:
            last_error = e
            if e.response.status_code >= 500 or e.response.status_code == 429:
                # Server error or rate limit — retry
                if attempt < MAX_RETRIES - 1:
                    wait = RETRY_BACKOFF_BASE ** attempt
                    logger.warning(f"⚠️ Retry {attempt + 1}/{MAX_RETRIES} for '{opponent_name}' ({pub_after_label(published_after)}): HTTP {e.response.status_code}. Waiting {wait}s...")
                    await asyncio.sleep(wait)
                    continue
            logger.error(f"❌ Newsmatics HTTP error for KB search '{opponent_name}': {e.response.status_code}")
            return []
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning(f"⚠️ Retry {attempt + 1}/{MAX_RETRIES} for '{opponent_name}' ({pub_after_label(published_after)}): {type(e).__name__}. Waiting {wait}s...")
                await asyncio.sleep(wait)
                continue
            logger.error(f"❌ Newsmatics KB search failed for '{opponent_name}' after {MAX_RETRIES} attempts: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Newsmatics KB search error for '{opponent_name}': {e}")
            return []

    logger.error(f"❌ Newsmatics KB search exhausted retries for '{opponent_name}': {last_error}")
    return []


def pub_after_label(published_after: str) -> str:
    """Helper for log messages."""
    return published_after if published_after else "all"
