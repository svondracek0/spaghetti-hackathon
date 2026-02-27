from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum
from humps import camelize


def to_camel(string: str) -> str:
    return camelize(string)


class CamelModel(BaseModel):
    """Base model that converts snake_case to camelCase for JSON serialization."""
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class PreparationStatus(str, Enum):
    preparing = "Preparing"
    ready = "Ready"


# --- Opponent ---

class OpponentBase(CamelModel):
    name: str
    organization: Optional[str] = None
    known_positions: Optional[str] = None
    debate_style: Optional[str] = None


class OpponentCreate(OpponentBase):
    pass


class OpponentResponse(OpponentBase):
    id: str
    previous_encounters: int = 0


# --- Strategy Topic ---

class StrategyTopicBase(CamelModel):
    title: str = ""
    description: str = ""
    stance: str = ""
    article_ids: list[str] = []
    sneaky_questions: list[str] = []
    arguments: list[str] = []
    why_bad_for_opponent: str = ""


class StrategyTopicCreate(StrategyTopicBase):
    pass


class StrategyTopicResponse(StrategyTopicBase):
    id: str


# --- Preparation ---

class PreparationBase(CamelModel):
    title: str = "Untitled Preparation"
    status: PreparationStatus = PreparationStatus.preparing
    debate_date: Optional[str] = None
    debate_format: Optional[str] = None
    debate_context: str = ""
    topic: str = ""
    user_position: str = ""
    win_strategy: str = ""
    key_arguments: list[str] = []


class PreparationCreate(PreparationBase):
    opponents: list[OpponentCreate] = []
    strategy_topics: list[StrategyTopicCreate] = []


class PreparationUpdate(CamelModel):
    title: Optional[str] = None
    status: Optional[PreparationStatus] = None
    debate_date: Optional[str] = None
    debate_format: Optional[str] = None
    debate_context: Optional[str] = None
    topic: Optional[str] = None
    user_position: Optional[str] = None
    win_strategy: Optional[str] = None
    key_arguments: Optional[list[str]] = None
    opponents: Optional[list[OpponentCreate]] = None
    strategy_topics: Optional[list[StrategyTopicCreate]] = None


class PreparationResponse(PreparationBase):
    id: str
    created_at: datetime
    updated_at: datetime
    opponents: list[OpponentResponse] = []
    strategy_topics: list[StrategyTopicResponse] = []
