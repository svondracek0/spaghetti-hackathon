from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from . import schemas, crud
from .newsmatics import search_news_for_topic
from .llm import generate_topic_strategy

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Debate Prep API", version="1.0.0")

# CORS (allow Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def camel_response(data, status_code: int = 200):
    """Return a JSONResponse with camelCase keys."""
    if isinstance(data, list):
        json_data = [
            schemas.CamelModel.model_validate(item).model_dump(mode="json", by_alias=True)
            if isinstance(item, dict) else item
            for item in data
        ]
    elif isinstance(data, dict):
        json_data = data
    else:
        json_data = data
    return JSONResponse(content=json_data, status_code=status_code)


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


# --- Strategy Generation ---

@app.post("/api/preparations/{prep_id}/generate")
async def generate_strategy(prep_id: str, db: Session = Depends(get_db)):
    """
    For each strategy topic in the preparation:
    1. Search Newsmatics for relevant articles
    2. Use the LLM to generate questions, arguments, and analysis
    3. Update the strategy topic in the database
    4. Set the preparation status to 'Ready'
    """
    prep = crud.get_preparation(db, prep_id)
    if not prep:
        raise HTTPException(status_code=404, detail="Preparation not found")

    opponent_names = [op["name"] for op in prep.get("opponents", [])]
    debate_context = prep.get("debate_context", "")
    strategy_topics = prep.get("strategy_topics", [])

    if not strategy_topics:
        raise HTTPException(status_code=400, detail="No strategy topics to generate. Add topics first.")

    print(f"🚀 Generating strategy for '{prep.get('title')}' ({len(strategy_topics)} topics)...")

    updated_topics = []
    for st in strategy_topics:
        topic_title = st.get("title", "")
        topic_desc = st.get("description", "")
        topic_stance = st.get("stance", "")

        print(f"  📰 Searching news for topic: {topic_title}")
        articles = await search_news_for_topic(topic_title, opponent_names, debate_context)

        print(f"  🤖 Generating strategy for topic: {topic_title} ({len(articles)} articles)")
        llm_result = await generate_topic_strategy(
            topic_title=topic_title,
            topic_description=topic_desc,
            topic_stance=topic_stance,
            opponent_names=opponent_names,
            debate_context=debate_context,
            articles=articles,
        )

        # Build the update payload for this topic
        article_ids = [a["article_id"] for a in articles if a.get("article_id")]
        updated_topics.append(schemas.StrategyTopicCreate(
            title=topic_title,
            description=topic_desc,
            stance=topic_stance,
            article_ids=article_ids,
            sneaky_questions=llm_result.get("sneaky_questions", []),
            arguments=llm_result.get("arguments", []),
            why_bad_for_opponent=llm_result.get("why_bad_for_opponent", ""),
        ))

    # Update the preparation with generated content
    update_data = schemas.PreparationUpdate(
        status=schemas.PreparationStatus.ready,
        strategy_topics=updated_topics,
    )
    result = crud.update_preparation(db, prep_id, update_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update preparation")

    print(f"✅ Strategy generation complete for '{prep.get('title')}'")
    return schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True)


# --- Health ---

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

