from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "powerblock"
    use_mock_data: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
