"""
Seed script — generates 30 days of simulated half-hourly energy data
for 5 HDB blocks in Yishun, 10 households per block.

Run: python -m database.seed
"""

import random
import math
from datetime import datetime, timedelta, date
from database.clickhouse import get_client, init_schema

DISTRICT = "Yishun"
BLOCKS = ["BLK402", "BLK403", "BLK404", "BLK405", "BLK406"]

PROFILES = {
    "family":       {"base": 0.35, "peak_mult": 1.8, "morning_mult": 1.4},
    "young_adult":  {"base": 0.22, "peak_mult": 1.6, "morning_mult": 1.0},
    "elderly":      {"base": 0.28, "peak_mult": 1.3, "morning_mult": 1.5},
    "wfh":          {"base": 0.40, "peak_mult": 1.5, "morning_mult": 1.6},
}

# Block-level efficiency: lower = better performing block
BLOCK_EFFICIENCY = {
    "BLK402": 1.00,
    "BLK403": 0.94,
    "BLK404": 0.88,
    "BLK405": 1.06,
    "BLK406": 1.12,
}

HOUSEHOLDS_PER_BLOCK = 10
DAYS = 30
START_DATE = date.today() - timedelta(days=DAYS - 1)


def half_hourly_usage(profile: dict, block_efficiency: float, day_offset: int) -> list[float]:
    """Generate 48 half-hourly kWh values for a single day."""
    readings = []
    for slot in range(48):
        hour = slot / 2.0
        base = profile["base"] * block_efficiency

        # Morning peak 7–9am
        if 7 <= hour < 9:
            mult = profile["morning_mult"]
        # Evening peak 6–10pm
        elif 18 <= hour < 22:
            mult = profile["peak_mult"]
        # Night low
        elif 0 <= hour < 6:
            mult = 0.4
        else:
            mult = 1.0

        # Slight downward trend over days (behaviour change simulation)
        trend = 1.0 - (day_offset * 0.003)
        noise = random.gauss(1.0, 0.08)
        kwh = max(0.02, base * mult * trend * noise)
        readings.append(round(kwh, 4))

    return readings


def run():
    init_schema()
    client = get_client()

    rows = []
    profile_names = list(PROFILES.keys())

    for block_id in BLOCKS:
        eff = BLOCK_EFFICIENCY[block_id]
        for hh_num in range(HOUSEHOLDS_PER_BLOCK):
            household_id = f"{block_id}-HH{hh_num:02d}"
            profile_name = random.choice(profile_names)
            profile = PROFILES[profile_name]

            for day_offset in range(DAYS):
                current_date = START_DATE + timedelta(days=day_offset)
                readings = half_hourly_usage(profile, eff, day_offset)

                for slot, kwh in enumerate(readings):
                    ts = datetime(
                        current_date.year,
                        current_date.month,
                        current_date.day,
                        slot // 2,
                        (slot % 2) * 30,
                    )
                    rows.append([household_id, block_id, DISTRICT, ts, kwh, profile_name])

    # Insert in batches of 5000
    batch_size = 5000
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        client.insert(
            "energy_usage",
            batch,
            column_names=["household_id", "block_id", "district", "timestamp", "electricity_kwh", "household_profile"],
        )
        print(f"[Seed] Inserted rows {i}–{i + len(batch)}")

    total = DAYS * HOUSEHOLDS_PER_BLOCK * len(BLOCKS) * 48
    print(f"[Seed] Done. {total} rows inserted across {len(BLOCKS)} blocks.")


if __name__ == "__main__":
    run()
