/**
 * Counter-based, seed-addressable PRNG (§S1, property 1 of the core bet).
 *
 * The die value is a pure function of `(seed, cursor)`; rolling advances the
 * cursor. There is no mutable generator object, no internal stream, and nothing
 * to serialise beyond two numbers — so `seed + actions` reproduces a game
 * exactly, on any machine, forever.
 *
 * Algorithm: splitmix32 over `seed ^ (cursor * GOLDEN)`. It is small, fast,
 * has no warm-up, and produces good enough output for a board game. Do not
 * replace it with `Math.random()` under any circumstance.
 */

import type { RngState } from "./types";

const GOLDEN = 0x9e3779b9;

function mix32(x: number): number {
  let z = (x + GOLDEN) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}

/** The raw 32-bit word for the current cursor. Exposed for tests and hashing. */
export function peekWord(state: RngState): number {
  return mix32((state.seed ^ Math.imul(state.cursor + 1, GOLDEN)) >>> 0);
}

/** A float in [0, 1), plus the advanced state. Advances the cursor by exactly 1. */
export function nextFloat(state: RngState): readonly [value: number, next: RngState] {
  return [peekWord(state) / 0x1_0000_0000, { seed: state.seed, cursor: state.cursor + 1 }] as const;
}

/**
 * A uniform integer in `[min, max]`, inclusive, plus the advanced state.
 * Modulo bias over these ranges is far below anything a player could notice.
 */
export function nextInt(
  state: RngState,
  min: number,
  max: number,
): readonly [value: number, next: RngState] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`nextInt: invalid range ${min}..${max}`);
  }
  const span = max - min + 1;
  const [f, next] = nextFloat(state);
  return [min + Math.floor(f * span), next] as const;
}

/** `1d6` — movement only (§D5). */
export function rollD6(state: RngState): readonly [value: number, next: RngState] {
  return nextInt(state, 1, 6);
}

/**
 * `4dF` — tests only (§D5): four dice of `-1 | 0 | +1`, summed. Consumes four
 * cursor positions, so the distribution is built from four independent draws
 * and the "cursor strictly increases per draw" invariant stays meaningful.
 */
export function roll4dF(state: RngState): readonly [value: number, next: RngState] {
  let total = 0;
  let cursor = state;
  for (let die = 0; die < 4; die += 1) {
    const [value, next] = nextInt(cursor, -1, 1);
    total += value;
    cursor = next;
  }
  return [total, cursor] as const;
}
