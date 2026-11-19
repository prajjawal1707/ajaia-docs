from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Document, DocumentShare, User

def access_for(db: Session, doc: Document, user: User) -> str | None:
    if doc.owner_id == user.id:
        return "owner"
    share = db.scalar(select(DocumentShare).where(
        DocumentShare.document_id == doc.id,
        DocumentShare.user_id == user.id,
    ))
    return share.permission if share else None

def require_access(db: Session, doc: Document, user: User, minimum: str = "viewer") -> str:
    permission = access_for(db, doc, user)
    if permission is None:
        raise HTTPException(status_code=404, detail="Document not found")
    ranks = {"viewer": 1, "editor": 2, "owner": 3}
    if ranks[permission] < ranks[minimum]:
        raise HTTPException(status_code=403, detail="You do not have permission to perform this action")
    return permission
