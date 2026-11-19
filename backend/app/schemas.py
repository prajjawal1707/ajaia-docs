from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

class DemoLoginIn(BaseModel):
    email: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    model_config = ConfigDict(from_attributes=True)

class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class DocumentCreate(BaseModel):
    title: str = Field(default="Untitled document", min_length=1, max_length=200)
    content: dict[str, Any]

class DocumentPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: dict[str, Any] | None = None

class DocumentOut(BaseModel):
    id: str
    title: str
    content: dict[str, Any]
    owner_id: str
    owner_name: str
    permission: str
    created_at: datetime
    updated_at: datetime

class ShareCreate(BaseModel):
    email: str
    permission: Literal["viewer", "editor"] = "editor"

class ShareOut(BaseModel):
    user_id: str
    user_name: str
    email: str
    permission: str
