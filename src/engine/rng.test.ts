/**
 * PRNG guarantees.
 *
 * These are not "nice to have" tests. The whole architecture rests on random
 * values being a pure function of `(seed, cursor)`, and on the 4dF and 1d6
 * distributions being the ones the design assumed when difficulty bands and
 * movement costs were chosen.
 */

import { describe, expect, it } from "vitest";
import { nextFloat, nextInt, peekWord, roll4dF, rollD6 } from "./rng";
import type { RngState } from "./types";

const seed = (n: number): RngState => ({ seed: n, cursor: 0 });

describe("determinism", () => {
  it("returns the same value for the same seed and cursor", () => {
    const a = nextFloat({ seed: 1234, cursor: 7 });
    const b = nextFloat({ seed: 1234, cursor: 7 });
    expect(a[0]).toBe(b[0]);
  });

  it("does not depend on how many times it was called before", () => {
    const direct = nextFloat({ seed: 99, cursor: 5 })[0];
    let walked = nextFloat(seed(99))[1];
    for (let i = 1; i < 5; i += 1) walked = nextFloat(walked)[1];
    expect(nextFloat(walked)[0]).toBe(direct);
  });

  it("changes with the seed", () => {
    expect(nextFloat(seed(1))[0]).not.toBe(nextFloat(seed(2))[0]);
  });

  it("advances the cursor by exactly one per draw", () => {
    expect(nextFloat(seed(3))[1].cursor).toBe(1);
    expect(peekWord({ seed: 3, cursor: 0 })).toBe(peekWord({ seed: 3, cursor: 0 }));
  });

  it("does not mutate the state it was given", () => {
    const state: RngState = { seed: 5, cursor: 0 };
    nextFloat(state);
    expect(state.cursor).toBe(0);
  });
});

describe("1d6", () => {
  it("stays within 1..6", () => {
    let state = seed(41);
    for (let i = 0; i < 5000; i += 1) {
      const [value, next] = rollD6(state);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      state = next;
    }
  });

  it("produces every face with a mean near 3.5", () => {
    const seen = new Set<number>();
    let state = seed(42);
    let sum = 0;
    const rolls = 60_000;
    for (let i = 0; i < rolls; i += 1) {
      const [value, next] = rollD6(state);
      seen.add(value);
      sum += value;
      state = next;
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sum / rolls).toBeCloseTo(3.5, 1);
  });
});

describe("4dF", () => {
  it("stays within -4..+4", () => {
    let state = seed(7);
    for (let i = 0; i < 5000; i += 1) {
      const [value, next] = roll4dF(state);
      expect(value).toBeGreaterThanOrEqual(-4);
      expect(value).toBeLessThanOrEqual(4);
      state = next;
    }
  });

  it("has mean 0 and covers every outcome", () => {
    const counts = new Map<number, number>();
    let state = seed(11);
    const rolls = 81_000;
    for (let i = 0; i < rolls; i += 1) {
      const [value, next] = roll4dF(state);
      counts.set(value, (counts.get(value) ?? 0) + 1);
      state = next;
    }
    const sum = [...counts.entries()].reduce((acc, [v, n]) => acc + v * n, 0);
    expect(sum / rolls).toBeCloseTo(0, 1);
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
  });

  it("consumes four cursor positions per roll", () => {
    const [, after] = roll4dF(seed(8));
    expect(after.cursor).toBe(4);
  });
});

describe("nextInt", () => {
  it("rejects an inverted range", () => {
    expect(() => nextInt(seed(1), 5, 1)).toThrow(RangeError);
  });
});
