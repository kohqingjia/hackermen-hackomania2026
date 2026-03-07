"""
OneMap API service — geocode Singapore postal codes to lat/lng.
API docs: https://www.onemap.gov.sg/apidocs/
"""

import httpx
from functools import lru_cache
from config import settings

ONEMAP_SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search"

# In-memory cache so we don't re-fetch the same postal code within a process
_coord_cache: dict[str, tuple[float, float]] = {}


def _get_headers() -> dict:
    headers = {}
    if settings.onemap_api_key:
        headers["Authorization"] = settings.onemap_api_key
    return headers


def geocode_postal(postal_code: str) -> tuple[float, float] | None:
    """
    Look up a Singapore postal code via OneMap Search API.
    Returns (latitude, longitude) or None if not found.
    """
    if postal_code in _coord_cache:
        return _coord_cache[postal_code]

    try:
        resp = httpx.get(
            ONEMAP_SEARCH_URL,
            params={"searchVal": postal_code, "returnGeom": "Y", "getAddrDetails": "N"},
            headers=_get_headers(),
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()

        results = data.get("results", [])
        if results:
            lat = float(results[0]["LATITUDE"])
            lng = float(results[0]["LONGITUDE"])
            _coord_cache[postal_code] = (lat, lng)
            return (lat, lng)
    except Exception as e:
        print(f"[OneMap] Geocode failed for {postal_code}: {e}")

    return None


def geocode_batch(postal_codes: list[str]) -> dict[str, tuple[float, float]]:
    """
    Geocode multiple postal codes. Returns a dict of postal_code -> (lat, lng).
    Missing codes are omitted from the result.
    """
    result = {}
    for pc in postal_codes:
        coords = geocode_postal(pc)
        if coords:
            result[pc] = coords
    return result
