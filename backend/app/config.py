from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    GROQ_API_KEY: str = "gsk_placeholder"
    DATABASE_URL: str = "sqlite:///./hcp_crm.db"
    SECRET_KEY: str = "supersecretkey"
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"

settings = Settings()
