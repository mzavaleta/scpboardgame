/**
 * A3 — the public character objective.
 *
 * Fixed per role, visible to the table, pays once when met, and turns into a mild
 * penalty at the moment the warhead arms if it is still undone.
 */

import { describe, expect, it } from "vitest";
import { OBJECTIVES, objectiveFor } from "../content/objectives";
import { ROLES } from "../content/roles";
import { TUNING } from "../config/tuning";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, CounterId, GameState } from "./types";

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code}`);
  return result.value;
}

function withRole(roleId: string, counters: Partial<Record<CounterId, number>> = {}): GameState {
  const base = createGame(2026, seatsFor(2));
  const player = base.players.p1!;
  return {
    ...base,
    phase: "action",
    players: {
      ...base.players,
      p1: {
        ...player,
        roleId,
        aspectId: "methodical",
        counters: { ...player.counters, ...counters },
      },
    },
  };
}

describe("public objectives (A3)", () => {
  it("gives every role exactly one", () => {
    expect(OBJECTIVES).toHaveLength(ROLES.length);
    for (const role of ROLES) {
      expect(objectiveFor(role.id).roleId).toBe(role.id);
    }
  });

  it("pays the reward once, when the condition is met", () => {
    const state = withRole("mtf-field-agent", { containments: 2 });
    const before = state.players.p1!.records;

    const met = apply(state, { type: "endTurn" });
    expect(met.players.p1?.objectiveDone).toBe(true);
    expect(met.players.p1?.records).toBe(before + 2);

    // Another turn with the same counters must not pay again.
    const again = apply({ ...met, phase: "action" }, { type: "endTurn" });
    expect(again.players.p1?.records).toBe(met.players.p1!.records);
  });

  it("turns an unmet objective into a penalty when the warhead arms", () => {
    const armed = {
      ...withRole("mtf-field-agent", {}),
      threat: TUNING.threat.max,
      warhead: null,
    };
    const p1Integrity = armed.players.p1!.integrity;

    const afterP1 = apply(armed, { type: "endTurn" });
    const afterRound = apply({ ...afterP1, phase: "action" }, { type: "endTurn" });

    expect(afterRound.players.p1?.objectiveFailed).toBe(true);
    expect(afterRound.players.p1?.integrity).toBe(p1Integrity - 1);
    expect(afterRound.log.join("\n")).toMatch(/did not meet their objective/);
  });

  it("does not punish an objective already met", () => {
    const met = apply(withRole("mtf-field-agent", { containments: 2 }), { type: "endTurn" });
    const armed: GameState = { ...met, phase: "action", threat: TUNING.threat.max, warhead: null };

    const afterP1 = apply(armed, { type: "endTurn" });
    const afterRound = apply({ ...afterP1, phase: "action" }, { type: "endTurn" });

    expect(afterRound.players.p1?.objectiveFailed).toBe(false);
    expect(afterRound.players.p1?.objectiveDone).toBe(true);
  });
});
