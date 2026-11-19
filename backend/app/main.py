import json
from uuid import uuid4
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, or_
from sqlalchemy.orm import Session, joinedload
from .config import settings
from .database import Base, engine, get_db
from .models import User, Document, DocumentShare, utcnow
from .schemas import DemoLoginIn, LoginOut, UserOut, DocumentCreate, DocumentPatch, DocumentOut, ShareCreate, ShareOut
from .auth import make_token, get_current_user
from .permissions import access_for, require_access

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Ajaia Docs API", version="1.0.0")
origins = [x.strip() for x in settings.frontend_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

SEED_USERS = [
    ("alex-seed", "Alex Morgan", "alex@ajaia.demo"),
    ("sam-seed", "Sam Rivera", "sam@ajaia.demo"),
    ("jordan-seed", "Jordan Lee", "jordan@ajaia.demo"),
]

def seed_users(db: Session):
    for uid, name, email in SEED_USERS:
        if not db.scalar(select(User).where(User.email == email)):
            db.add(User(id=uid, name=name, email=email))
    db.commit()

with next(get_db()) as _db:
    seed_users(_db)

def to_out(db: Session, doc: Document, user: User) -> dict:
    permission = access_for(db, doc, user)
    return {
        "id": doc.id, "title": doc.title, "content": json.loads(doc.content),
        "owner_id": doc.owner_id, "owner_name": doc.owner.name,
        "permission": permission, "created_at": doc.created_at, "updated_at": doc.updated_at,
    }

def get_doc(db: Session, doc_id: str) -> Document:
    doc = db.scalar(select(Document).options(joinedload(Document.owner)).where(Document.id == doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ajaia-docs-api"}

@app.post("/api/auth/demo-login", response_model=LoginOut)
def demo_login(payload: DemoLoginIn, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=404, detail="Unknown demo account. Try alex@ajaia.demo or sam@ajaia.demo.")
    return {"access_token": make_token(user.id), "user": user}

@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

@app.get("/api/documents", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    shared_ids = select(DocumentShare.document_id).where(DocumentShare.user_id == user.id)
    docs = db.scalars(
        select(Document).options(joinedload(Document.owner))
        .where(or_(Document.owner_id == user.id, Document.id.in_(shared_ids)))
        .order_by(Document.updated_at.desc())
    ).unique().all()
    return [to_out(db, d, user) for d in docs]

@app.post("/api/documents", response_model=DocumentOut, status_code=201)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = Document(id=str(uuid4()), title=payload.title.strip(), content=json.dumps(payload.content), owner_id=user.id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return to_out(db, get_doc(db, doc.id), user)

@app.get("/api/documents/{doc_id}", response_model=DocumentOut)
def read_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = get_doc(db, doc_id)
    require_access(db, doc, user, "viewer")
    return to_out(db, doc, user)

@app.patch("/api/documents/{doc_id}", response_model=DocumentOut)
def update_document(doc_id: str, payload: DocumentPatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = get_doc(db, doc_id)
    require_access(db, doc, user, "editor")
    if payload.title is not None:
        doc.title = payload.title.strip()
    if payload.content is not None:
        doc.content = json.dumps(payload.content)
    doc.updated_at = utcnow()
    db.commit()
    return to_out(db, get_doc(db, doc.id), user)

@app.delete("/api/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = get_doc(db, doc_id)
    require_access(db, doc, user, "owner")
    db.delete(doc)
    db.commit()
    return None

@app.get("/api/documents/{doc_id}/permissions", response_model=list[ShareOut])
def list_permissions(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = get_doc(db, doc_id)
    require_access(db, doc, user, "owner")
    shares = db.scalars(select(DocumentShare).options(joinedload(DocumentShare.user)).where(DocumentShare.document_id == doc_id)).all()
    return [{"user_id": s.user.id, "user_name": s.user.name, "email": s.user.email, "permission": s.permission} for s in shares]

@app.post("/api/documents/{doc_id}/share", response_model=ShareOut)
def grant_permission(doc_id: str, payload: ShareCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = get_doc(db, doc_id)
    require_access(db, doc, user, "owner")
    target = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if not target:
        raise HTTPException(status_code=404, detail="User not found. Use a seeded demo account.")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="You already own this document")
    share = db.scalar(select(DocumentShare).where(DocumentShare.document_id == doc_id, DocumentShare.user_id == target.id))
    if share:
        share.permission = payload.permission
    else:
        share = DocumentShare(id=str(uuid4()), document_id=doc_id, user_id=target.id, permission=payload.permission)
        db.add(share)
    db.commit()
    return {"user_id": target.id, "user_name": target.name, "email": target.email, "permission": share.permission}

@app.delete("/api/documents/{doc_id}/permissions/{user_id}", status_code=204)
def revoke_permission(doc_id: str, user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = get_doc(db, doc_id)
    require_access(db, doc, user, "owner")
    share = db.scalar(select(DocumentShare).where(DocumentShare.document_id == doc_id, DocumentShare.user_id == user_id))
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    db.delete(share)
    db.commit()
    return None

@app.post("/api/upload", response_model=DocumentOut, status_code=201)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    filename = file.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in {".txt", ".md"}:
        raise HTTPException(status_code=400, detail="Only .txt and .md files are supported")
    raw = await file.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File must be smaller than 2 MB")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")
    # Import plain text as paragraphs. Markdown syntax is retained as text, avoiding unsafe HTML rendering.
    paragraphs = [{"type": "paragraph", "content": [{"type": "text", "text": line}]} if line else {"type": "paragraph"} for line in text.splitlines()]
    content = {"type": "doc", "content": paragraphs or [{"type": "paragraph"}]}
    title = Path(filename).stem[:200] or "Imported document"
    doc = Document(id=str(uuid4()), title=title, content=json.dumps(content), owner_id=user.id)
    db.add(doc)
    db.commit()
    return to_out(db, get_doc(db, doc.id), user)
