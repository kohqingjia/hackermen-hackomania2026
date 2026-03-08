/**
 * Module-level cache for postal code → HDB block number mapping.
 *
 * The mapping is populated once from the first API response that includes
 * a `block_no_map` (e.g. from /api/map or /api/leaderboard).
 * After that, `blockLabel()` returns the block number for any postal code,
 * or falls back to the postal code itself.
 *
 * Because this is module-level state, it survives React component
 * mount/unmount and tab switches. It only resets on a full page reload
 * or build restart.
 */

const _cache: Record<string, string> = {};

/**
 * Merge a postal_code→block_no mapping into the cache.
 * Call this whenever an API response contains `block_no_map`.
 */
export function mergeBlockNames(map: Record<string, string> | undefined | null): void {
  if (!map) return;
  Object.assign(_cache, map);
}

/**
 * Get the display label for a postal code.
 * Returns the HDB block number (e.g. "339B") if known, otherwise the postal code.
 */
export function blockLabel(postalCode: string): string {
  return _cache[postalCode] ?? postalCode;
}
