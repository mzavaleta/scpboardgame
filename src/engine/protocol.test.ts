/**
 * M3c: the protocol track (§C4.4, D22).
 *
 * The Command Center was an empty room. This is the mechanic that makes it the
 * room you hold: three steps up recontain the site, one action pushing down
 * sabotages it, and everybody can see the number move — which is the only reason
 * a hidden agenda can be deduced from behaviour.
 */

import { describe, expect, it } from "vitest";
import { TUNING } from "../config/tuning";
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

/** A seat standing in the Command Center, ready to spend its action. */
function atCore(options: { seat2?: string; steps?: number } = {}): GameState {
  const base = createGame(2026, seatsFor(2));
  return {
    ...base,
    phase: "action",
    protocolSteps: options.steps ?? 0,
    players: {
      ...base.players,
      p1: { ...base.players.p1!, node: "core-00" },
      p2: { ...base.players.p2!, node: options.seat2 ?? "inner-02" },
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

describe("recontaining the site", () => {
  it("ends the game on the third step and rewards the seats at the centre", () => {
    const onLastStep = atCore({ steps: TUNING.protocol.steps - 1, seat2: "core-00" });
    const done = advanceOnce(onLastStep);

    expect(done.protocolSteps).toBe(TUNING.protocol.steps);
    expect(done.outcome?.terminal).toBe("recontained");
    expect(done.outcome?.winners).toEqual(["p1", "p2"]);
    expect(done.phase).toBe("end");
  });

  it("leaves the seats outside the centre with nothing (§7c.3)", () => {
    const done = advanceOnce(atCore({ steps: TUNING.protocol.steps - 1, seat2: "inner-02" }));

    expect(done.outcome?.winners).toEqual(["p1"]);
  });

  it("refuses to keep playing once the site is recontained", () => {
    const done = advanceOnce(atCore({ steps: TUNING.protocol.steps - 1 }));
    expect(rejection(done, { type: "endTurn" })).toBe("game-over");
  });
});

describe("sabotage is the visible counter-move", () => {
  it("takes a step away and leaves tamperedProtocol evidence", () => {
    const after = apply(atCore({ steps: 2 }), { type: "sabotageProtocol" });

    expect(after.protocolSteps).toBe(1);
    expect(after.players.p1?.evidence.tamperedProtocol).toBe(1);
    expect(after.log.join("\n")).toMatch(/protocol 2 → 1/);
  });

  it("never goes below zero", () => {
    const after = apply(atCore({ steps: 0 }), { type: "sabotageProtocol" });

    expect(after.protocolSteps).toBe(0);
    expect(after.players.p1?.evidence.tamperedProtocol).toBe(1);
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
