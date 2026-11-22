/**
 * L15 — the one-seat escape capsule in the Command Center.
 *
 * This unit builds the **object and the claim**, not the ending: the terminal
 * reads `capsuleSeat` in the next unit, together with the directive rewrite
 * (A5 + A3), because changing the ending alone would leave every containment
 * directive unwinnable. What is pinned here is the public, permanent claim.
 */

import { describe, expect, it } from "vitest";
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

/** A seat parked in the action phase, optionally at the Core. */
function acting(seat: "p1" | "p2", node = "core-00"): GameState {
  const base = createGame(2026, seatsFor(2));
  return {
    ...base,
    seat,
    phase: "action",
    players: { ...base.players, [seat]: { ...base.players[seat]!, node } },
  };
}

describe("the escape capsule (L15)", () => {
  it("starts free", () => {
    expect(createGame(1, seatsFor(2)).capsuleSeat).toBeNull();
  });

  it("is claimed at the Command Center, publicly and permanently", () => {
    const claimed = apply(acting("p1"), { type: "claimCapsule" });

    expect(claimed.capsuleSeat).toBe("p1");
    expect(claimed.log.join("\n")).toMatch(/p1 claims the escape capsule/);
  });

  it("refuses a claim from anywhere else", () => {
    expect(rejection(acting("p1", "outer-02"), { type: "claimCapsule" })).toBe("no-core");
  });

  it("refuses a second claim: there is one seat", () => {
    const claimed = apply(acting("p1"), { type: "claimCapsule" });
    const second: GameState = {
      ...claimed,
      seat: "p2",
      players: { ...claimed.players, p2: { ...claimed.players.p2!, node: "core-00" } },
    };

    expect(rejection(second, { type: "claimCapsule" })).toBe("capsule-taken");
  });

  it("refuses the wrong phase, including a downed seat (which cannot act)", () => {
    const downed = acting("p1");
    const wounded: GameState = {
      ...downed,
      players: { ...downed.players, p1: { ...downed.players.p1!, downed: true } },
    };
    expect(rejection(wounded, { type: "claimCapsule" })).toBe("wrong-phase");

    const rolling: GameState = { ...acting("p1"), phase: "roll" };
    expect(rejection(rolling, { type: "claimCapsule" })).toBe("wrong-phase");
  });
});
