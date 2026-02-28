import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from . import models, schemas


def _serialize_json(data: list[str]) -> str:
    return json.dumps(data)


def _deserialize_json(data: str) -> list[str]:
    return json.loads(data) if data else []


def _get_or_create_opponent(db: Session, opp_data: schemas.OpponentCreate) -> models.Opponent:
    """Find existing opponent by name or create a new one."""
    existing = db.query(models.Opponent).filter(
        models.Opponent.name == opp_data.name
    ).first()

    if existing:
        # Update mutable fields if provided
        if opp_data.description is not None:
            existing.description = opp_data.description
        if opp_data.organization is not None:
            existing.organization = opp_data.organization
        if opp_data.known_positions is not None:
            existing.known_positions = opp_data.known_positions
        if opp_data.debate_style is not None:
            existing.debate_style = opp_data.debate_style
        return existing

    opponent = models.Opponent(
        name=opp_data.name,
        description=opp_data.description,
        organization=opp_data.organization,
        known_positions=opp_data.known_positions,
        debate_style=opp_data.debate_style,
    )
    db.add(opponent)
    db.flush()
    return opponent


def get_opponent_encounter_count(db: Session, opponent_id: str) -> int:
    """Count how many preparations include this opponent."""
    return (
        db.query(models.preparation_opponents)
        .filter(models.preparation_opponents.c.opponent_id == opponent_id)
        .count()
    )


def get_all_opponents(db: Session) -> list[dict]:
    """Get all opponents with encounter counts."""
    opponents = db.query(models.Opponent).all()
    result = []
    for opp in opponents:
        count = get_opponent_encounter_count(db, opp.id)
        result.append({
            "id": opp.id,
            "name": opp.name,
            "description": opp.description,
            "organization": opp.organization,
            "known_positions": opp.known_positions,
            "debate_style": opp.debate_style,
            "previous_encounters": count,
        })
    return result


def _prep_to_response(db: Session, prep: models.Preparation) -> dict:
    """Convert a preparation ORM object to a response dict."""
    opponents = []
    for opp in prep.opponents:
        count = get_opponent_encounter_count(db, opp.id)
        opponents.append({
            "id": opp.id,
            "name": opp.name,
            "description": opp.description,
            "organization": opp.organization,
            "known_positions": opp.known_positions,
            "debate_style": opp.debate_style,
            "previous_encounters": count,
        })

    strategy_topics = []
    for st in prep.strategy_topics:
        articles_raw = json.loads(st.articles_json) if st.articles_json else []
        strategy_topics.append({
            "id": st.id,
            "title": st.title,
            "description": st.description,
            "stance": st.stance,
            "source": st.source,
            "article_ids": _deserialize_json(st.article_ids_json),
            "articles": articles_raw,
            "sneaky_questions": _deserialize_json(st.sneaky_questions_json),
            "arguments": _deserialize_json(st.arguments_json),
            "why_bad_for_opponent": st.why_bad_for_opponent,
        })

    return {
        "id": prep.id,
        "title": prep.title,
        "status": prep.status,
        "created_at": prep.created_at,
        "updated_at": prep.updated_at,
        "debate_date": prep.debate_date,
        "debate_format": prep.debate_format,
        "debate_context": prep.debate_context,
        "topic": prep.topic,
        "user_position": prep.user_position,
        "win_strategy": prep.win_strategy,
        "key_arguments": _deserialize_json(prep.key_arguments_json),
        "selected_timeframes": _deserialize_json(prep.selected_timeframes_json),
        "opponents": opponents,
        "strategy_topics": strategy_topics,
    }


def get_preparations(db: Session) -> list[dict]:
    preps = db.query(models.Preparation).order_by(models.Preparation.updated_at.desc()).all()
    return [_prep_to_response(db, p) for p in preps]


def get_preparation(db: Session, prep_id: str) -> dict | None:
    prep = db.query(models.Preparation).filter(models.Preparation.id == prep_id).first()
    if not prep:
        return None
    return _prep_to_response(db, prep)


def create_preparation(db: Session, data: schemas.PreparationCreate) -> dict:
    prep = models.Preparation(
        title=data.title,
        status=data.status.value,
        debate_date=data.debate_date,
        debate_format=data.debate_format,
        debate_context=data.debate_context,
        topic=data.topic,
        user_position=data.user_position,
        win_strategy=data.win_strategy,
        key_arguments_json=_serialize_json(data.key_arguments),
        selected_timeframes_json=_serialize_json([tf.model_dump(by_alias=False) for tf in data.selected_timeframes] if data.selected_timeframes is not None else []),
    )
    db.add(prep)
    db.flush()

    # Add opponents
    for opp_data in data.opponents:
        opponent = _get_or_create_opponent(db, opp_data)
        prep.opponents.append(opponent)

    # Add strategy topics
    for st_data in data.strategy_topics:
        articles_dicts = [a.model_dump() for a in st_data.articles] if st_data.articles else []
        st = models.StrategyTopic(
            preparation_id=prep.id,
            title=st_data.title,
            description=st_data.description,
            stance=st_data.stance,
            source=st_data.source,
            article_ids_json=_serialize_json(st_data.article_ids),
            articles_json=json.dumps(articles_dicts),
            sneaky_questions_json=_serialize_json(st_data.sneaky_questions),
            arguments_json=_serialize_json(st_data.arguments),
            why_bad_for_opponent=st_data.why_bad_for_opponent,
        )
        db.add(st)

    db.commit()
    db.refresh(prep)
    return _prep_to_response(db, prep)


def update_preparation(db: Session, prep_id: str, data: schemas.PreparationUpdate) -> dict | None:
    prep = db.query(models.Preparation).filter(models.Preparation.id == prep_id).first()
    if not prep:
        return None

    # Update scalar fields
    if data.title is not None:
        prep.title = data.title
    if data.status is not None:
        prep.status = data.status.value
    if data.debate_date is not None:
        prep.debate_date = data.debate_date
    if data.debate_format is not None:
        prep.debate_format = data.debate_format
    if data.debate_context is not None:
        prep.debate_context = data.debate_context
    if data.topic is not None:
        prep.topic = data.topic
    if data.user_position is not None:
        prep.user_position = data.user_position
    if data.win_strategy is not None:
        prep.win_strategy = data.win_strategy
    if data.key_arguments is not None:
        prep.key_arguments_json = _serialize_json(data.key_arguments)
    if data.selected_timeframes is not None:
        prep.selected_timeframes_json = _serialize_json([tf.model_dump(by_alias=False) for tf in data.selected_timeframes])

    prep.updated_at = datetime.now(timezone.utc)

    # Update opponents
    if data.opponents is not None:
        prep.opponents.clear()
        for opp_data in data.opponents:
            opponent = _get_or_create_opponent(db, opp_data)
            prep.opponents.append(opponent)

    # Update strategy topics
    if data.strategy_topics is not None:
        # Remove existing
        for st in prep.strategy_topics:
            db.delete(st)
        db.flush()

        for st_data in data.strategy_topics:
            articles_dicts = [a.model_dump() for a in st_data.articles] if st_data.articles else []
            st = models.StrategyTopic(
                preparation_id=prep.id,
                title=st_data.title,
                description=st_data.description,
                stance=st_data.stance,
                source=st_data.source,
                article_ids_json=_serialize_json(st_data.article_ids),
                articles_json=json.dumps(articles_dicts),
                sneaky_questions_json=_serialize_json(st_data.sneaky_questions),
                arguments_json=_serialize_json(st_data.arguments),
                why_bad_for_opponent=st_data.why_bad_for_opponent,
            )
            db.add(st)

    db.commit()
    db.refresh(prep)
    return _prep_to_response(db, prep)


def delete_preparation(db: Session, prep_id: str) -> bool:
    prep = db.query(models.Preparation).filter(models.Preparation.id == prep_id).first()
    if not prep:
        return False
    db.delete(prep)
    db.commit()
    return True
