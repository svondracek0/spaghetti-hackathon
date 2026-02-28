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
    description: Optional[str] = None
    organization: Optional[str] = None
    known_positions: Optional[str] = None
    debate_style: Optional[str] = None


class OpponentCreate(OpponentBase):
    pass


class OpponentResponse(OpponentBase):
    id: str
    previous_encounters: int = 0
    kb_enabled: bool = False
    kb_status: str = "idle"
    kb_article_count: int = 0


# --- Article Reference ---

class ArticleRef(CamelModel):
    article_id: str
    title: str = ""
    url: str = ""
    publisher: str = ""


# --- Strategy Topic ---

class StrategyTopicBase(CamelModel):
    title: str = ""
    description: str = ""
    stance: str = ""
    source: str = "user"
    article_ids: list[str] = []
    articles: list[ArticleRef] = []
    sneaky_questions: list[str] = []
    arguments: list[str] = []
    why_bad_for_opponent: str = ""


class StrategyTopicCreate(StrategyTopicBase):
    pass


class StrategyTopicResponse(StrategyTopicBase):
    id: str


# --- Timeframe ---

class SelectedTimeframe(CamelModel):
    from_: str = ""
    to: str = ""
    label: Optional[str] = None


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
    selected_timeframes: list[SelectedTimeframe] = []


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
    selected_timeframes: Optional[list[SelectedTimeframe]] = None
    opponents: Optional[list[OpponentCreate]] = None
    strategy_topics: Optional[list[StrategyTopicCreate]] = None


class PreparationResponse(PreparationBase):
    id: str
    created_at: datetime
    updated_at: datetime
    share_token: Optional[str] = None
    opponents: list[OpponentResponse] = []
    strategy_topics: list[StrategyTopicResponse] = []
    feedbacks: list["FeedbackResponse"] = []


# --- Feedback ---

class FeedbackCreate(CamelModel):
    rating: int  # 1 = thumbs up, -1 = thumbs down
    comment: str = ""


class FeedbackResponse(CamelModel):
    id: str
    rating: int
    comment: str = ""
    created_at: datetime

# --- User Profile ---

class UserProfileBase(CamelModel):
    name: str = ""
    bio: str = ""
    organization: Optional[str] = None
    is_public_figure: bool = False
    known_positions: Optional[str] = None
    debate_style: Optional[str] = None
    profile_image_url: Optional[str] = None


class UserProfileUpdate(CamelModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    organization: Optional[str] = None
    is_public_figure: Optional[bool] = None
    known_positions: Optional[str] = None
    debate_style: Optional[str] = None
    profile_image_url: Optional[str] = None


class UserProfileResponse(UserProfileBase):
    id: str
    updated_at: Optional[datetime] = None


# --- Dashboard ---

class PreparationSummary(CamelModel):
    id: str
    title: str
    debate_date: Optional[str] = None
    status: PreparationStatus = PreparationStatus.preparing
    opponent_count: int = 0


class DashboardStats(CamelModel):
    total_preparations: int = 0
    total_opponents: int = 0
    preparing_count: int = 0
    ready_count: int = 0
    upcoming_debates: list[PreparationSummary] = []
    top_opponents: list[OpponentResponse] = []


# --- Opponent Detail ---

class OpponentDetailResponse(OpponentResponse):
    preparations: list[PreparationSummary] = []


# --- News Trend ---

class NewsTrendPoint(CamelModel):
    month: str
    count: int


class NewsTrendResponse(CamelModel):
    person_name: str
    data: list[NewsTrendPoint] = []


# --- Knowledgebase ---

class KBStatusResponse(CamelModel):
    enabled: bool = False
    status: str = "idle"  # idle, ingesting, ready, error
    processed_count: int = 0
    last_ingested: Optional[datetime] = None


class KBQueryRequest(CamelModel):
    query: str
    mode: str = "hybrid"  # naive, local, global, hybrid


class KBQueryResponse(CamelModel):
    query: str
    mode: str
    result: str
