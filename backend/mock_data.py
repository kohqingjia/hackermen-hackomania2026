"""
Mock data for PowerBlock — used when ClickHouse is unavailable.
Generated once at import, stored in indexed dicts for fast O(1) lookups.

Key exports:
    DEMO_USERS           — list of pre-built user profiles
    USAGE_HH             — {household_id: {date_str: [(timestamp, kwh), ...]}}
    USAGE_BLOCK_SLOT     — {block_id: {date_str: [(timestamp, avg_kwh), ...]}}
    USAGE_BLOCK_DAILY    — {block_id: {date_str: avg_kwh_per_slot}}
    USER_CHALLENGES      — in-memory list, mutated by mock insert()
"""

import random
from datetime import date, datetime, timedelta

# ── Constants ──────────────────────────────────────────────────────────────────

DISTRICT = "Yishun"
BLOCKS = ["BLK402", "BLK403", "BLK404", "BLK405", "BLK406"]
HOUSEHOLDS_PER_BLOCK = 10
DAYS = 30

START_DATE: date = date.today() - timedelta(days=DAYS - 1)

PROFILES = {
    "family":      {"base": 0.35, "peak_mult": 1.8, "morning_mult": 1.4},
    "young_adult": {"base": 0.22, "peak_mult": 1.6, "morning_mult": 1.0},
    "elderly":     {"base": 0.28, "peak_mult": 1.3, "morning_mult": 1.5},
    "wfh":         {"base": 0.40, "peak_mult": 1.5, "morning_mult": 1.6},
}

BLOCK_EFFICIENCY = {
    "BLK402": 1.00,
    "BLK403": 0.94,
    "BLK404": 0.88,
    "BLK405": 1.06,
    "BLK406": 1.12,
}

PROFILE_CYCLE = ["family", "wfh", "young_adult", "elderly",
                 "family", "young_adult", "wfh", "elderly", "family", "wfh"]

# ── Demo users ─────────────────────────────────────────────────────────────────
# IDs chosen so that int(user_id.replace("-","")[:4], 16) % 10 gives valid HH:
#   "aaaa" → 43690 % 10 = 0  → BLK404-HH00
#   "bbbb" → 48059 % 10 = 9  → BLK402-HH09
#   "cccc" → 52428 % 10 = 8  → BLK406-HH08

DEMO_USERS: list[dict] = [
    {
        "user_id":              "aaaa0001-0000-0000-0000-000000000000",
        "block_id":             "BLK404",
        "district":             DISTRICT,
        "age_group":            "31-45",
        "household_type":       "4-room",
        "num_tenants":          4,
        "work_from_home":       0,
        "energy_saving_target": 10.0,
        "created_at":           datetime(2025, 3, 1, 10, 0, 0),
    },
    {
        "user_id":              "bbbb0002-0000-0000-0000-000000000000",
        "block_id":             "BLK402",
        "district":             DISTRICT,
        "age_group":            "46-60",
        "household_type":       "5-room",
        "num_tenants":          2,
        "work_from_home":       0,
        "energy_saving_target": 15.0,
        "created_at":           datetime(2025, 3, 1, 10, 5, 0),
    },
    {
        "user_id":              "cccc0003-0000-0000-0000-000000000000",
        "block_id":             "BLK406",
        "district":             DISTRICT,
        "age_group":            "18-30",
        "household_type":       "3-room",
        "num_tenants":          2,
        "work_from_home":       1,
        "energy_saving_target": 20.0,
        "created_at":           datetime(2025, 3, 1, 10, 10, 0),
    },
]

# ── Usage generation ───────────────────────────────────────────────────────────

def _kwh(profile: dict, block_eff: float, day_offset: int, slot: int) -> float:
    hour = slot / 2.0
    if 7 <= hour < 9:
        mult = profile["morning_mult"]
    elif 18 <= hour < 22:
        mult = profile["peak_mult"]
    elif 0 <= hour < 6:
        mult = 0.4
    else:
        mult = 1.0
    trend = 1.0 - (day_offset * 0.003)
    noise = 1.0 + (random.random() - 0.5) * 0.16
    return max(0.02, round(profile["base"] * block_eff * mult * trend * noise, 4))


def _build_usage_indices():
    hh_index: dict[str, dict[str, list]] = {}
    block_slot_acc: dict[tuple, list] = {}

    for block_id in BLOCKS:
        eff = BLOCK_EFFICIENCY[block_id]
        for hh_num in range(HOUSEHOLDS_PER_BLOCK):
            hh_id = f"{block_id}-HH{hh_num:02d}"
            profile = PROFILES[PROFILE_CYCLE[hh_num]]
            random.seed(hash(hh_id) % (2 ** 31))

            hh_index.setdefault(hh_id, {})

            for day_offset in range(DAYS):
                cur_date = START_DATE + timedelta(days=day_offset)
                date_str = cur_date.isoformat()
                slots = []

                for slot in range(48):
                    kwh = _kwh(profile, eff, day_offset, slot)
                    ts = datetime(cur_date.year, cur_date.month, cur_date.day,
                                  slot // 2, (slot % 2) * 30)
                    slots.append((ts, kwh))
                    key = (block_id, date_str, slot)
                    block_slot_acc.setdefault(key, []).append(kwh)

                hh_index[hh_id][date_str] = slots

    block_slot: dict[str, dict[str, list]] = {}
    block_daily: dict[str, dict[str, float]] = {}

    for block_id in BLOCKS:
        block_slot.setdefault(block_id, {})
        block_daily.setdefault(block_id, {})
        for day_offset in range(DAYS):
            cur_date = START_DATE + timedelta(days=day_offset)
            date_str = cur_date.isoformat()
            slots_avg = []
            for slot in range(48):
                vals = block_slot_acc.get((block_id, date_str, slot), [0])
                avg = sum(vals) / len(vals)
                ts = datetime(cur_date.year, cur_date.month, cur_date.day,
                              slot // 2, (slot % 2) * 30)
                slots_avg.append((ts, round(avg, 4)))
            block_slot[block_id][date_str] = slots_avg
            block_daily[block_id][date_str] = round(
                sum(v for _, v in slots_avg) / 48, 4
            )

    return hh_index, block_slot, block_daily


print("[MockData] Generating usage data...", flush=True)
USAGE_HH, USAGE_BLOCK_SLOT, USAGE_BLOCK_DAILY = _build_usage_indices()
print(f"[MockData] Ready — {DAYS} days across {len(BLOCKS)} blocks.", flush=True)

# ── Mutable runtime stores ─────────────────────────────────────────────────────

RUNTIME_USERS: dict[str, dict] = {}
USER_CHALLENGES: list[dict] = []


def closest_date(date_str: str) -> str:
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        return date.today().isoformat()
    end_date = START_DATE + timedelta(days=DAYS - 1)
    d = max(START_DATE, min(d, end_date))
    return d.isoformat()
