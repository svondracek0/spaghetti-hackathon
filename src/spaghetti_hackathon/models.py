import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Table, Enum as SAEnum
from sqlalchemy.orm import relationship
from .database import Base

# Association table: preparation <-> opponent (many-to-many)
preparation_opponents = Table(
    "preparation_opponents",
    Base.metadata,
    Column("preparation_id", String, ForeignKey("preparations.id"), primary_key=True),
    Column("opponent_id", String, ForeignKey("opponents.id"), primary_key=True),
)


class Preparation(Base):
    __tablename__ = "preparations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False, default="Untitled Preparation")
    status = Column(SAEnum("Preparing", "Ready", name="preparation_status"), default="Preparing")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Debate info
    debate_date = Column(String, nullable=True)
    debate_format = Column(String, nullable=True)
    debate_context = Column(Text, default="")

    # Topic
    topic = Column(String, default="")
    user_position = Column(Text, default="")

    # Strategy
    win_strategy = Column(Text, default="")
    key_arguments_json = Column(Text, default="[]")  # JSON array of strings
    selected_timeframes_json = Column(Text, default="[]")  # JSON array of dicts

    # Sharing
    share_token = Column(String, nullable=True, unique=True, index=True)

    # Relationships
    opponents = relationship("Opponent", secondary=preparation_opponents, back_populates="preparations")
    strategy_topics = relationship("StrategyTopic", back_populates="preparation", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="preparation", cascade="all, delete-orphan")


class Opponent(Base):
    __tablename__ = "opponents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    organization = Column(String, nullable=True)
    known_positions = Column(Text, nullable=True)
    debate_style = Column(Text, nullable=True)

    preparations = relationship("Preparation", secondary=preparation_opponents, back_populates="opponents")


class StrategyTopic(Base):
    __tablename__ = "strategy_topics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    preparation_id = Column(String, ForeignKey("preparations.id"), nullable=False)
    title = Column(String, default="")
    description = Column(Text, default="")
    stance = Column(Text, default="")
    source = Column(String, default="user")  # 'user' or 'discovered'
    article_ids_json = Column(Text, default="[]")  # JSON array of strings
    articles_json = Column(Text, default="[]")  # JSON array of {article_id, title, url, publisher}
    sneaky_questions_json = Column(Text, default="[]")  # JSON array of strings
    arguments_json = Column(Text, default="[]")  # JSON array of strings
    why_bad_for_opponent = Column(Text, default="")

    preparation = relationship("Preparation", back_populates="strategy_topics")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    preparation_id = Column(String, ForeignKey("preparations.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 = thumbs up, -1 = thumbs down
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    preparation = relationship("Preparation", back_populates="feedbacks")
