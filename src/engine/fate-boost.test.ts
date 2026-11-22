/**
 * R4 — Fate is a roll modifier now: pay before the test, up to +2, spent once.
 *
 * The engine reads `player.boost` inside `rollTest`, so the number the table sees
 * is the number the roll uses; the boost is cleared by that same test.
 */

import { describe, expect, it } from "vitest";
import { rollTest } from "./encounter";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, GameState } from "./types";

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code}`);
  return result.value;
}

const rejection = (state: GameState, action: Action): string => {
  const result = reduce(state, action);
  if (result.ok) throw new Error(`expected a rejection from ${action.type}`);
  return result.error.code;
};

function ready(patch: Partial<GameState["players"]["p1"]> = {}): GameState {
  const base = createGame(2026, seatsFor(2));
  return {
    ...base,
    phase: "move",
    players: { ...base.players, p1: { ...base.players.p1!, fate: 2, ...patch } },
  };
}

describe("Fate buys test shifts (R4)", () => {
  it("spends Fate and carries the boost into the next test, once", () => {
    const boosted = apply(ready(), { type: "boostTest", amount: 2 });
    expect(boosted.players.p1?.fate).toBe(0);
    expect(boosted.players.p1?.boost).toBe(2);

    const { state: after, result } = rollTest(boosted, "p1", "intellect", 3, "anomaly");
    expect(result.boost).toBe(2);
    expect(result.statValue).toBe(boosted.players.p1!.stats.intellect + 2);
    expect(after.players.p1?.boost).toBe(0);
  });

  it("refuses without Fate, and past +2 in total", () => {
    expect(rejection(ready({ fate: 0 }), { type: "boostTest", amount: 1 })).toBe("no-fate");
    const once = apply(ready({ fate: 2 }), { type: "boostTest", amount: 2 });
    expect(rejection(once, { type: "boostTest", amount: 1 })).toBe("invalid-value");
  });

  it("cannot be declared before the roll", () => {
    expect(rejection({ ...ready(), phase: "roll" }, { type: "boostTest", amount: 1 })).toBe("wrong-phase");
  });
});
