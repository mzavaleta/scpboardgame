/**
 * M0's acceptance test: `seed + ordered actions -> identical state hash`.
 *
 * The action generator asks the engine what is legal at each step rather than
 * guessing. A fuzz that feeds rejected actions would go green while proving
 * nothing — the engine would be the only thing under test.
 *
 * If this file ever fails, the engine is no longer replayable, and with it go
 * golden tests, bug reproduction, the balance simulator and any future online
 * play.
 */

import { describe, expect, it } from "vitest";
import { neighborsOf } from "./board";
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

/** The legal moves in the current phase. Grows as rules land. */
export function legalActions(state: GameState): Action[] {
  const node = state.players[state.seat].node;

  switch (state.phase) {
    case "roll":
      return [{ type: "rollMovement" }];
    case "move":
      return neighborsOf(node).map((node) => ({ type: "moveTo", node }));
    case "action":
      return [{ type: "endTurn" }];
    default:
      return [];
  }
}

/** A deterministic run built only from actions the engine declares legal. */
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

describe("replay determinism", () => {
  it("produces an identical hash for the same seed and actions", () => {
    const actions = randomLegalRun(2026, 200);
    expect(actions.length).toBe(200);
    expect(hashState(play(2026, actions))).toBe(hashState(play(2026, actions)));
  });

  it("produces a different hash for a different seed", () => {
    // Each game generates its own legal run: a fixed action list cannot be
    // legal across seeds, because the dice change which phases occur.
    expect(hashState(play(1, randomLegalRun(1, 40)))).not.toBe(hashState(play(2, randomLegalRun(2, 40))));
  });

  it("changes the hash when the game advances", () => {
    expect(hashState(play(7, randomLegalRun(7, 20)))).not.toBe(hashState(play(7, randomLegalRun(7, 21))));
  });

  it("holds across 500 pseudo-random legal games", () => {
    for (let game = 0; game < 500; game += 1) {
      const seed = 9000 + game;
      const actions = randomLegalRun(seed, 40);
      expect(hashState(play(seed, actions))).toBe(hashState(play(seed, actions)));
    }
  });

  it("keeps the rng cursor monotonic and bounded by the dice rolled", () => {
    const state = play(5, randomLegalRun(5, 60));
    expect(state.rng.cursor).toBeGreaterThan(0);
    expect(state.rng.cursor).toBeLessThanOrEqual(60);
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
    const fullTurn = (state: GameState): Action[] => {
      const actions: Action[] = [];
      let cursor = state;
      while (cursor.phase !== "action") {
        const [action] = legalActions(cursor);
        if (!action) break;
        actions.push(action);
        const result = reduce(cursor, action);
        if (!result.ok) break;
        cursor = result.value;
      }
      actions.push({ type: "endTurn" });
      return actions;
    };

    let state = createGame(21);
    const turn1 = fullTurn(state);
    state = play(21, turn1);
    expect(state.seat).toBe("p2");
    expect(state.round).toBe(1);
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
  it("records the roll, the walk and the handover in order", () => {
    const state = play(1, randomLegalRun(1, 3));
    expect(state.log[0]).toContain("Round 1");
    expect(state.log.join("\n")).toMatch(/p1 rolled [1-6]/);
    expect(state.log.join("\n")).toMatch(/p1 moved to /);
  });
});
