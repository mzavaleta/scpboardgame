/**
 * M0's acceptance test: `seed + ordered actions -> identical state hash`.
 *
 * If this file ever fails, the engine is no longer replayable, and with it go
 * golden tests, bug reproduction, the balance simulator and any future online
 * play. Nothing else in the project may be trusted until this passes.
 */

import { describe, expect, it } from "vitest";
import { hashState } from "./hash";
import { createGame, reduce } from "./reduce";
import { nextInt } from "./rng";
import type { Action, GameState } from "./types";

function play(seed: number, actions: readonly Action[]): GameState {
  let state = createGame(seed);
  for (const action of actions) {
    const result = reduce(state, action);
    if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code}`);
    state = result.value;
  }
  return state;
}

/** The only legal move in a phase, for now. Grows as rules land. */
function legalActions(state: GameState): Action[] {
  switch (state.phase) {
    case "roll":
      return [{ type: "rollMovement" }];
    case "move":
      return [{ type: "endTurn" }];
    default:
      return [];
  }
}

/**
 * A deterministic run built by asking the engine what is legal at each step, so
 * the fuzz can never "prove" determinism by feeding it rejected actions.
 */
function randomLegalRun(seedValue: number, steps: number): Action[] {
  let cursor = { seed: seedValue, cursor: 0 };
  let state = createGame(seedValue);
  const actions: Action[] = [];

  for (let step = 0; step < steps; step += 1) {
    const options = legalActions(state);
    if (options.length === 0) break;
    const [pick, next] = nextInt(cursor, 0, options.length - 1);
    cursor = next;
    const action = options[pick] as Action;
    actions.push(action);

    const result = reduce(state, action);
    if (!result.ok) throw new Error(`engine rejected an action it declared legal: ${action.type}`);
    state = result.value;
  }

  return actions;
}

/** A deterministic, legal action script — alternates rolling and ending turns. */
function scriptedTurns(turns: number): Action[] {
  return Array.from({ length: turns }, (_, i) =>
    i % 2 === 0 ? ({ type: "rollMovement" } as const) : ({ type: "endTurn" } as const),
  );
}

describe("replay determinism", () => {
  it("produces an identical hash for the same seed and actions", () => {
    const actions = scriptedTurns(200);
    expect(hashState(play(2026, actions))).toBe(hashState(play(2026, actions)));
  });

  it("produces a different hash for a different seed", () => {
    const actions = scriptedTurns(20);
    expect(hashState(play(1, actions))).not.toBe(hashState(play(2, actions)));
  });

  it("changes the hash when the state advances", () => {
    expect(hashState(play(7, scriptedTurns(10)))).not.toBe(hashState(play(7, scriptedTurns(12))));
  });

  it("holds across 500 pseudo-random *legal* games", () => {
    for (let game = 0; game < 500; game += 1) {
      const actions = randomLegalRun(9000 + game, 40);
      expect(hashState(play(game, actions))).toBe(hashState(play(game, actions)));
    }
  });
});

describe("turn machinery", () => {
  it("starts in the roll phase with seat p1", () => {
    const state = createGame(1);
    expect(state.seat).toBe("p1");
    expect(state.phase).toBe("roll");
    expect(state.round).toBe(1);
  });

  it("moves to the move phase on a roll, with 1..6 movement", () => {
    const state = play(1, [{ type: "rollMovement" }]);
    expect(state.phase).toBe("move");
    expect(state.moveRemaining).toBeGreaterThanOrEqual(1);
    expect(state.moveRemaining).toBeLessThanOrEqual(6);
  });

  it("advances the seat and keeps the round until it wraps", () => {
    const afterP1 = play(1, [{ type: "rollMovement" }, { type: "endTurn" }]);
    expect(afterP1.seat).toBe("p2");
    expect(afterP1.round).toBe(1);

    const afterP3 = play(1, scriptedTurns(6));
    expect(afterP3.seat).toBe("p1");
    expect(afterP3.round).toBe(2);
  });

  it("rejects actions in the wrong phase with a stable code", () => {
    const rolled = play(1, [{ type: "rollMovement" }]);
    const again = reduce(rolled, { type: "rollMovement" });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("wrong-phase");

    const fresh = reduce(createGame(1), { type: "endTurn" });
    expect(fresh.ok).toBe(false);
    if (!fresh.ok) expect(fresh.error.code).toBe("wrong-phase");
  });
});

describe("the log is public narration", () => {
  it("records rolls and handovers in order", () => {
    const state = play(1, [{ type: "rollMovement" }, { type: "endTurn" }]);
    expect(state.log[0]).toContain("Round 1");
    expect(state.log[1]).toMatch(/p1 rolled [1-6]/);
    expect(state.log[2]).toContain("p2");
  });
});
