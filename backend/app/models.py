from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    documents: Mapped[list["Document"]] = relationship(back_populates="owner")

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Untitled document")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    owner: Mapped[User] = relationship(back_populates="documents")
    shares: Mapped[list["DocumentShare"]] = relationship(back_populates="document", cascade="all, delete-orphan")

class DocumentShare(Base):
    __tablename__ = "document_shares"
    __table_args__ = (UniqueConstraint("document_id", "user_id", name="uq_document_user_share"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    permission: Mapped[str] = mapped_column(String(10), nullable=False)
    document: Mapped[Document] = relationship(back_populates="shares")
    user: Mapped[User] = relationship()
