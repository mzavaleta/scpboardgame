/**
 * Canonical serialisation and hashing.
 *
 * The hash is the determinism oracle: two games with the same seed and the same
 * ordered actions must produce the same hash, or the core bet (§3 of the
 * specification) is broken. It is also the cheapest form of regression test we
 * have — a golden replay is just a hash plus an action list.
 *
 * `stableStringify` sorts object keys so that a hash never depends on insertion
 * order, which would otherwise produce fake failures whenever a reducer
 * happened to build an object differently.
 */

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** FNV-1a, 32-bit, rendered as 8 lowercase hex characters. Not cryptographic. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function hashState(state: unknown): string {
  return fnv1a(stableStringify(state));
}
