"""
MockClient — drop-in replacement for clickhouse_connect client.
Implements the same .query() / .insert() / .command() interface used by all routes.
"""

from __future__ import annotations
from datetime import date, datetime, timedelta

import mock_data as md


class MockQueryResult:
    def __init__(self, rows: list[tuple], columns: list[str]):
        self.result_rows = rows
        self.column_names = columns


def _resolve_date(params: dict, key: str) -> str | None:
    val = params.get(key)
    if val is None:
        return None
    if isinstance(val, date):
        return val.isoformat()
    return str(val)


def _date_range(start_str: str, end_str: str) -> list[str]:
    s = date.fromisoformat(start_str)
    e = date.fromisoformat(end_str)
    out, cur = [], s
    while cur <= e:
        out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out


def _get_user(user_id: str) -> dict | None:
    for u in md.DEMO_USERS:
        if u["user_id"] == user_id:
            return u
    return md.RUNTIME_USERS.get(user_id)


class MockClient:

    def query(self, sql: str, parameters: dict | None = None) -> MockQueryResult:
        p = parameters or {}
        s = sql.lower()
        if "from users" in s:
            return self._query_users(sql, p)
        if "from energy_usage" in s:
            return self._query_energy(s, p)
        if "from user_challenges" in s:
            return self._query_user_challenges(s, p)
        return MockQueryResult([], [])

    def insert(self, table: str, rows: list[list], column_names: list[str]):
        if table == "users":
            for row in rows:
                record = dict(zip(column_names, row))
                md.RUNTIME_USERS[record["user_id"]] = record
        elif table == "user_challenges":
            for row in rows:
                md.USER_CHALLENGES.append(dict(zip(column_names, row)))

    def command(self, sql: str):
        pass

    # ── users ──────────────────────────────────────────────────────────────────

    def _query_users(self, sql: str, p: dict) -> MockQueryResult:
        uid = p.get("uid", "")
        user = _get_user(uid)
        if not user:
            return MockQueryResult([], [])
        s = sql.lower()
        if "select *" in s:
            cols = ["user_id", "block_id", "district", "age_group",
                    "household_type", "num_tenants", "work_from_home",
                    "energy_saving_target", "created_at"]
            return MockQueryResult([tuple(user[c] for c in cols)], cols)
        if "energy_saving_target" in s:
            cols = ["block_id", "household_type", "age_group",
                    "energy_saving_target", "work_from_home"]
            return MockQueryResult([tuple(user[c] for c in cols)], cols)
        return MockQueryResult([(user["block_id"],)], ["block_id"])

    # ── energy_usage ───────────────────────────────────────────────────────────

    def _query_energy(self, s: str, p: dict) -> MockQueryResult:
        hid  = p.get("hid")
        bid  = p.get("bid")
        dist = p.get("dist")

        is_between   = "between" in s
        is_group_ts  = "group by timestamp" in s
        is_group_blk = "group by block_id" in s
        is_sum       = "sum(" in s
        is_avg       = "avg(" in s
        is_peak      = "order by electricity_kwh desc" in s

        # household-scoped
        if hid:
            if is_between:
                rows = self._hh_range(hid, p.get("s") or p.get("ws"), p.get("e") or p.get("we"))
            else:
                rows = self._hh_day(hid, _resolve_date(p, "d"))

            if not rows:
                return MockQueryResult([(0,)], ["result"]) if (is_sum or is_avg) else MockQueryResult([], [])

            if is_peak:
                peak = max(rows, key=lambda r: r[1])
                return MockQueryResult([(peak[0],)], ["timestamp"])
            if is_sum:
                return MockQueryResult([(round(sum(r[1] for r in rows), 4),)], ["sum"])
            if is_avg and not is_group_ts:
                avg = sum(r[1] for r in rows) / len(rows)
                return MockQueryResult([(round(avg, 4),)], ["avg"])
            return MockQueryResult([(r[0], r[1]) for r in rows], ["timestamp", "electricity_kwh"])

        # block-scoped
        if bid:
            d_str = md.closest_date(_resolve_date(p, "d") or date.today().isoformat())
            if is_group_ts:
                slot_data = md.USAGE_BLOCK_SLOT.get(bid, {}).get(d_str, [])
                return MockQueryResult([(ts, avg) for ts, avg in slot_data],
                                       ["timestamp", "avg_kwh"])
            if is_avg:
                daily = md.USAGE_BLOCK_DAILY.get(bid, {}).get(d_str, 0.0)
                return MockQueryResult([(round(daily * 48, 3),)], ["avg_kwh"])

        # district-scoped
        if dist and is_group_blk:
            if is_between:
                ws = _resolve_date(p, "ws")
                we = _resolve_date(p, "we")
                dates = _date_range(ws, we) if ws and we else [date.today().isoformat()]
            elif "min(todate" in s:
                dates = [md.START_DATE.isoformat()]
            else:
                d_str = md.closest_date(_resolve_date(p, "d") or date.today().isoformat())
                dates = [d_str]
            return self._block_avg_over_dates(dates)

        return MockQueryResult([], [])

    def _hh_day(self, hid: str, date_str: str | None) -> list[tuple]:
        d = md.closest_date(date_str or date.today().isoformat())
        return md.USAGE_HH.get(hid, {}).get(d, [])

    def _hh_range(self, hid: str, start: str | None, end: str | None) -> list[tuple]:
        if not start or not end:
            return []
        all_rows = []
        for d in _date_range(md.closest_date(start), md.closest_date(end)):
            all_rows.extend(md.USAGE_HH.get(hid, {}).get(d, []))
        return all_rows

    def _block_avg_over_dates(self, dates: list[str]) -> MockQueryResult:
        block_totals: dict[str, list[float]] = {b: [] for b in md.BLOCKS}
        for d in dates:
            d = md.closest_date(d)
            for block_id in md.BLOCKS:
                val = md.USAGE_BLOCK_DAILY.get(block_id, {}).get(d)
                if val is not None:
                    block_totals[block_id].append(val * 48)
        result = []
        for block_id, vals in block_totals.items():
            if vals:
                result.append((block_id, round(sum(vals) / len(vals), 3)))
        result.sort(key=lambda x: x[1])
        return MockQueryResult(result, ["block_id", "daily_avg_kwh"])

    # ── user_challenges ────────────────────────────────────────────────────────

    def _query_user_challenges(self, s: str, p: dict) -> MockQueryResult:
        uid = p.get("uid", "")
        cid = p.get("cid")
        user_rows = [c for c in md.USER_CHALLENGES if c.get("user_id") == uid]
        if cid:
            match = [r for r in user_rows if r.get("challenge_id") == cid]
            return MockQueryResult([(1,)] if match else [], ["1"])
        if "sum(" in s:
            total = sum(r.get("points_earned", 0) for r in user_rows)
            return MockQueryResult([(total,)], ["sum"])
        rows = [(r["challenge_id"], r.get("completed_at", datetime.utcnow()),
                 r.get("points_earned", 0)) for r in user_rows]
        return MockQueryResult(rows, ["challenge_id", "completed_at", "points_earned"])
