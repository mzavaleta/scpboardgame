/**
 * R3 — Records buy stats at a checkpoint.
 *
 * The old clearance ladder is gone: a gate has a condition, and a player's rank no
 * longer opens anything. What Records do now is the only progression in the game,
 * so this file pins the price, the cap and the three refusals.
 */

import { describe, expect, it } from "vitest";
import { progressionRule } from "../config/tuning";
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

/** A seat standing on a checkpoint with enough Records to spend. */
function atDesk(patch: { records?: number; combat?: number } = {}): GameState {
  const base = createGame(2026, seatsFor(2));
  const player = base.players.p1!;
  return {
    ...base,
    phase: "action",
    players: {
      ...base.players,
      p1: {
        ...player,
        node: "outer-05",
        records: patch.records ?? progressionRule().pointsPerStep,
        stats: { ...player.stats, combat: patch.combat ?? player.stats.combat },
      },
    },
  };
}

describe("Records buy stats (R3)", () => {
  it("raises the chosen stat by one for the price", () => {
    const before = atDesk();
    const after = apply(before, { type: "raiseStat", stat: "combat" });
    const price = progressionRule().pointsPerStep;

    expect(after.players.p1?.stats.combat).toBe(before.players.p1!.stats.combat + 1);
    expect(after.players.p1?.records).toBe(before.players.p1!.records - price);
    expect(after.log.join("\n")).toMatch(/raised combat/);
  });

  it("only sells at a checkpoint", () => {
    const elsewhere: GameState = {
      ...atDesk(),
      players: { ...atDesk().players, p1: { ...atDesk().players.p1!, node: "outer-02" } },
    };
    expect(rejection(elsewhere, { type: "raiseStat", stat: "combat" })).toBe("no-checkpoint");
  });

  it("refuses without enough Records, or past the cap", () => {
    expect(rejection(atDesk({ records: 0 }), { type: "raiseStat", stat: "combat" })).toBe("not-enough-progress");
    expect(rejection(atDesk({ combat: progressionRule().statCap }), { type: "raiseStat", stat: "combat" })).toBe(
      "stat-at-cap",
    );
  });

  it("waits for the action phase", () => {
    expect(rejection({ ...atDesk(), phase: "move" }, { type: "raiseStat", stat: "intellect" })).toBe("wrong-phase");
  });
});
