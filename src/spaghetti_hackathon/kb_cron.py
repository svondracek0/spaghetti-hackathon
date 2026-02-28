"""
Background cron for ingesting articles into per-opponent LightRAG knowledgebases.

Phase 1 (Historical): On KB enable, bulk-ingests 5 years of articles.
Phase 2 (Ongoing):    Every N minutes, fetches new articles for all active KBs.
"""

import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

CRON_INTERVAL_MINUTES = int(os.getenv("EINFRA_KB_CRON_MINUTES", "30"))
HISTORICAL_YEARS = 5
ARTICLES_PER_PAGE = 100
MAX_HISTORICAL_PAGES = 20  # Safety cap: max 2000 articles per opponent
MAX_INGESTION_RETRIES = 3  # Retries for LightRAG ingestion per month
INGESTION_RETRY_BACKOFF = 3  # Base seconds for retry backoff


async def run_initial_ingestion(opponent_id: str, opponent_name: str):
    """
    Phase 1: Historical bulk ingestion.
    Fetches articles about the opponent from the last HISTORICAL_YEARS years.
    Runs as a background task so the API responds immediately.

    Robustness features:
    - Queries Newsmatics for total article count upfront (sets the UI denominator)
    - Retries failed LightRAG ingestions with exponential backoff
    - Tracks failed months and retries them at the end
    - Article count is always derived from IngestedArticle table (ground truth)
    """
    from .knowledgebase import kb_manager
    from .newsmatics import search_articles_for_opponent, get_total_article_count
    from .database import SessionLocal
    from . import models

    logger.info(f"🔄 Starting historical ingestion for '{opponent_name}' (opponent {opponent_id})")

    db = SessionLocal()
    total_ingested = 0

    try:
        opp = db.query(models.Opponent).filter(models.Opponent.id == opponent_id).first()
        if not opp:
            logger.error(f"❌ Opponent {opponent_id} not found during historical ingestion.")
            return

        # ── Step 0: Query Newsmatics for total article count ──
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=365 * HISTORICAL_YEARS)

        try:
            total_available = await get_total_article_count(
                opponent_name,
                published_after=start_date.strftime("%Y-%m-%d"),
                published_before=now.strftime("%Y-%m-%d"),
            )
            if total_available > 0:
                opp.kb_article_count = total_available
                db.commit()
                logger.info(f"📊 Newsmatics reports {total_available} total articles for '{opponent_name}'")
        except Exception as e:
            logger.warning(f"⚠️ Could not fetch total article count for '{opponent_name}': {e}")

        # ── Generate monthly intervals for the last 5 years ──
        current_date = start_date
        intervals = []
        while current_date < now:
            # Safely calculate first day of next month
            next_month_rough = current_date.replace(day=1) + timedelta(days=32)
            next_month = next_month_rough.replace(day=1)

            end_date = min(next_month, now)
            intervals.append((current_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")))
            current_date = next_month

        logger.info(f"📅 Broken down historical ingestion into {len(intervals)} monthly periods for '{opponent_name}'")

        # ── Fetch & ingest articles for each month ──
        failed_intervals: list[tuple[str, str]] = []

        for pub_after, pub_before in intervals:
            success = await _ingest_month(
                db, opp, opponent_id, opponent_name, pub_after, pub_before, kb_manager
            )
            if success is None:
                # No articles or already ingested — fine
                pass
            elif success:
                total_ingested += success
            else:
                # Failed — mark for retry
                failed_intervals.append((pub_after, pub_before))

        # ── Retry failed months ──
        if failed_intervals:
            logger.info(f"🔁 Retrying {len(failed_intervals)} failed months for '{opponent_name}'...")
            for pub_after, pub_before in failed_intervals:
                success = await _ingest_month(
                    db, opp, opponent_id, opponent_name, pub_after, pub_before, kb_manager
                )
                if success and success > 0:
                    total_ingested += success

        # ── Sync final article count from IngestedArticle table (ground truth) ──
        actual_ingested = (
            db.query(models.IngestedArticle)
            .filter(models.IngestedArticle.opponent_id == opponent_id)
            .count()
        )
        # If we couldn't get the Newsmatics total, fall back to ingested count
        if (opp.kb_article_count or 0) < actual_ingested:
            opp.kb_article_count = actual_ingested

        # Update opponent status
        opp.kb_status = "ready"
        opp.kb_last_ingested = datetime.now(timezone.utc)
        db.commit()

        logger.info(f"✅ Historical ingestion complete for '{opponent_name}': "
                     f"{total_ingested} new articles ingested, {actual_ingested} total in DB, "
                     f"{opp.kb_article_count} total in Newsmatics")

    except Exception as e:
        logger.error(f"❌ Historical ingestion failed for '{opponent_name}': {e}")
        try:
            opp = db.query(models.Opponent).filter(models.Opponent.id == opponent_id).first()
            if opp:
                opp.kb_status = "error"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


async def _ingest_month(
    db,
    opp,
    opponent_id: str,
    opponent_name: str,
    pub_after: str,
    pub_before: str,
    kb_manager,
) -> int | None:
    """
    Fetch and ingest articles for a single month.
    Returns:
      - int > 0: number of new articles ingested
      - None: no new articles found (skip)
      - False: ingestion failed (should retry)
    """
    from . import models
    from .newsmatics import search_articles_for_opponent

    try:
        articles = await search_articles_for_opponent(
            opponent_name=opponent_name,
            published_after=pub_after,
            published_before=pub_before,
            page=1,
            page_size=3,
        )
    except Exception as e:
        logger.error(f"❌ Newsmatics error for '{opponent_name}' ({pub_after} to {pub_before}): {e}")
        return False

    if not articles:
        logger.debug(f"📄 No articles found for '{opponent_name}' from {pub_after} to {pub_before}")
        return None

    # Filter out already-ingested articles
    existing_ids = set(
        row[0] for row in db.query(models.IngestedArticle.article_id)
        .filter(models.IngestedArticle.opponent_id == opponent_id)
        .all()
    )
    new_articles = [a for a in articles if a["article_id"] not in existing_ids]

    if not new_articles:
        return None

    # Ingest into LightRAG with retry
    for attempt in range(MAX_INGESTION_RETRIES):
        try:
            await kb_manager.ingest_articles(opponent_id, new_articles)
            break
        except Exception as e:
            if attempt < MAX_INGESTION_RETRIES - 1:
                wait = INGESTION_RETRY_BACKOFF * (attempt + 1)
                logger.warning(
                    f"⚠️ LightRAG ingestion retry {attempt + 1}/{MAX_INGESTION_RETRIES} "
                    f"for '{opponent_name}' ({pub_after}): {e}. Waiting {wait}s..."
                )
                await asyncio.sleep(wait)
            else:
                logger.error(
                    f"❌ LightRAG ingestion failed for '{opponent_name}' ({pub_after}) "
                    f"after {MAX_INGESTION_RETRIES} attempts: {e}"
                )
                return False

    # Record ingested articles in DB
    for article in new_articles:
        db.add(models.IngestedArticle(
            opponent_id=opponent_id,
            article_id=article["article_id"],
            title=article.get("title", ""),
        ))

    db.commit()

    logger.info(f"📥 {pub_after} to {pub_before}: ingested {len(new_articles)} articles for '{opponent_name}'")

    # Small delay between months to avoid rate limits
    await asyncio.sleep(1.5)
    return len(new_articles)


async def _cron_cycle():
    """
    Phase 2: One cycle of ongoing ingestion.
    For each opponent with kb_enabled=True and kb_status='ready',
    fetch articles published since last ingestion.
    """
    from .knowledgebase import kb_manager
    from .newsmatics import search_articles_for_opponent, get_total_article_count
    from .database import SessionLocal
    from . import models

    db = SessionLocal()
    try:
        opponents = db.query(models.Opponent).filter(
            models.Opponent.kb_enabled == True,
            models.Opponent.kb_status == "ready",
        ).all()

        if not opponents:
            return

        logger.info(f"🕐 KB cron: processing {len(opponents)} opponent(s)")

        for opp in opponents:
            try:
                # Determine the start date for new articles
                if opp.kb_last_ingested:
                    published_after = opp.kb_last_ingested.strftime("%Y-%m-%d")
                else:
                    published_after = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

                articles = await search_articles_for_opponent(
                    opponent_name=opp.name,
                    published_after=published_after,
                    page=1,
                    page_size=ARTICLES_PER_PAGE,
                )

                if not articles:
                    continue

                # Filter already ingested
                existing_ids = set(
                    row[0] for row in db.query(models.IngestedArticle.article_id)
                    .filter(models.IngestedArticle.opponent_id == opp.id)
                    .all()
                )
                new_articles = [a for a in articles if a["article_id"] not in existing_ids]

                if not new_articles:
                    continue

                # Ingest with retry
                ingested = False
                for attempt in range(MAX_INGESTION_RETRIES):
                    try:
                        await kb_manager.ingest_articles(opp.id, new_articles)
                        ingested = True
                        break
                    except Exception as e:
                        if attempt < MAX_INGESTION_RETRIES - 1:
                            wait = INGESTION_RETRY_BACKOFF * (attempt + 1)
                            logger.warning(
                                f"⚠️ Cron ingestion retry {attempt + 1}/{MAX_INGESTION_RETRIES} "
                                f"for '{opp.name}': {e}. Waiting {wait}s..."
                            )
                            await asyncio.sleep(wait)
                        else:
                            logger.error(f"❌ Cron ingestion failed for '{opp.name}' after {MAX_INGESTION_RETRIES} attempts: {e}")

                if not ingested:
                    continue

                # Record
                for article in new_articles:
                    db.add(models.IngestedArticle(
                        opponent_id=opp.id,
                        article_id=article["article_id"],
                        title=article.get("title", ""),
                    ))

                opp.kb_last_ingested = datetime.now(timezone.utc)
                
                # Refresh article count from Newsmatics (the real total)
                try:
                    total_available = await get_total_article_count(opp.name)
                    if total_available > 0:
                        opp.kb_article_count = total_available
                    else:
                        # Fallback: use IngestedArticle count
                        opp.kb_article_count = (
                            db.query(models.IngestedArticle)
                            .filter(models.IngestedArticle.opponent_id == opp.id)
                            .count()
                        )
                except Exception:
                    # Fallback: use IngestedArticle count
                    opp.kb_article_count = (
                        db.query(models.IngestedArticle)
                        .filter(models.IngestedArticle.opponent_id == opp.id)
                        .count()
                    )
                
                db.commit()

                logger.info(f"📥 Cron: ingested {len(new_articles)} new articles for '{opp.name}'")

            except Exception as e:
                logger.error(f"❌ Cron error for opponent '{opp.name}': {e}")
                continue

    except Exception as e:
        logger.error(f"❌ KB cron cycle failed: {e}")
    finally:
        db.close()


async def kb_cron_loop():
    """Main cron loop — runs forever, executing a cycle every N minutes."""
    logger.info(f"🚀 KB cron started (interval: {CRON_INTERVAL_MINUTES} min)")

    while True:
        try:
            await asyncio.sleep(CRON_INTERVAL_MINUTES * 60)
            await _cron_cycle()
        except asyncio.CancelledError:
            logger.info("🛑 KB cron task cancelled")
            break
        except Exception as e:
            logger.error(f"❌ KB cron loop error: {e}")
            await asyncio.sleep(60)  # Wait a bit before retrying
