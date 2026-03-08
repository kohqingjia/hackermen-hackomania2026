from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "blockbattles"
    clickhouse_secure: bool = True
    
    # Default user ID for all endpoints (useful for single-user demos/testing)
    # If set, endpoints will use this instead of requiring user_id parameter
    user_id: str = ""

    # Required to begin app usage when USER_ID is not set
    household_id: str = ""
    
    # App "current date" — useful when database only contains historical data
    # Format: YYYY-MM-DD (e.g., "2025-12-31")
    # Leave empty to use system date.today()
    current_app_date: str = "2025-12-31"

    # OneMap API key for geocoding postal codes
    onemap_api_key: str = ""

    class Config:
        env_file = ".env"


# ── Shared constants ────────────────────────────────────────────────────────
# SP Group electricity tariff (SGD per kWh) — single source of truth
SP_TARIFF = 0.3168

settings = Settings()
