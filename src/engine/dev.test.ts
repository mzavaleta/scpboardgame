/**
 * The dev tool: a forced movement roll (§14e).
 *
 * The whole point of a seeded engine is that a game is reproducible, so a dev
 * tool must not be a hole in that. `devRoll` consumes exactly one die from the
 * stream, like a real roll, which means turning it on and off mid-game cannot
 * desync a replay — the only difference is *which* value was taken, and the log
 * says so out loud.
 */

import { describe, expect, it } from "vitest";
import { peekRolls, rollD6 } from "./rng";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, GameState } from "./types";

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code}`);
  return result.value;
}

describe("devRoll", () => {
  it("sets the roll to the requested value and opens the move", () => {
    const state = apply(createGame(2026), { type: "devRoll", value: 4 });

    expect(state.roll).toBe(4);
    expect(state.phase).toBe("move");
  });

  it("consumes exactly one die, so the stream stays where a real roll would leave it", () => {
    const before = createGame(2026);
    const [, afterRealRoll] = rollD6(before.rng);

    const forced = apply(before, { type: "devRoll", value: 4 });

    // Byte-identical rng state to a real roll: only the *value* differs.
    expect(forced.rng).toEqual(afterRealRoll);
    // And the value that follows is the one a real roll would have left next.
    expect(rollD6(forced.rng)[0]).toBe(peekRolls(before.rng, 2)[1]);
  });

  it("says in the log that the roll was forced", () => {
    const state = apply(createGame(7), { type: "devRoll", value: 2 });

    expect(state.log.some((line) => line.includes("forced a roll of 2"))).toBe(true);
  });

  it("refuses a value that is not a d6 face", () => {
    for (const value of [0, 7, -1, 4.5]) {
      const result = reduce(createGame(1), { type: "devRoll", value });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("invalid-value");
    }
  });

  it("only works while waiting to roll", () => {
    const moved = apply(createGame(2026), { type: "devRoll", value: 4 });

    const result = reduce(moved, { type: "devRoll", value: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong-phase");
  });
});

describe("devEncounter", () => {
  it("opens the chosen card wherever the seat is standing", () => {
    const state = apply(createGame(2026, seatsFor(2)), { type: "devEncounter", card: "scp-682" });

    expect(state.phase).toBe("space");
    expect(state.encounter?.card).toBe("scp-682");
    expect(state.players.p1?.node).toBe(state.encounter?.node);
    expect(state.log.some((line) => line.includes("forced an encounter"))).toBe(true);
  });

  it("refuses a card that does not exist", () => {
    const result = reduce(createGame(1, seatsFor(2)), { type: "devEncounter", card: "scp-9999" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid-value");
  });

  it("refuses to open a second encounter on top of one", () => {
    const opened = apply(createGame(1, seatsFor(2)), { type: "devEncounter", card: "scp-005" });
    const result = reduce(opened, { type: "devEncounter", card: "scp-173" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("no-encounter");
  });
});

describe("devHurt", () => {
  it("takes Integrity off the active seat and clamps at 0", () => {
    const hurt = apply(createGame(9, seatsFor(2)), { type: "devHurt", amount: 3 });
    expect(hurt.players.p1?.integrity).toBe(3);

    const down = apply(hurt, { type: "devHurt", amount: 99 });
    expect(down.players.p1?.integrity).toBe(0);
    expect(down.players.p1?.downed).toBe(true);
    expect(down.log.some((line) => line.includes("is down at"))).toBe(true);
  });

  it("refuses nonsense damage", () => {
    for (const amount of [0, -1, 2.5]) {
      const result = reduce(createGame(1, seatsFor(2)), { type: "devHurt", amount });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("invalid-value");
    }
  });
});

describe("peekRolls", () => {
  it("returns the next N movement rolls", () => {
    const state = createGame(2026);
    const peeked = peekRolls(state.rng, 3);

    expect(peeked).toHaveLength(3);
    expect(peeked).toEqual([rollD6(state.rng)[0], rollD6(rollD6(state.rng)[1])[0], rollD6(rollD6(rollD6(state.rng)[1])[1])[0]]);
  });

  it("is pure: peeking does not advance the stream", () => {
    const state = createGame(42);
    peekRolls(state.rng, 5);

    expect(state.rng.cursor).toBe(0);
    expect(rollD6(state.rng)[0]).toBe(peekRolls(state.rng, 1)[0]);
  });

  it("stays inside the d6 range", () => {
    for (const value of peekRolls(createGame(3).rng, 20)) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});
