"""
ClickHouse client and schema setup.
Tables:
  - users             (onboarding profiles)
  - energy_usage      (half-hourly readings per household)
  - user_challenges   (completed challenges)
  - user_points       (weekly points per block)
"""

import clickhouse_connect
from config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        _client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database=settings.clickhouse_database,
        )
    return _client


CREATE_DATABASE_SQL = f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    user_id       String,
    block_id      String,
    district      String,
    age_group     String,
    household_type String,
    num_tenants   UInt8,
    work_from_home UInt8,
    energy_saving_target Float32,
    created_at    DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY user_id;

CREATE TABLE IF NOT EXISTS energy_usage (
    household_id  String,
    block_id      String,
    district      String,
    timestamp     DateTime,
    electricity_kwh Float32,
    household_profile String
) ENGINE = MergeTree()
ORDER BY (block_id, timestamp);

CREATE TABLE IF NOT EXISTS user_challenges (
    user_id        String,
    challenge_id   String,
    completed_at   DateTime DEFAULT now(),
    photo_url      String DEFAULT '',
    points_earned  Int32
) ENGINE = MergeTree()
ORDER BY (user_id, completed_at);

CREATE TABLE IF NOT EXISTS user_points (
    user_id    String,
    block_id   String,
    points     Int32,
    week_start Date
) ENGINE = MergeTree()
ORDER BY (block_id, week_start, user_id);
"""


def init_schema():
    """Create database and tables if they don't exist."""
    client = get_client()
    for statement in SCHEMA_SQL.strip().split(";"):
        stmt = statement.strip()
        if stmt:
            client.command(stmt)
    print("[ClickHouse] Schema initialised.")
