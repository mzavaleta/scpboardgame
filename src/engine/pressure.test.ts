/**
 * M3b: the clock (§7, §S2).
 *
 * The rule that makes the board a game instead of a corridor: a round where
 * nobody tries to advance the site moves the threat track, the track arms the
 * warhead, and the warhead ends the game. Everything here is about *attempts*,
 * never outcomes (D16) — a failed test is already paid for.
 */

import { describe, expect, it } from "vitest";
import { TUNING } from "../config/tuning";
import { getNode } from "./board";
import { deckForNode } from "./encounter";
import { reachableEndpoints } from "./movement";
import { createGame, reduce } from "../engine/reduce";
import { playerAt, playersIn, seatsFor } from "../engine/types";
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

/**
 * A turn that produces no progress attempt: roll 1, step to a neighbouring space
 * in the *same* ring that draws nothing. Position-independent, so a test can run
 * consecutive idle rounds without tracking where the tokens ended up.
 */
function idleTurn(state: GameState): GameState {
  const rolled = apply(state, { type: "devRoll", value: 1 });
  const player = playerAt(rolled.players, rolled.seat);
  const ring = getNode(player.node).ring;
  const target = reachableEndpoints(player.node, 1).find(
    (node) => getNode(node).ring === ring && deckForNode(node) === null,
  );
  if (!target) throw new Error(`no idle landing from ${player.node}`);
  return apply(apply(rolled, { type: "moveTo", node: target }), { type: "endTurn" });
}

/** Every seat takes a turn with no attempt anywhere. */
function idleRound(state: GameState): GameState {
  let next = state;
  for (const _seat of playersIn(state.players)) {
    next = idleTurn(next);
  }
  return next;
}

describe("the threat track reads attempts, not outcomes", () => {
  it("advances after a round where nobody tried", () => {
    const state = createGame(2026, seatsFor(2));
    const after = idleRound(state);

    expect(state.threat).toBe(0);
    expect(after.threat).toBe(1);
    expect(after.log.join("\n")).toMatch(/threat 0 → 1/);
  });

  it("holds when a seat attempted something, even a failed thing", () => {
    // Walk into a lab, open the encounter, and take the containment test. The
    // roll may fail; the attempt is what the counter is for (D16).
    let held = 0;

    for (let seed = 1; seed <= 25; seed += 1) {
      const base = createGame(seed, seatsFor(2));
      const moved = apply(apply(base, { type: "devRoll", value: 2 }), {
        type: "moveTo",
        node: "outer-00",
      });
      if (moved.phase !== "space") continue;

      const resolved = apply(moved, { type: "resolveAnomaly", choice: "contain" });
      const after = idleTurn(apply(resolved, { type: "endTurn" }));

      expect(after.threat).toBe(0);
      held += 1;
    }

    expect(held).toBeGreaterThan(5);
  });

  it("does not count walking around the same ring", () => {
    // The idle round above moves twice inside the outer ring and advances the
    // track, which is the same statement from the other side.
    expect(idleRound(createGame(7, seatsFor(2))).threat).toBe(1);
  });

  it("stops at the cap instead of running past it", () => {
    const full = { ...createGame(2026, seatsFor(2)), threat: TUNING.threat.max };
    const after = idleRound(full);

    expect(after.threat).toBe(TUNING.threat.max);
  });
});

describe("the warhead is the clock's face", () => {
  it("arms at the top of the track and does not tick the same round", () => {
    const nearTop = { ...createGame(2026, seatsFor(2)), threat: TUNING.threat.max - 1 };
    const after = idleRound(nearTop);

    expect(after.threat).toBe(TUNING.threat.max);
    expect(after.warhead).toEqual({ remaining: TUNING.threat.warheadCountdown });
    expect(after.log.join("\n")).toMatch(/warhead is armed/i);
  });

  it("counts down every round after arming, and detonates at zero", () => {
    const armed = {
      ...createGame(2026, seatsFor(2)),
      threat: TUNING.threat.max,
      warhead: { remaining: 2 },
    };

    const first = idleRound(armed);
    expect(first.warhead).toEqual({ remaining: 1 });
    expect(first.outcome).toBeNull();

    const second = idleRound(first);
    expect(second.outcome?.terminal).toBe("detonated");
  });

  it("gives the site to nobody until directives exist (§7c.3)", () => {
    const armed = {
      ...createGame(2026, seatsFor(2)),
      threat: TUNING.threat.max,
      warhead: { remaining: 1 },
    };
    const dead = idleRound(armed);

    expect(dead.outcome).toMatchObject({ terminal: "detonated", winners: [] });
    expect(dead.log.join("\n")).toMatch(/detonated/i);
  });
});

describe("a finished game refuses to keep playing", () => {
  it("rejects every action once the warhead has fired", () => {
    const armed = {
      ...createGame(2026, seatsFor(2)),
      threat: TUNING.threat.max,
      warhead: { remaining: 1 },
    };
    const dead = idleRound(armed);

    expect(rejection(dead, { type: "rollMovement" })).toBe("game-over");
    expect(rejection(dead, { type: "endTurn" })).toBe("game-over");
  });
});
