from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/insight_console"

    # API Keys
    anthropic_api_key: str = ""

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Environment
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

settings = Settings()
