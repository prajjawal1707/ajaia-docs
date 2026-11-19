from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import User

serializer = URLSafeTimedSerializer(settings.secret_key, salt="ajaia-auth")

def make_token(user_id: str) -> str:
    return serializer.dumps({"sub": user_id})

def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = serializer.loads(token, max_age=60 * 60 * 24 * 7)
    except (BadSignature, SignatureExpired):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user
