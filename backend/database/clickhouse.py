"""
ClickHouse client and schema setup.
Tables (electricity consumption data):
  - consumption_per_household          (half-hourly consumption readings)
  - consumption_per_household_daily    (daily aggregated consumption)
  - consumption_per_household_monthly  (monthly aggregated consumption)
  - consumption_per_household_weekly   (weekly aggregated consumption)
Tables (household metadata):
  - details_per_household     (static household profile)
  - input_per_household       (user-submitted preferences)
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
        autogenerate_session_id=False,
    )
    _client.command("SELECT 1")
    print(f"[DB] Connected to ClickHouse at {settings.clickhouse_host}:{settings.clickhouse_port} (secure={settings.clickhouse_secure})")

    return _client


CREATE_DATABASE_SQL = f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS consumption_per_household (
    HouseholdID     String,
    Timestamp       DateTime,
    Consumption     Float32
) ENGINE = MergeTree()
ORDER BY (HouseholdID, Timestamp);

CREATE TABLE IF NOT EXISTS consumption_per_household_daily (
    HouseholdID     String,
    Day             Date,
    Consumption     Float32
) ENGINE = MergeTree()
ORDER BY (HouseholdID, Day);

CREATE TABLE IF NOT EXISTS consumption_per_household_monthly (
    HouseholdID     String,
    MonthStart      Date,
    Consumption     Float32
) ENGINE = MergeTree()
ORDER BY (HouseholdID, MonthStart);

CREATE TABLE IF NOT EXISTS consumption_per_household_weekly (
    HouseholdID     String,
    WeekStart       Date,
    Consumption     Float32
) ENGINE = MergeTree()
ORDER BY (HouseholdID, WeekStart);

CREATE TABLE IF NOT EXISTS details_per_household (
    UserID          String,
    HouseholdID     String,
    Area            String,
    Region          String,
    District        String,
    PostalCode      String,
    Dwelling_type   String DEFAULT 'HDB',
    Flat_type       String
) ENGINE = MergeTree()
ORDER BY (UserID, HouseholdID);

CREATE TABLE IF NOT EXISTS input_per_household (
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
            autogenerate_session_id=False,
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
