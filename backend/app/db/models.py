# ascend/backend/app/db/models.py
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Integer, String, Text, DateTime, SmallInteger,
    ForeignKey, JSON, func, CheckConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class Law(Base):
    __tablename__ = "laws"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    title_en: Mapped[Optional[str]] = mapped_column(Text)
    title_ar: Mapped[Optional[str]] = mapped_column(Text)
    jurisdiction: Mapped[str] = mapped_column(String(64), default="Dubai")
    year: Mapped[Optional[int]] = mapped_column(Integer)
    source_file: Mapped[Optional[str]] = mapped_column(Text)
    version: Mapped[Optional[str]] = mapped_column(String(32))
    effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    nodes: Mapped[list["LawNode"]] = relationship(back_populates="law", cascade="all, delete-orphan")


class LawNode(Base):
    __tablename__ = "law_nodes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    law_id: Mapped[int] = mapped_column(ForeignKey("laws.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("law_nodes.id", ondelete="SET NULL"))
    node_type: Mapped[str] = mapped_column(String(32), nullable=False)
    number: Mapped[Optional[str]] = mapped_column(String(32))
    title: Mapped[Optional[str]] = mapped_column(Text)
    text: Mapped[Optional[str]] = mapped_column(Text)
    path_text: Mapped[Optional[str]] = mapped_column(Text)
    ordinal: Mapped[Optional[int]] = mapped_column(Integer)
    language: Mapped[str] = mapped_column(String(8), default="ar")
    law: Mapped["Law"] = relationship(back_populates="nodes")
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="node", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("law_nodes.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_with_path: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[Optional[int]] = mapped_column(Integer)
    node: Mapped["LawNode"] = relationship(back_populates="chunks")
    embeddings: Mapped[list["ChunkEmbedding"]] = relationship(back_populates="chunk", cascade="all, delete-orphan")


class ChunkEmbedding(Base):
    __tablename__ = "chunk_embeddings"
    chunk_id: Mapped[int] = mapped_column(ForeignKey("chunks.id", ondelete="CASCADE"), primary_key=True)
    embedding_model: Mapped[str] = mapped_column(String(128), primary_key=True)
    embedding_dim: Mapped[int] = mapped_column(Integer, nullable=False)
    # NOTE: Vector dimension is dynamic per model; we store as Vector(1536) max
    # and rely on embedding_dim column for the actual model dimension.
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1536))
    chunk: Mapped["Chunk"] = relationship(back_populates="embeddings")


class Definition(Base):
    __tablename__ = "definitions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    law_id: Mapped[int] = mapped_column(ForeignKey("laws.id", ondelete="CASCADE"))
    term: Mapped[str] = mapped_column(Text, nullable=False)
    definition_text: Mapped[str] = mapped_column(Text, nullable=False)
    node_id: Mapped[int] = mapped_column(ForeignKey("law_nodes.id", ondelete="CASCADE"))


class Process(Base):
    __tablename__ = "processes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("processes.id", ondelete="SET NULL"))
    code: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    name_ar: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    activities: Mapped[list["ProcessActivity"]] = relationship(back_populates="process", cascade="all, delete-orphan")


class ProcessActivity(Base):
    __tablename__ = "process_activities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id", ondelete="CASCADE"))
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    process: Mapped["Process"] = relationship(back_populates="activities")


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    process_id: Mapped[Optional[int]] = mapped_column(ForeignKey("processes.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    llm_provider: Mapped[Optional[str]] = mapped_column(String(64))
    llm_model: Mapped[Optional[str]] = mapped_column(String(128))
    config_snapshot: Mapped[Optional[dict]] = mapped_column(JSON)
    events: Mapped[list["AnalysisEvent"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    sections: Mapped[list["ReportSection"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    findings: Mapped[list["Finding"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class AnalysisEvent(Base):
    __tablename__ = "analysis_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    agent: Mapped[Optional[str]] = mapped_column(String(64))
    payload: Mapped[Optional[dict]] = mapped_column(JSON)
    analysis: Mapped["Analysis"] = relationship(back_populates="events")


class ReportSection(Base):
    __tablename__ = "report_sections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"))
    part_no: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    analysis: Mapped["Analysis"] = relationship(back_populates="sections")


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"))
    part_no: Mapped[int] = mapped_column(Integer, nullable=False)
    finding_key: Mapped[str] = mapped_column(String(32), nullable=False)
    kind: Mapped[Optional[str]] = mapped_column(String(32))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[Optional[list]] = mapped_column(JSON)
    analysis: Mapped["Analysis"] = relationship(back_populates="findings")
    feedback: Mapped[list["Feedback"]] = relationship(back_populates="finding", cascade="all, delete-orphan")


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    finding_id: Mapped[int] = mapped_column(ForeignKey("findings.id", ondelete="CASCADE"))
    user_id: Mapped[Optional[int]] = mapped_column(Integer)
    rating: Mapped[Optional[int]] = mapped_column(
        SmallInteger,
        CheckConstraint("rating IN (-1, 0, 1)", name="rating_check"),
    )
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolution: Mapped[Optional[str]] = mapped_column(Text)
    finding: Mapped["Finding"] = relationship(back_populates="feedback")


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
