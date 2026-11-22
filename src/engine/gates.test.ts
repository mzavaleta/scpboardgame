/**
 * §14k.4 — a gate is a place with a condition (D10).
 *
 * The rules under test: an open door is free, a locked one opens once and stays
 * open, a guarded one stops the walk and leaves its monster at the mouth for
 * everyone, and a seal is an overlay that lapses back to the door's condition.
 */

import { describe, expect, it } from "vitest";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, GameState, SeatId } from "./types";

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

/** A state parked in the move phase at one end of G1, with G1 rewritten. */
function atGate(overrides: Partial<GameState>, seat: SeatId = "p1"): GameState {
  const base = createGame(2026, seatsFor(2));
  return {
    ...base,
    ...overrides,
    phase: "move",
    roll: 1,
    seat,
    players: {
      ...base.players,
      [seat]: { ...base.players[seat]!, node: seat === "p1" ? "outer-05" : "middle-04" },
    },
  };
}

describe("a gate is a place with a condition", () => {
  it("stops the walk at the mouth and draws a guard", () => {
    const state = atGate({ gates: { ...createGame(2026, seatsFor(2)).gates, G1: { condition: "guarded" } } });
    const stopped = apply(state, { type: "moveTo", node: "middle-04" });

    expect(stopped.phase).toBe("space");
    expect(stopped.encounter?.gate).toBe("G1");
    expect(stopped.players.p1?.node).toBe("outer-05");
    const guard = stopped.gates.G1?.guard;
    expect(guard).toBeDefined();
    expect(stopped.encounter?.card).toBe(guard);
  });

  it("keeps the monster at the gate when the walker declines", () => {
    const state = atGate({ gates: { ...createGame(2026, seatsFor(2)).gates, G1: { condition: "guarded" } } });
    const stopped = apply(state, { type: "moveTo", node: "middle-04" });
    const walked = apply(stopped, { type: "resolveAnomaly", choice: "decline" });

    expect(walked.players.p1?.node).toBe("outer-05");
    expect(walked.gates.G1?.condition).toBe("guarded");
    expect(walked.gates.G1?.guard).toBe(stopped.encounter?.card);
    expect(walked.log.join("\n")).toMatch(/keeps G1 shut/);
  });

  it("opens the gate and crosses when the guard is contained", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const base = createGame(seed, seatsFor(2));
      const state: GameState = {
        ...base,
        phase: "move",
        roll: 1,
        players: { ...base.players, p1: { ...base.players.p1!, node: "outer-05", stats: { combat: 6, intellect: 6 } } },
        gates: { ...base.gates, G1: { condition: "guarded" } },
      };
      const stopped = apply(state, { type: "moveTo", node: "middle-04" });
      const resolved = apply(stopped, { type: "resolveAnomaly", choice: "contain" });

      if (resolved.lastTest && resolved.lastTest.shift >= 0) {
        expect(resolved.players.p1?.node).toBe("middle-04");
        expect(resolved.gates.G1?.condition).toBe("open");
        expect(resolved.gates.G1?.guard).toBeUndefined();
        return;
      }
    }
    throw new Error("no seed contained the guard");
  });

  it("makes a standing guard block the other direction too, with the same card", () => {
    const base = createGame(2026, seatsFor(2));
    const guarded: GameState = {
      ...base,
      phase: "move",
      roll: 1,
      seat: "p2",
      players: { ...base.players, p2: { ...base.players.p2!, node: "middle-04" } },
      gates: { ...base.gates, G1: { condition: "guarded", guard: "scp-106" } },
    };

    const stopped = apply(guarded, { type: "moveTo", node: "outer-05" });

    expect(stopped.encounter?.gate).toBe("G1");
    expect(stopped.encounter?.card).toBe("scp-106");
    expect(stopped.players.p2?.node).toBe("middle-04");
  });

  it("refuses a sealed gate and lets it lapse back to its own condition", () => {
    const base = createGame(2026, seatsFor(2));
    const sealed: GameState = {
      ...base,
      phase: "move",
      roll: 1,
      players: { ...base.players, p1: { ...base.players.p1!, node: "outer-10" } },
      gates: { ...base.gates, G2: { condition: "locked", reopen: base.round + 2 } },
    };

    expect(rejection(sealed, { type: "moveTo", node: "middle-08" })).toBe("blocked-by-gate");

    const lapsed = apply({ ...sealed, round: sealed.round + 3 }, { type: "moveTo", node: "middle-08" });
    // The seal is gone; the door is still locked, so a test happens.
    expect(lapsed.lastTest).not.toBeNull();
    expect(lapsed.log.join("\n")).toContain("lock at G2");
  });
});
