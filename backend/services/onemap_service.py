"""
OneMap API service — geocode Singapore postal codes to lat/lng,
and resolve postal codes to HDB block numbers (BLK_NO).
API docs: https://www.onemap.gov.sg/apidocs/
"""

import httpx
from functools import lru_cache
from config import settings

ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search"

# In-memory cache so we don't re-fetch the same postal code within a process
_coord_cache: dict[str, tuple[float, float]] = {}
_block_no_cache: dict[str, str] = {}
_road_name_cache: dict[str, str] = {}


def _get_headers() -> dict:
    headers = {}
    if settings.onemap_api_key:
        headers["Authorization"] = settings.onemap_api_key
    return headers


def _search_postal(postal_code: str) -> dict | None:
    """
    Look up a Singapore postal code via OneMap Search API.
    Returns the first result dict or None.
    """
    try:
        resp = httpx.get(
            ONEMAP_SEARCH_URL,
            params={"searchVal": postal_code, "returnGeom": "Y", "getAddrDetails": "Y"},
            headers=_get_headers(),
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if results:
            return results[0]
    except Exception as e:
        print(f"[OneMap] Search failed for {postal_code}: {e}")
    return None


def geocode_postal(postal_code: str) -> tuple[float, float] | None:
    """
    Look up a Singapore postal code via OneMap Search API.
    Returns (latitude, longitude) or None if not found.
    """
    if postal_code in _coord_cache:
        return _coord_cache[postal_code]

    result = _search_postal(postal_code)
    if result:
        lat = float(result["LATITUDE"])
        lng = float(result["LONGITUDE"])
        _coord_cache[postal_code] = (lat, lng)
        # Also cache block number and road name if present
        blk = result.get("BLK_NO", "")
        if blk:
            _block_no_cache[postal_code] = blk
        road = result.get("ROAD_NAME", "")
        if road:
            _road_name_cache[postal_code] = road
        return (lat, lng)

    return None


def get_block_no(postal_code: str) -> str | None:
    """
    Look up the HDB block number (e.g. '339B') for a postal code.
    Returns the BLK_NO string or None if not found.
    """
    if postal_code in _block_no_cache:
        return _block_no_cache[postal_code]

    result = _search_postal(postal_code)
    if result:
        blk = result.get("BLK_NO", "")
        if blk:
            _block_no_cache[postal_code] = blk
        # Also cache coords and road name
        try:
            lat = float(result["LATITUDE"])
            lng = float(result["LONGITUDE"])
            _coord_cache[postal_code] = (lat, lng)
        except (KeyError, ValueError):
            pass
        road = result.get("ROAD_NAME", "")
        if road:
            _road_name_cache[postal_code] = road
        return blk or None

    return None


def get_road_name(postal_code: str) -> str | None:
    """
    Look up the road name for a postal code via OneMap.
    Returns the ROAD_NAME string or None if not found.
    """
    if postal_code in _road_name_cache:
        return _road_name_cache[postal_code]

    result = _search_postal(postal_code)
    if result:
        road = result.get("ROAD_NAME", "")
        if road:
            _road_name_cache[postal_code] = road
        # Also cache block number and coords
        blk = result.get("BLK_NO", "")
        if blk:
            _block_no_cache[postal_code] = blk
        try:
            lat = float(result["LATITUDE"])
            lng = float(result["LONGITUDE"])
            _coord_cache[postal_code] = (lat, lng)
        except (KeyError, ValueError):
            pass
        return road or None

    return None


def get_road_names_batch(postal_codes: list[str]) -> dict[str, str]:
    """
    Resolve multiple postal codes to road names.
    Returns a dict of postal_code -> road_name.
    """
    result = {}
    for pc in postal_codes:
        road = get_road_name(pc)
        if road:
            result[pc] = road
    return result


def get_block_no_batch(postal_codes: list[str]) -> dict[str, str]:
    """
    Resolve multiple postal codes to block numbers.
    Returns a dict of postal_code -> block_no (e.g. {"752339": "339B"}).
    """
    result = {}
    for pc in postal_codes:
        blk = get_block_no(pc)
        if blk:
            result[pc] = blk
    return result
