/**
 * R7 — hunters are monsters, not a damage tick.
 *
 * A hunter carries a Keter card as its stat block, contact is a 4dF test, and
 * `confrontHunter` is how a player clears one. What this file pins is the stat
 * block and the clear; movement is covered in `mvp.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { ANOMALIES } from "../content/anomalies";
import { applyEffects } from "./effects";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { GameState } from "./types";

describe("hunters are real monsters (R7)", () => {
  it("spawns with a Keter card as its stat block", () => {
    const base = createGame(1, seatsFor(2));
    const spawned = applyEffects(base, "p1", [{ kind: "spawnHunter", count: 1 }]);

    const hunter = spawned.state.hunters[0];
    expect(hunter).toBeDefined();
    expect(ANOMALIES.find((card) => card.id === hunter!.card)?.tier).toBe("keter");
  });

  it("can be confronted on its node; a success clears it", () => {
    const base = createGame(1, seatsFor(2));
    const spawned = applyEffects({ ...base, phase: "action" }, "p1", [{ kind: "spawnHunter", count: 1 }]);
    const hunter = spawned.state.hunters[0]!;
    const state: GameState = { ...spawned.state, phase: "action" };

    for (let seed = 1; seed <= 80; seed += 1) {
      const attempt = { ...state, rng: { seed, cursor: state.rng.cursor } };
      const result = reduce(attempt, { type: "confrontHunter", hunterId: hunter.id });
      if (!result.ok) continue;
      if (result.value.hunters.length === 0) {
        expect(result.value.log.join("\n")).toMatch(/is destroyed/);
        return;
      }
    }
    throw new Error("no seed cleared the hunter");
  });

  it("refuses a hunter that is not on your node", () => {
    const base = createGame(1, seatsFor(2));
    const spawned = applyEffects(base, "p1", [{ kind: "spawnHunterAtRing", ring: "inner", count: 1 }]);
    const elsewhere: GameState = { ...spawned.state, phase: "action" };
    const result = reduce(elsewhere, { type: "confrontHunter", hunterId: spawned.state.hunters[0]!.id });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid-target");
  });
});
