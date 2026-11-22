/**
 * M3c: the protocol track (§C4.4, D22).
 *
 * The Command Center was an empty room. Since L15 the protocol no longer
 * recontains the site: each step buys the table one round of countdown, so the
 * number moving is the table buying time — and the same room holds the only
 * escape capsule, which is the decision the room exists for.
 */

import { describe, expect, it } from "vitest";
import { TUNING } from "../config/tuning";
import { createGame, reduce } from "./reduce";
import { evalCondition } from "./conditions";
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

/** A seat standing in the Command Center, ready to spend its action. */
function atCore(options: { seat2?: string; steps?: number } = {}): GameState {
  const base = createGame(2026, seatsFor(2));
  return {
    ...base,
    phase: "action",
    protocolSteps: options.steps ?? 0,
    players: {
      ...base.players,
      // §7c.3: a winner is a seat whose *directive* says so, so the fixture says so.
      p1: { ...base.players.p1!, node: "core-00", mainDirectiveId: "m-untouched" },
      p2: { ...base.players.p2!, node: options.seat2 ?? "inner-02", mainDirectiveId: "m-nobody-left" },
    },
  };
}

/** Advance until the test succeeds, so the assertion is about the rule, not luck. */
function advanceOnce(state: GameState): GameState {
  let next = state;
  for (let seed = 1; seed <= 60; seed += 1) {
    const attempt = { ...next, rng: { seed, cursor: next.rng.cursor } };
    const result = reduce(attempt, { type: "advanceProtocol" });
    if (result.ok) {
      next = result.value;
      if (next.protocolSteps > 0) return next;
    }
  }
  throw new Error("no successful protocol test in 60 seeds");
}

describe("advancing the protocol", () => {
  it("takes one step on a successful Intellect test", () => {
    const after = advanceOnce(atCore());

    expect(after.protocolSteps).toBe(1);
    expect(after.log.join("\n")).toMatch(/protocol 0 → 1/);
  });

  it("holds the track when the test fails, but the attempt still happened", () => {
    const state = atCore();
    let sawFail = false;

    for (let seed = 1; seed <= 40 && !sawFail; seed += 1) {
      const attempt = { ...state, rng: { seed, cursor: 0 } };
      const result = reduce(attempt, { type: "advanceProtocol" });
      if (result.ok && result.value.protocolSteps === 0) {
        sawFail = true;
        expect(result.value.log.join("\n")).toMatch(/protocol holds/i);
        // The seat tried, so the threat track is held (§D16).
        expect(result.value.progressThisRound).toContain("p1");
      }
    }

    expect(sawFail).toBe(true);
  });

  it("rejects the action away from the Command Center", () => {
    const base = atCore();
    const elsewhere = { ...base, players: { ...base.players, p1: { ...base.players.p1!, node: "inner-02" } } };

    expect(rejection(elsewhere, { type: "advanceProtocol" })).toBe("no-core");
  });

  it("rejects the action outside the action phase", () => {
    const state = { ...atCore(), phase: "roll" as const };
    expect(rejection(state, { type: "advanceProtocol" })).toBe("wrong-phase");
  });
});

describe("the protocol buys time (L15)", () => {
  it("does not end the game on the third step", () => {
    const done = advanceOnce(atCore({ steps: TUNING.protocol.steps - 1 }));

    expect(done.protocolSteps).toBe(TUNING.protocol.steps);
    expect(done.outcome).toBeNull();
    expect(done.phase).toBe("action");
  });

  it("adds one round to the countdown once the warhead is armed", () => {
    const armed = { ...atCore({ steps: 0 }), warhead: { remaining: 2 } };
    const done = advanceOnce(armed);

    expect(done.warhead?.remaining).toBe(3);
  });

  it("takes one off the threat track before the warhead arms", () => {
    const done = advanceOnce({ ...atCore({ steps: 0 }), threat: 3 });

    expect(done.threat).toBe(2);
  });

  it("still marks the final step, which one directive asks for", () => {
    const done = advanceOnce(atCore({ steps: TUNING.protocol.steps - 1 }));

    expect(evalCondition(done, "p1", { kind: "completedFinalProtocolStep" })).toBe(true);
  });
});

describe("sabotage is the visible counter-move", () => {
  it("takes a step away and leaves tamperedProtocol evidence", () => {
    const after = apply(atCore({ steps: 2 }), { type: "sabotageProtocol" });

    expect(after.protocolSteps).toBe(1);
    expect(after.evidence.filter((token) => token.sourceSeat === "p1" && token.kind === "tamperedProtocol")).toHaveLength(1);
    expect(after.log.join("\n")).toMatch(/protocol 2 → 1/);
  });

  it("never goes below zero", () => {
    const after = apply(atCore({ steps: 0 }), { type: "sabotageProtocol" });

    expect(after.protocolSteps).toBe(0);
    expect(after.evidence.filter((token) => token.sourceSeat === "p1" && token.kind === "tamperedProtocol")).toHaveLength(1);
  });

  it("does not count as progress — it is a move against the site", () => {
    const after = apply(atCore({ steps: 2 }), { type: "sabotageProtocol" });

    expect(after.progressThisRound).not.toContain("p1");
  });

  it("rejects sabotage away from the Command Center", () => {
    const base = atCore();
    const elsewhere = { ...base, players: { ...base.players, p1: { ...base.players.p1!, node: "core-00" } } };
    // p1 is at the core; sabotage from p2's position must fail when it is p2's turn.
    const p2Turn = { ...elsewhere, seat: "p2" as const };

    expect(rejection(p2Turn, { type: "sabotageProtocol" })).toBe("no-core");
  });
});
