import os
import httpx
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
from statistics import mean, stdev

load_dotenv()

NEWSMATICS_API_KEY = os.getenv("NEWSMATICS_API_KEY")
BASE_URL = "https://www.newsmatics.com/news-index/api/v1"

PEAK_THRESHOLD_FACTOR = 1.5  # periods with count > mean * factor are "peaks"


def generate_monthly_periods(years_back: int = 5) -> list[dict]:
    """Generate monthly date ranges going back `years_back` years from today."""
    now = datetime.now()
    periods = []

    # Start from the beginning of the current month, go back
    current = datetime(now.year, now.month, 1)
    start = current - relativedelta(years=years_back)

    cursor = start
    while cursor < current:
        period_start = cursor
        period_end = cursor + relativedelta(months=1) - timedelta(days=1)
        # Don't go past today
        if period_end > now:
            period_end = now

        periods.append({
            "label": cursor.strftime("%Y-%m"),
            "from": period_start.strftime("%Y-%m-%d"),
            "to": period_end.strftime("%Y-%m-%d"),
        })
        cursor += relativedelta(months=1)

    return periods


async def fetch_article_counts(query: str, periods: list[dict]) -> list[dict]:
    """
    Fetch article counts for the entire timeframe in a single request to avoid 429 rate limits,
    then aggregate the daily items into the requested monthly periods locally.
    """
    if not NEWSMATICS_API_KEY:
        print("NEWSMATICS_API_KEY not found in environment variables.")
        return [{"period": p["label"], "count": 0} for p in periods]

    if not periods:
        return []

    headers = {
        "Authorization": f"Bearer {NEWSMATICS_API_KEY}",
        "Accept": "application/json",
    }

    # Split periods into chunks of at most 11 months (< 1 year constraint)
    chunks = []
    for i in range(0, len(periods), 11):
        chunk = periods[i:i+11]
        if chunk:
            chunks.append(chunk)

    monthly_counts = {}

    async def fetch_chunk(chunk):
        start_date = chunk[0]["from"]
        end_date = chunk[-1]["to"]
        import urllib.parse
        encoded_query = urllib.parse.quote(query)
        url = (
            f"{BASE_URL}/articles/counts?"
            f"group-by=month&order=asc&"
            f"filter%5Bstart-date%5D={start_date}&"
            f"filter%5Bend-date%5D={end_date}&"
            f"filter%5Bquery%5D={encoded_query}"
        )
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=headers,
                    timeout=30.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("counts", {})
                else:
                    return {}
            except Exception as e:
                import traceback
                print(f"⚠️ Error fetching chunk {start_date} to {end_date}: {e}")
                return {}

    # Run chunks sequentially to avoid Free Tier rate limits (429 Too Many Requests)
    chunk_results = []
    for c in chunks:
        res = await fetch_chunk(c)
        chunk_results.append(res)
    
    # Merge all chunk dictionaries
    for res_dict in chunk_results:
        monthly_counts.update(res_dict)

    results = []
    for period in periods:
        period_label = period["label"]  # e.g. "2024-01"
        
        # Depending on how Newsmatics formats "month" (e.g. "2024-01" vs "2024-01-01")
        # we will sum up anything that starts with the period's YYYY-MM
        period_count = sum(
            count 
            for date_str, count in monthly_counts.items() 
            if date_str.startswith(period_label)
        )
        
        results.append({
            "period": period_label,
            "count": period_count
        })

    return results


def detect_peak_periods(data: list[dict]) -> list[dict]:
    """
    Identify periods with significantly above-average article counts.
    Groups consecutive high-volume months into suggested timeframe ranges.
    """
    counts = [d["count"] for d in data]

    if not counts or max(counts) == 0:
        return []

    avg = mean(counts)
    threshold = avg * PEAK_THRESHOLD_FACTOR

    # If standard deviation is very low (uniform distribution), lower threshold
    if len(counts) > 1:
        sd = stdev(counts)
        if sd > 0:
            # Use z-score approach: peaks are > 1 standard deviation above mean
            dynamic_threshold = avg + sd
            threshold = min(threshold, dynamic_threshold)

    # Mark peak months
    peak_flags = [d["count"] > threshold for d in data]

    # Group consecutive peak months into ranges
    suggestions = []
    i = 0
    while i < len(peak_flags):
        if peak_flags[i]:
            start_idx = i
            total_articles = data[i]["count"]
            while i + 1 < len(peak_flags) and peak_flags[i + 1]:
                i += 1
                total_articles += data[i]["count"]
            end_idx = i

            start_period = data[start_idx]["period"]
            end_period = data[end_idx]["period"]

            if start_period == end_period:
                label = start_period
            else:
                label = f"{start_period} → {end_period}"

            suggestions.append({
                "from": f"{start_period}-01",
                "to": "",  # Open ended
                "label": f"Since {start_period}",
                "totalArticles": total_articles,
            })
        i += 1

    # Sort by total articles descending, return top 5
    suggestions.sort(key=lambda s: s["totalArticles"], reverse=True)
    return suggestions[:5]


async def get_relevant_timeframes(query: str, years_back: int = 5) -> dict:
    """
    Main entry point: generates monthly periods, fetches counts, and detects peaks.
    """
    periods = generate_monthly_periods(years_back)
    data = await fetch_article_counts(query, periods)
    suggestions = detect_peak_periods(data)

    return {
        "data": data,
        "suggestions": suggestions,
    }
