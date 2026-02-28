import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from . import schemas, crud, models
from .newsmatics import search_news_for_topic
from .knowledgebase import kb_manager
from .kb_cron import kb_cron_loop, run_initial_ingestion
from .llm import (
    enrich_opponent,
    generate_discovery_queries,
    cluster_articles,
    generate_topic_strategy,
    generate_win_strategy,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start KB cron on startup, stop on shutdown."""
    cron_task = asyncio.create_task(kb_cron_loop())
    yield
    cron_task.cancel()
    await kb_manager.close_all()


app = FastAPI(title="Debate Prep API", version="1.0.0", lifespan=lifespan)

# CORS (allow Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Preparations ---

@app.get("/api/preparations")
def list_preparations(db: Session = Depends(get_db)):
    results = crud.get_preparations(db)
    return [schemas.PreparationResponse.model_validate(r).model_dump(mode="json", by_alias=True) for r in results]


@app.post("/api/preparations", status_code=201)
def create_preparation(data: schemas.PreparationCreate, db: Session = Depends(get_db)):
    result = crud.create_preparation(db, data)
    return JSONResponse(
        content=schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True),
        status_code=201,
    )


@app.get("/api/preparations/{prep_id}")
def get_preparation(prep_id: str, db: Session = Depends(get_db)):
    result = crud.get_preparation(db, prep_id)
    if not result:
        raise HTTPException(status_code=404, detail="Preparation not found")
    return schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True)


@app.put("/api/preparations/{prep_id}")
def update_preparation(prep_id: str, data: schemas.PreparationUpdate, db: Session = Depends(get_db)):
    result = crud.update_preparation(db, prep_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Preparation not found")
    return schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True)


@app.delete("/api/preparations/{prep_id}", status_code=204)
def delete_preparation(prep_id: str, db: Session = Depends(get_db)):
    if not crud.delete_preparation(db, prep_id):
        raise HTTPException(status_code=404, detail="Preparation not found")
    return None


# --- Opponents ---

@app.get("/api/opponents")
def list_opponents(db: Session = Depends(get_db)):
    results = crud.get_all_opponents(db)
    return [schemas.OpponentResponse.model_validate(r).model_dump(mode="json", by_alias=True) for r in results]


@app.post("/api/opponents")
async def create_opponent(data: schemas.OpponentCreate, db: Session = Depends(get_db)):
    """Create a new opponent. Auto-enriches using LLM if only name is provided."""
    opp = models.Opponent(name=data.name)
    if data.description:
        opp.description = data.description
    if data.organization:
        opp.organization = data.organization
    if data.known_positions:
        opp.known_positions = data.known_positions
    if data.debate_style:
        opp.debate_style = data.debate_style
    db.add(opp)
    db.commit()
    db.refresh(opp)

    # Auto-enrich if only name was provided
    needs_enrichment = not data.description and not data.organization
    if needs_enrichment:
        try:
            enriched = await enrich_opponent(opp.name)
            if enriched.get("description"):
                opp.description = enriched["description"]
            if enriched.get("organization"):
                opp.organization = enriched["organization"]
            if enriched.get("known_positions"):
                opp.known_positions = enriched["known_positions"]
            if enriched.get("debate_style"):
                opp.debate_style = enriched["debate_style"]
            db.commit()
            db.refresh(opp)
        except Exception as e:
            logger.warning(f"⚠️ Opponent enrichment failed for '{opp.name}': {e}")

    count = crud.get_opponent_encounter_count(db, opp.id)
    return schemas.OpponentResponse.model_validate({
        "id": opp.id,
        "name": opp.name,
        "description": opp.description,
        "organization": opp.organization,
        "known_positions": opp.known_positions,
        "debate_style": opp.debate_style,
        "previous_encounters": count,
        "kb_enabled": opp.kb_enabled or False,
        "kb_status": opp.kb_status or "idle",
        "kb_article_count": opp.kb_article_count or 0,
    }).model_dump(mode="json", by_alias=True)


@app.get("/api/opponents/{opponent_id}")
def get_opponent(opponent_id: str, db: Session = Depends(get_db)):
    result = crud.get_opponent(db, opponent_id)
    if not result:
        raise HTTPException(status_code=404, detail="Opponent not found")
    return schemas.OpponentDetailResponse.model_validate(result).model_dump(mode="json", by_alias=True)


@app.delete("/api/opponents/{opponent_id}")
async def delete_opponent(opponent_id: str, db: Session = Depends(get_db)):
    """Delete an opponent and their associated Knowledge Base."""
    opp = crud.get_opponent(db, opponent_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opponent not found")
        
    # Delete the underlying KB workspace
    from .knowledgebase import kb_manager
    await kb_manager.delete(opponent_id)
    
    # Delete the DB record
    success = crud.delete_opponent(db, opponent_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete opponent")
        
    return {"status": "success", "message": "Opponent deleted"}


# --- User Profile ---

@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    result = crud.get_user_profile(db)
    return schemas.UserProfileResponse.model_validate(result).model_dump(mode="json", by_alias=True)


@app.put("/api/profile")
def update_profile(data: schemas.UserProfileUpdate, db: Session = Depends(get_db)):
    result = crud.update_user_profile(db, data)
    return schemas.UserProfileResponse.model_validate(result).model_dump(mode="json", by_alias=True)


# --- Dashboard ---

@app.get("/api/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    result = crud.get_dashboard_stats(db)
    return schemas.DashboardStats.model_validate(result).model_dump(mode="json", by_alias=True)



# --- Knowledgebase ---

@app.post("/api/opponents/{opponent_id}/kb/enable")
async def enable_kb(opponent_id: str, db: Session = Depends(get_db)):
    result = crud.enable_kb(db, opponent_id)
    if not result:
        raise HTTPException(status_code=404, detail="Opponent not found")
    # Trigger initial historical ingestion in background
    asyncio.create_task(run_initial_ingestion(result["id"], result["name"]))
    return crud.get_kb_status(db, opponent_id)


@app.post("/api/opponents/{opponent_id}/kb/disable")
def disable_kb(opponent_id: str, db: Session = Depends(get_db)):
    result = crud.disable_kb(db, opponent_id)
    if not result:
        raise HTTPException(status_code=404, detail="Opponent not found")
    return crud.get_kb_status(db, opponent_id)


@app.get("/api/opponents/{opponent_id}/kb/status")
def kb_status(opponent_id: str, db: Session = Depends(get_db)):
    result = crud.get_kb_status(db, opponent_id)
    if not result:
        raise HTTPException(status_code=404, detail="Opponent not found")
    
    # Inject the actual processed count from LightRAG
    result["processed_count"] = kb_manager.get_processed_count(opponent_id)
    
    return schemas.KBStatusResponse.model_validate(result).model_dump(mode="json", by_alias=True)


@app.post("/api/opponents/{opponent_id}/kb/query")
async def kb_query(opponent_id: str, data: schemas.KBQueryRequest, db: Session = Depends(get_db)):
    status = crud.get_kb_status(db, opponent_id)
    if not status:
        raise HTTPException(status_code=404, detail="Opponent not found")
    if not status["enabled"]:
        raise HTTPException(status_code=400, detail="Knowledgebase not enabled for this opponent")
    if status["status"] not in ["ready", "ingesting"]:
        raise HTTPException(status_code=400, detail=f"Knowledgebase is {status['status']}, not ready for queries")

    try:
        result = await kb_manager.query(opponent_id, data.query, data.mode)
        return schemas.KBQueryResponse(
            query=data.query,
            mode=data.mode,
            result=result,
        ).model_dump(mode="json", by_alias=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KB query failed: {str(e)}")


@app.get("/api/opponents/{opponent_id}/kb/graph")
def kb_graph(opponent_id: str, db: Session = Depends(get_db)):
    status = crud.get_kb_status(db, opponent_id)
    if not status:
        raise HTTPException(status_code=404, detail="Opponent not found")
    if not status["enabled"]:
        raise HTTPException(status_code=400, detail="Knowledgebase not enabled for this opponent")

    graph_data = kb_manager.get_graph(opponent_id)
    if not graph_data:
        raise HTTPException(status_code=404, detail="Knowledge graph not generated yet")

    return graph_data


# --- Strategy Generation Pipeline ---

def _build_predefined_queries(
    main_topic: str,
    opponent_names: list[str],
    debate_context: str,
) -> list[str]:
    """Step 3a: Generate predefined search queries."""
    queries = []
    if main_topic:
        queries.append(f"{main_topic} controversy")
        queries.append(f"{main_topic} criticism")
    for name in opponent_names:
        queries.append(f"{main_topic} {name} scandal")
        if debate_context:
            queries.append(f"{name} {debate_context}")
    return queries


@app.post("/api/preparations/{prep_id}/generate")
async def generate_strategy(prep_id: str, db: Session = Depends(get_db)):
    """
    Full pipeline:
    1. Enrich opponents (parallel)
    2. Search articles for predefined topics (parallel)
    3a/3b. Generate discovery queries (parallel with 1 & 2)
    3c. Run discovery search
    4. Cluster discovered articles
    5. Generate strategy per topic
    6. Synthesize overall win strategy
    """
    prep = crud.get_preparation(db, prep_id)
    if not prep:
        raise HTTPException(status_code=404, detail="Preparation not found")

    main_topic = prep.get("topic", "")
    user_position = prep.get("user_position", "")
    debate_context = prep.get("debate_context", "")
    opponent_names = [op["name"] for op in prep.get("opponents", [])]
    predefined_topics = prep.get("strategy_topics", [])

    logger.info(f"🚀 Starting pipeline for '{prep.get('title')}' — "
                f"{len(predefined_topics)} predefined topics, {len(opponent_names)} opponents")

    # ── PARALLEL PHASE 1: Enrich + Predefined Search + Query Generation ──

    # Step 1: Enrich each opponent
    async def _enrich_all():
        results = {}
        for op in prep.get("opponents", []):
            try:
                enriched = await enrich_opponent(op["name"])
                results[op["name"]] = enriched
                # Persist enrichment to DB
                db_opp = db.query(models.Opponent).filter(models.Opponent.id == op["id"]).first()
                if db_opp:
                    if enriched.get("description"):
                        db_opp.description = enriched["description"]
                    if enriched.get("organization"):
                        db_opp.organization = enriched["organization"]
                    if enriched.get("known_positions"):
                        db_opp.known_positions = enriched["known_positions"]
                    if enriched.get("debate_style"):
                        db_opp.debate_style = enriched["debate_style"]
            except Exception as e:
                logger.error(f"⚠️ Opponent enrichment failed for {op['name']}: {e}")
                results[op["name"]] = {}
        db.commit()
        return results

    # Step 2: Search articles for predefined topics
    async def _search_predefined():
        results = {}
        for st in predefined_topics:
            try:
                articles = await search_news_for_topic(
                    st.get("title", ""),
                    opponent_names,
                    debate_context,
                )
                results[st["id"]] = articles
                logger.info(f"📰 Found {len(articles)} articles for predefined topic: {st.get('title')}")
            except Exception as e:
                logger.error(f"⚠️ Article search failed for topic '{st.get('title')}': {e}")
                results[st["id"]] = []
        return results

    # Step 3a+3b: Generate discovery queries
    async def _generate_queries():
        predefined = _build_predefined_queries(main_topic, opponent_names, debate_context)
        try:
            llm_queries = await generate_discovery_queries(
                main_topic, user_position, opponent_names, debate_context
            )
        except Exception as e:
            logger.error(f"⚠️ LLM query generation failed: {e}")
            llm_queries = []
        all_queries = predefined + llm_queries
        logger.info(f"🔎 Total discovery queries: {len(all_queries)} "
                     f"({len(predefined)} predefined + {len(llm_queries)} LLM-generated)")
        return all_queries

    # Run Phase 1 in parallel
    enrichment_results, predefined_articles, discovery_queries = await asyncio.gather(
        _enrich_all(),
        _search_predefined(),
        _generate_queries(),
    )

    # Build enriched opponent profiles for Step 5
    opponent_profiles = []
    for op in prep.get("opponents", []):
        enriched = enrichment_results.get(op["name"], {})
        opponent_profiles.append({
            "name": op["name"],
            "description": enriched.get("description") or op.get("description"),
            "organization": enriched.get("organization") or op.get("organization"),
            "known_positions": enriched.get("known_positions") or op.get("known_positions"),
            "debate_style": enriched.get("debate_style") or op.get("debate_style"),
        })

    # Collect article IDs already assigned to predefined topics
    predefined_article_ids = set()
    for articles in predefined_articles.values():
        for a in articles:
            if a.get("article_id"):
                predefined_article_ids.add(a["article_id"])

    # ── Step 3c: Discovery Search Execution ──

    all_discovered_articles = {}
    for query in discovery_queries:
        try:
            logger.info(f"🔎 Running discovery query: {query}")
            articles = await search_news_for_topic(query, [], "")
            for a in articles:
                aid = a.get("article_id")
                if aid and aid not in predefined_article_ids and aid not in all_discovered_articles:
                    all_discovered_articles[aid] = a
        except Exception as e:
            logger.error(f"⚠️ Discovery search failed for query '{query}': {e}")

    unique_discovered = list(all_discovered_articles.values())
    logger.info(f"📰 Found {len(unique_discovered)} unique discovery articles "
                f"({len(predefined_article_ids)} excluded from predefined topics)")

    # ── Step 4: Article Clustering ──

    predefined_topic_names = [st.get("title", "") for st in predefined_topics if st.get("title")]
    clusters: dict[str, list[str]] = {}
    if unique_discovered:
        try:
            clusters = await cluster_articles(unique_discovered, predefined_topic_names)
        except Exception as e:
            logger.error(f"⚠️ Article clustering failed: {e}")

    logger.info(f"🗂️ Created {len(clusters)} discovered topic clusters")

    # ── Step 5: Strategy Generation per Topic ──

    # Build updated predefined topics with articles + strategy
    updated_topics: list[schemas.StrategyTopicCreate] = []

    for st in predefined_topics:
        articles = predefined_articles.get(st["id"], [])
        try:
            llm_result = await generate_topic_strategy(
                topic_title=st.get("title", ""),
                topic_description=st.get("description", ""),
                topic_stance=st.get("stance", ""),
                opponent_names=opponent_names,
                opponent_profiles=opponent_profiles,
                debate_context=debate_context,
                articles=articles,
            )
        except Exception as e:
            logger.error(f"⚠️ Strategy generation failed for topic '{st.get('title')}': {e}")
            llm_result = {"sneaky_questions": [], "arguments": [], "why_bad_for_opponent": ""}

        article_ids = [a["article_id"] for a in articles if a.get("article_id")]
        updated_topics.append(schemas.StrategyTopicCreate(
            title=st.get("title", ""),
            description=st.get("description", ""),
            stance=st.get("stance", ""),
            source="user",
            article_ids=article_ids,
            sneaky_questions=llm_result.get("sneaky_questions", []),
            arguments=llm_result.get("arguments", []),
            why_bad_for_opponent=llm_result.get("why_bad_for_opponent", ""),
        ))

    # Built discovered topics from clusters
    article_lookup = {a["article_id"]: a for a in unique_discovered}
    for cluster_name, cluster_article_ids in clusters.items():
        cluster_arts = [article_lookup[aid] for aid in cluster_article_ids if aid in article_lookup]
        try:
            llm_result = await generate_topic_strategy(
                topic_title=cluster_name,
                topic_description=f"Discovered topic based on {len(cluster_arts)} articles",
                topic_stance=user_position,
                opponent_names=opponent_names,
                opponent_profiles=opponent_profiles,
                debate_context=debate_context,
                articles=cluster_arts,
            )
        except Exception as e:
            logger.error(f"⚠️ Strategy generation failed for discovered topic '{cluster_name}': {e}")
            llm_result = {"sneaky_questions": [], "arguments": [], "why_bad_for_opponent": ""}

        updated_topics.append(schemas.StrategyTopicCreate(
            title=cluster_name,
            description=f"Discovered topic based on {len(cluster_arts)} articles",
            stance=user_position,
            source="discovered",
            article_ids=cluster_article_ids,
            sneaky_questions=llm_result.get("sneaky_questions", []),
            arguments=llm_result.get("arguments", []),
            why_bad_for_opponent=llm_result.get("why_bad_for_opponent", ""),
        ))

    # ── Step 6: Win Strategy Synthesis ──

    strategy_dicts = [
        {
            "title": t.title,
            "arguments": t.arguments,
            "why_bad_for_opponent": t.why_bad_for_opponent,
        }
        for t in updated_topics
    ]

    try:
        win_result = await generate_win_strategy(
            main_topic=main_topic,
            user_position=user_position,
            debate_context=debate_context,
            opponent_profiles=opponent_profiles,
            strategy_topics=strategy_dicts,
        )
    except Exception as e:
        logger.error(f"⚠️ Win strategy synthesis failed: {e}")
        win_result = {"win_strategy": "", "key_arguments": []}

    # ── Save everything ──

    update_data = schemas.PreparationUpdate(
        status=schemas.PreparationStatus.ready,
        win_strategy=win_result.get("win_strategy", ""),
        key_arguments=win_result.get("key_arguments", []),
        strategy_topics=updated_topics,
    )
    result = crud.update_preparation(db, prep_id, update_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update preparation")

    user_count = sum(1 for t in updated_topics if t.source == "user")
    discovered_count = sum(1 for t in updated_topics if t.source == "discovered")
    logger.info(f"✅ Pipeline complete for '{prep.get('title')}' — "
                f"{len(updated_topics)} topics ({user_count} user, {discovered_count} discovered)")

    return schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True)


# --- Health ---

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
