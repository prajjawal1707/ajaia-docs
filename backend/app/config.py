import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./ajaia.db")
    secret_key: str = os.getenv("SECRET_KEY", "local-dev-only-change-me")
    frontend_origins: str = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://192.168.31.113:5173"
)

settings = Settings()
