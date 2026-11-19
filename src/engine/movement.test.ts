/**
 * Movement rules (§D5, owner's ruling): the die is the distance, the player is
 * the direction, and the move is one decision that cannot be undone.
 */

import { describe, expect, it } from "vitest";
import { ARRIVAL_NODE } from "../content/board";
import { distance } from "./board";
import { reachableEndpoints } from "./movement";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, GameState } from "./types";

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code}`);
  return result.value;
}

function rolled(seed: number): GameState {
  return apply(createGame(seed), { type: "rollMovement" });
}

describe("where you can land", () => {
  it("offers both directions around a ring", () => {
    // Arrival gate is outer-02. +4 is outer-06, -4 is outer-10.
    // Sorted, so the same list reaches the UI and the replay log.
    expect(reachableEndpoints(ARRIVAL_NODE, 4)).toEqual(["middle-04", "outer-06", "outer-10"]);
  });

  it("offers a bridge when the gate is exactly on the distance", () => {
    // outer-02 -> 03 -> 04 -> 05 is three steps; G1 to middle-04 is the fourth.
    expect(reachableEndpoints(ARRIVAL_NODE, 4)).toContain("middle-04");
    // With a roll of three the gate is not reachable: it is one step further.
    expect(reachableEndpoints(ARRIVAL_NODE, 3)).not.toContain("middle-04");
  });

  it("never offers the space you started on", () => {
    for (let steps = 1; steps <= 6; steps += 1) {
      expect(reachableEndpoints(ARRIVAL_NODE, steps)).not.toContain(ARRIVAL_NODE);
    }
  });

  it("never offers a space you cannot reach in exactly that many steps", () => {
    for (let steps = 1; steps <= 6; steps += 1) {
      for (const endpoint of reachableEndpoints(ARRIVAL_NODE, steps)) {
        expect(distance(ARRIVAL_NODE, endpoint)).toBeLessThanOrEqual(steps);
      }
    }
  });

  it("is deterministic", () => {
    expect(reachableEndpoints(ARRIVAL_NODE, 5)).toEqual(reachableEndpoints(ARRIVAL_NODE, 5));
  });
});

describe("moving", () => {
  it("lands on the chosen space and closes the move", () => {
    const state = rolled(2026);
    const options = reachableEndpoints(state.players[state.seat].node, state.roll);
    const target = options[0] as string;

    const next = apply(state, { type: "moveTo", node: target });

    expect(next.players[state.seat].node).toBe(target);
    expect(next.phase).toBe("action");
  });

  it("refuses a space that is not a legal landing with a stable code", () => {
    const state = rolled(2026);
    const options = new Set(reachableEndpoints(state.players[state.seat].node, state.roll));
    const illegal = ["outer-00", "outer-01", "core-00", "inner-03"].find((node) => !options.has(node)) as string;

    const result = reduce(state, { type: "moveTo", node: illegal });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unreachable");
  });

  it("cannot move twice in a turn", () => {
    const state = rolled(2026);
    const first = reachableEndpoints(state.players[state.seat].node, state.roll)[0] as string;
    const landed = apply(state, { type: "moveTo", node: first });

    const second = reduce(landed, { type: "moveTo", node: first });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("wrong-phase");
  });

  it("does not let you double back to where you started", () => {
    const state = rolled(2026);
    const result = reduce(state, { type: "moveTo", node: state.players[state.seat].node });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unreachable");
  });

  it("always offers at least one landing somewhere on the board", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const state = rolled(seed);
      const options = reachableEndpoints(state.players[state.seat].node, state.roll);
      expect(options.length).toBeGreaterThan(0);
    }
  });
});

describe("turn handover", () => {
  it("only ends from the action phase", () => {
    const result = reduce(rolled(1), { type: "endTurn" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong-phase");
  });

  it("cycles seats and increments the round on wrap", () => {
    let state = createGame(9);
    for (let turn = 0; turn < 3; turn += 1) {
      state = apply(state, { type: "rollMovement" });
      const options = reachableEndpoints(state.players[state.seat].node, state.roll);
      state = apply(state, { type: "moveTo", node: options[0] as string });
      state = apply(state, { type: "endTurn" });
    }
    expect(state.seat).toBe("p1");
    expect(state.round).toBe(2);
  });

  it("cycles a two-seat game, incrementing the round after two turns", () => {
    // D10: MVP is 2-3 players. Two seats must be a real table, not a subset that
    // happens to work, because most playtests will use it: half the turns.
    let state = createGame(9, seatsFor(2));
    expect(Object.keys(state.players).sort()).toEqual(["p1", "p2"]);

    for (let turn = 0; turn < 2; turn += 1) {
      state = apply(state, { type: "rollMovement" });
      const options = reachableEndpoints(state.players[state.seat].node, state.roll);
      state = apply(state, { type: "moveTo", node: options[0] as string });
      state = apply(state, { type: "endTurn" });
    }

    expect(state.seat).toBe("p1");
    expect(state.round).toBe(2);
  });

  it("starts every seat at the arrival gate", () => {
    const state = createGame(1);
    for (const seat of Object.values(state.players)) {
      expect(seat.node).toBe(ARRIVAL_NODE);
    }
  });
});
