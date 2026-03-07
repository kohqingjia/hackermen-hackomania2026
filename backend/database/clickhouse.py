"""
ClickHouse client and schema setup.
Tables (from SP data):
  - household_data                (per-household static profile)
  - household_user_input          (user-submitted preferences)
  - household_electricity_usage   (half-hourly consumption readings)
App-specific tables:
  - user_challenges   (completed challenges)
  - user_points       (weekly points per postal code)
"""

import clickhouse_connect
from config import settings

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client

    _client = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_database,
        secure=settings.clickhouse_secure,
        connect_timeout=30,
    )
    _client.command("SELECT 1")
    print(f"[DB] Connected to ClickHouse at {settings.clickhouse_host}:{settings.clickhouse_port} (secure={settings.clickhouse_secure})")

    return _client


CREATE_DATABASE_SQL = f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS household_data (
    UserID          String,
    HouseholdID     String,
    Area            String,
    Region          String,
    District        String,
    Postal_Code     String,
    Dwelling_type   String DEFAULT 'HDB',
    Flat_type       String
) ENGINE = MergeTree()
ORDER BY (UserID, HouseholdID);

CREATE TABLE IF NOT EXISTS household_user_input (
    UserID          String,
    HouseholdID     String,
    Floor_area_sqm  Float32 DEFAULT 0,
    Num_residents   UInt8 DEFAULT 0,
    Num_children    UInt8 DEFAULT 0,
    Num_elderly     UInt8 DEFAULT 0,
    Num_tenants     UInt8 DEFAULT 0,
    Aircon_usage    UInt8 DEFAULT 0,
    Num_Aircons     UInt8 DEFAULT 0,
    Has_WFH_days    String DEFAULT '[]',
    Num_WFH         UInt8 DEFAULT 0
) ENGINE = MergeTree()
ORDER BY (UserID, HouseholdID);

CREATE TABLE IF NOT EXISTS household_electricity_usage (
    HouseholdID     String,
    Timestamp       DateTime,
    Consumption     Float32
) ENGINE = MergeTree()
ORDER BY (HouseholdID, Timestamp);

CREATE TABLE IF NOT EXISTS user_challenges (
    user_id        String,
    challenge_id   String,
    completed_at   DateTime DEFAULT now(),
    photo_url      String DEFAULT '',
    points_earned  Int32
) ENGINE = MergeTree()
ORDER BY (user_id, completed_at);

CREATE TABLE IF NOT EXISTS user_points (
    user_id      String,
    postal_code  String,
    points       Int32,
    week_start   Date
) ENGINE = MergeTree()
ORDER BY (postal_code, week_start, user_id);
"""


def init_schema():
    """Create database and tables if they don't exist."""
    # First create the database using a temporary client connected to 'default'
    try:
        tmp = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            secure=settings.clickhouse_secure,
            connect_timeout=30,
        )
        tmp.command(CREATE_DATABASE_SQL)
        print(f"[ClickHouse] Database '{settings.clickhouse_database}' ensured.")
    except Exception as e:
        print(f"[ClickHouse] Warning creating database: {e}")

    client = get_client()
    for statement in SCHEMA_SQL.strip().split(";"):
        stmt = statement.strip()
        if stmt:
            client.command(stmt)
    print("[ClickHouse] Schema initialised.")
