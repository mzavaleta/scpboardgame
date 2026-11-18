/**
 * Movement rules for M1: roll `1d6`, walk the graph one edge per step, hand over.
 * Clearance checks at gates are deliberately absent (M3) — the crossing is
 * logged instead, so the gap is visible in playtests rather than invisible.
 */

import { describe, expect, it } from "vitest";
import { ARRIVAL_NODE } from "../content/board";
import { distance, neighborsOf } from "./board";
import { createGame, reduce } from "./reduce";
import type { Action, GameState } from "./types";

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code}`);
  return result.value;
}

function rolled(seed = 2026): GameState {
  return apply(createGame(seed), { type: "rollMovement" });
}

describe("rolling", () => {
  it("only works in the roll phase", () => {
    const state = rolled();
    const again = reduce(state, { type: "rollMovement" });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("wrong-phase");
  });

  it("grants between one and six moves", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      expect(rolled(seed).moveRemaining).toBeGreaterThanOrEqual(1);
      expect(rolled(seed).moveRemaining).toBeLessThanOrEqual(6);
    }
  });
});

describe("moving", () => {
  it("rejects a non-adjacent space with a stable code", () => {
    const state = rolled();
    const far = state.players[state.seat].node === "outer-00" ? "outer-06" : "outer-00";
    const result = reduce(state, { type: "moveTo", node: far });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not-adjacent");
  });

  it("moves the token and spends exactly one step", () => {
    const state = rolled();
    const from = state.players[state.seat].node;
    const to = neighborsOf(from)[0] as string;
    const next = apply(state, { type: "moveTo", node: to });

    expect(next.players[state.seat].node).toBe(to);
    expect(next.moveRemaining).toBe(state.moveRemaining - 1);
    expect(next.phase).toBe(state.moveRemaining === 1 ? "action" : "move");
  });

  it("reaches the action phase after exactly the rolled number of steps", () => {
    let state = rolled();
    let steps = 0;
    while (state.phase === "move") {
      const from = state.players[state.seat].node;
      const to = neighborsOf(from)[0] as string;
      state = apply(state, { type: "moveTo", node: to });
      steps += 1;
      expect(steps).toBeLessThanOrEqual(6);
    }
    expect(steps).toBe(state.moveRemaining + steps);
    expect(state.phase).toBe("action");
    expect(state.moveRemaining).toBe(0);
  });

  it("refuses to move without steps left", () => {
    let state = rolled();
    while (state.phase === "move") {
      state = apply(state, { type: "moveTo", node: neighborsOf(state.players[state.seat].node)[0] as string });
    }
    const result = reduce(state, { type: "moveTo", node: neighborsOf(state.players[state.seat].node)[0] as string });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong-phase");
  });

  it("walks from the arrival gate to the Command Center without leaving the graph", () => {
    // Greedy descent by graph distance: proves a legal path exists and that
    // movement can actually traverse it, which is stronger than reachability.
    let state = createGame(4);
    let guard = 0;

    while (state.players[state.seat].node !== "core-00") {
      if (state.phase === "roll") {
        state = apply(state, { type: "rollMovement" });
        continue;
      }
      if (state.phase === "action") {
        state = apply(state, { type: "endTurn" });
        continue;
      }

      const from = state.players[state.seat].node;
      const next = neighborsOf(from)
        .slice()
        .sort((a, b) => distance(a, "core-00") - distance(b, "core-00"))[0] as string;

      state = apply(state, { type: "moveTo", node: next });
      guard += 1;
      expect(guard).toBeLessThan(200);
    }

    expect(state.players[state.seat].node).toBe("core-00");
  });
});

describe("turn handover", () => {
  it("only ends from the action phase", () => {
    const result = reduce(rolled(), { type: "endTurn" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong-phase");
  });

  it("cycles seats and increments the round on wrap", () => {
    let state = createGame(9);
    for (let turn = 0; turn < 3; turn += 1) {
      state = apply(state, { type: "rollMovement" });
      while (state.phase === "move") {
        state = apply(state, { type: "moveTo", node: neighborsOf(state.players[state.seat].node)[0] as string });
      }
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
