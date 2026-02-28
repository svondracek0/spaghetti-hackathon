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
        strategy_topics.append({
            "id": st.id,
            "title": st.title,
            "description": st.description,
            "stance": st.stance,
            "source": st.source,
            "article_ids": _deserialize_json(st.article_ids_json),
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
    )
    db.add(prep)
    db.flush()

    # Add opponents
    for opp_data in data.opponents:
        opponent = _get_or_create_opponent(db, opp_data)
        prep.opponents.append(opponent)

    # Add strategy topics
    for st_data in data.strategy_topics:
        st = models.StrategyTopic(
            preparation_id=prep.id,
            title=st_data.title,
            description=st_data.description,
            stance=st_data.stance,
            source=st_data.source,
            article_ids_json=_serialize_json(st_data.article_ids),
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
            st = models.StrategyTopic(
                preparation_id=prep.id,
                title=st_data.title,
                description=st_data.description,
                stance=st_data.stance,
                source=st_data.source,
                article_ids_json=_serialize_json(st_data.article_ids),
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


def get_opponent(db: Session, opponent_id: str) -> dict | None:
    """Get a single opponent with encounter count and associated preparations."""
    opp = db.query(models.Opponent).filter(models.Opponent.id == opponent_id).first()
    if not opp:
        return None
    count = get_opponent_encounter_count(db, opp.id)
    preparations = []
    for prep in opp.preparations:
        preparations.append({
            "id": prep.id,
            "title": prep.title,
            "debate_date": prep.debate_date,
            "status": prep.status,
            "opponent_count": len(prep.opponents),
        })
    return {
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
        "preparations": preparations,
    }


def delete_opponent(db: Session, opponent_id: str) -> bool:
    """Delete an opponent and all their associated data, including strategy preparations associations."""
    opp = db.query(models.Opponent).filter(models.Opponent.id == opponent_id).first()
    if not opp:
        return False
        
    db.delete(opp)
    db.commit()
    return True


def get_user_profile(db: Session) -> dict:
    """Get the singleton user profile, auto-creating if missing."""
    profile = db.query(models.UserProfile).filter(models.UserProfile.id == "default").first()
    if not profile:
        profile = models.UserProfile(id="default")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return {
        "id": profile.id,
        "name": profile.name,
        "bio": profile.bio,
        "organization": profile.organization,
        "is_public_figure": profile.is_public_figure,
        "known_positions": profile.known_positions,
        "debate_style": profile.debate_style,
        "profile_image_url": profile.profile_image_url,
        "updated_at": profile.updated_at,
    }


def update_user_profile(db: Session, data: schemas.UserProfileUpdate) -> dict:
    """Update the singleton user profile."""
    profile = db.query(models.UserProfile).filter(models.UserProfile.id == "default").first()
    if not profile:
        profile = models.UserProfile(id="default")
        db.add(profile)
        db.flush()

    if data.name is not None:
        profile.name = data.name
    if data.bio is not None:
        profile.bio = data.bio
    if data.organization is not None:
        profile.organization = data.organization
    if data.is_public_figure is not None:
        profile.is_public_figure = data.is_public_figure
    if data.known_positions is not None:
        profile.known_positions = data.known_positions
    if data.debate_style is not None:
        profile.debate_style = data.debate_style
    if data.profile_image_url is not None:
        profile.profile_image_url = data.profile_image_url

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return {
        "id": profile.id,
        "name": profile.name,
        "bio": profile.bio,
        "organization": profile.organization,
        "is_public_figure": profile.is_public_figure,
        "known_positions": profile.known_positions,
        "debate_style": profile.debate_style,
        "profile_image_url": profile.profile_image_url,
        "updated_at": profile.updated_at,
    }


def get_dashboard_stats(db: Session) -> dict:
    """Get aggregated dashboard statistics."""
    from datetime import date

    all_preps = db.query(models.Preparation).all()
    all_opps = db.query(models.Opponent).all()

    preparing_count = sum(1 for p in all_preps if p.status == "Preparing")
    ready_count = sum(1 for p in all_preps if p.status == "Ready")

    # Upcoming debates: preps with a future debate_date, sorted ascending
    upcoming = []
    today_str = date.today().isoformat()
    for p in all_preps:
        if p.debate_date and p.debate_date >= today_str:
            upcoming.append({
                "id": p.id,
                "title": p.title,
                "debate_date": p.debate_date,
                "status": p.status,
                "opponent_count": len(p.opponents),
            })
    upcoming.sort(key=lambda x: x["debate_date"])

    # Top opponents by encounter count
    opp_list = []
    for opp in all_opps:
        count = get_opponent_encounter_count(db, opp.id)
        opp_list.append({
            "id": opp.id,
            "name": opp.name,
            "description": opp.description,
            "organization": opp.organization,
            "known_positions": opp.known_positions,
            "debate_style": opp.debate_style,
            "previous_encounters": count,
        })
    opp_list.sort(key=lambda x: x["previous_encounters"], reverse=True)

    return {
        "total_preparations": len(all_preps),
        "total_opponents": len(all_opps),
        "preparing_count": preparing_count,
        "ready_count": ready_count,
        "upcoming_debates": upcoming[:10],
        "top_opponents": opp_list[:6],
    }


# --- Knowledgebase ---

def enable_kb(db: Session, opponent_id: str) -> dict | None:
    """Enable KB for an opponent. Returns opponent info or None."""
    opp = db.query(models.Opponent).filter(models.Opponent.id == opponent_id).first()
    if not opp:
        return None
    opp.kb_enabled = True
    if opp.kb_status == "idle":
        opp.kb_status = "ingesting"
    db.commit()
    db.refresh(opp)
    return {"id": opp.id, "name": opp.name, "kb_enabled": opp.kb_enabled, "kb_status": opp.kb_status}


def disable_kb(db: Session, opponent_id: str) -> dict | None:
    """Disable KB for an opponent (keeps data)."""
    opp = db.query(models.Opponent).filter(models.Opponent.id == opponent_id).first()
    if not opp:
        return None
    opp.kb_enabled = False
    db.commit()
    db.refresh(opp)
    return {"id": opp.id, "name": opp.name, "kb_enabled": opp.kb_enabled, "kb_status": opp.kb_status}


def get_kb_status(db: Session, opponent_id: str) -> dict | None:
    """Get KB status for an opponent."""
    opp = db.query(models.Opponent).filter(models.Opponent.id == opponent_id).first()
    if not opp:
        return None
    return {
        "enabled": opp.kb_enabled or False,
        "status": opp.kb_status or "idle",
        "last_ingested": opp.kb_last_ingested,
    }
