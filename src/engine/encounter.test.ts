/**
 * M2: the encounter pipeline (§S2 `space`, §C2, §5) and clearance at gates (§14f).
 *
 * The rule under test is the tier table, not the cards: a card declares a
 * difficulty and four payloads, and this file proves the table maps a shift to
 * the right payload every time.
 */

import { describe, expect, it } from "vitest";
import { ANOMALIES, anomalyById } from "../content/anomalies";
import { ARRIVAL_NODE } from "../content/board";
import { gatesAlong, distance, getNode } from "./board";
import { deckForNode, tierOf } from "./encounter";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, GameState, Outcome } from "./types";

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

/** A state parked in an encounter, so resolution can be tested without walking. */
function facing(seed: number, cardId: string): GameState {
  return {
    ...createGame(seed, seatsFor(2)),
    phase: "space" as const,
    encounter: { card: cardId, node: "outer-00" },
  };
}

/**
 * Find a seed whose 4dF lands on `outcome` for a card. The card used is SCP-106
 * (Combat 4): against the placeholder Combat 3 it spans all five tiers, which no
 * Safe card can (difficulty ≤ stat + 1 in the outer ring by design).
 */
function seedWith(outcome: Outcome, cardId = "scp-106"): number {
  for (let seed = 1; seed <= 400; seed += 1) {
    const after = apply(facing(seed, cardId), { type: "resolveAnomaly", choice: "contain" });
    if (after.lastTest?.outcome === outcome) return seed;
  }
  throw new Error(`no seed produced ${outcome} for ${cardId}`);
}

describe("the tier table", () => {
  it("maps every shift to one outcome, with no gaps and no overlaps", () => {
    expect(tierOf(4)).toBe("clean");
    expect(tierOf(3)).toBe("clean");
    expect(tierOf(2)).toBe("success");
    expect(tierOf(1)).toBe("success");
    expect(tierOf(0)).toBe("collateral");
    expect(tierOf(-1)).toBe("failure");
    expect(tierOf(-2)).toBe("failure");
    expect(tierOf(-3)).toBe("breach");
    expect(tierOf(-4)).toBe("breach");
  });
});

describe("where a card comes from", () => {
  it("draws Safe on the outer lab ring, Euclid in the middle, Keter in the cells", () => {
    expect(deckForNode("outer-00")).toBe("safe");
    expect(deckForNode("middle-00")).toBe("euclid");
    expect(deckForNode("middle-01")).toBe("keter");
    expect(deckForNode("inner-00")).toBe("keter");
  });

  it("draws nothing at facilities, the arrival gate or the core", () => {
    expect(deckForNode(ARRIVAL_NODE)).toBeNull();
    expect(deckForNode("outer-05")).toBeNull();
    expect(deckForNode("core-00")).toBeNull();
  });
});

describe("landing on a space that has a card", () => {
  it("draws from the right pile and waits for a decision", () => {
    const rolled = apply(createGame(2026, seatsFor(2)), { type: "devRoll", value: 2 });
    const landed = apply(rolled, { type: "moveTo", node: "outer-00" });

    expect(landed.phase).toBe("space");
    expect(landed.encounter).not.toBeNull();
    expect(landed.decks.safe).toHaveLength(ANOMALIES.filter((a) => a.tier === "safe").length - 1);

    const card = anomalyById(landed.encounter?.card as string);
    expect(card.tier).toBe("safe");
  });

  it("leaves the space phase behind when the space has nothing", () => {
    const rolled = apply(createGame(2026, seatsFor(2)), { type: "devRoll", value: 4 });
    const landed = apply(rolled, { type: "moveTo", node: "outer-06" });

    expect(landed.phase).toBe("action");
    expect(landed.encounter).toBeNull();
  });

  it("refuses to resolve an encounter that is not happening", () => {
    const state = createGame(2026, seatsFor(2));
    expect(rejection(state, { type: "resolveAnomaly", choice: "contain" })).toBe("wrong-phase");
  });
});

describe("containing", () => {
  it("pays Records on a clean or plain success and never costs Integrity", () => {
    for (const outcome of ["clean", "success"] as const) {
      const seed = seedWith(outcome);
      const card = anomalyById("scp-106");
      const after = apply(facing(seed, "scp-106"), { type: "resolveAnomaly", choice: "contain" });

      expect(after.players.p1?.records).toBe(card.reward.records);
      expect(after.players.p1?.integrity).toBe(6);
    }
  });

  it("pays Records and the collateral cost at shift 0", () => {
    const seed = seedWith("collateral");
    const card = anomalyById("scp-106");
    const after = apply(facing(seed, "scp-106"), { type: "resolveAnomaly", choice: "contain" });

    expect(after.players.p1?.records).toBe(card.reward.records);
    expect(after.players.p1?.integrity).toBe(6 - 2);
    expect(after.lastTest?.shift).toBe(0);
  });

  it("pays nothing on a failure", () => {
    const seed = seedWith("failure");
    const after = apply(facing(seed, "scp-106"), { type: "resolveAnomaly", choice: "contain" });

    expect(after.players.p1?.records).toBe(0);
    expect(after.players.p1?.integrity).toBeLessThan(6);
  });

  it("pays nothing, hurts, and leaves accident evidence on a breach", () => {
    const seed = seedWith("breach");
    const after = apply(facing(seed, "scp-106"), { type: "resolveAnomaly", choice: "contain" });

    expect(after.players.p1?.records).toBe(0);
    expect(after.players.p1?.evidence.accident).toBe(1);
    expect(after.players.p1?.evidence.intent).toBe(0);
  });

  it("always closes the encounter and hands the turn to the action phase", () => {
    for (const outcome of ["clean", "success", "collateral", "failure", "breach"] as const) {
      const after = apply(facing(seedWith(outcome), "scp-106"), {
        type: "resolveAnomaly",
        choice: "contain",
      });
      expect(after.phase).toBe("action");
      expect(after.encounter).toBeNull();
    }
  });
});

describe("declining", () => {
  it("is free on a Safe card", () => {
    const after = apply(facing(11, "scp-005"), { type: "resolveAnomaly", choice: "decline" });

    expect(after.threat).toBe(0);
    expect(after.players.p1?.integrity).toBe(6);
    expect(after.encounter).toBeNull();
    expect(after.phase).toBe("action");
  });

  it("raises Threat on a real anomaly — walking away is not free", () => {
    const after = apply(facing(11, "scp-106"), { type: "resolveAnomaly", choice: "decline" });

    expect(after.threat).toBe(1);
    expect(after.players.p1?.records).toBe(0);
  });
});

describe("going down", () => {
  it("clamps Integrity at 0 and marks the seat down", () => {
    const state = facing(seedWith("breach"), "scp-106");
    const weakened = {
      ...state,
      players: { ...state.players, p1: { ...state.players.p1!, integrity: 1 } },
    };

    const after = apply(weakened, { type: "resolveAnomaly", choice: "contain" });

    expect(after.players.p1?.integrity).toBe(0);
    expect(after.players.p1?.downed).toBe(true);
  });

  it("cannot roll while down", () => {
    const state = {
      ...createGame(3, seatsFor(2)),
      players: { ...createGame(3, seatsFor(2)).players },
    };
    const down = {
      ...state,
      players: { ...state.players, p1: { ...state.players.p1!, integrity: 0, downed: true } },
    };

    expect(rejection(down, { type: "rollMovement" })).toBe("downed");
  });

  it("respawning returns you to the arrival gate at full Integrity and closes the turn", () => {
    const base = createGame(3, seatsFor(2));
    const down = {
      ...base,
      players: {
        ...base.players,
        p1: { ...base.players.p1!, integrity: 0, downed: true, node: "middle-04" },
      },
    };

    const after = apply(down, { type: "respawn" });

    expect(after.players.p1?.node).toBe(ARRIVAL_NODE);
    expect(after.players.p1?.integrity).toBe(6);
    expect(after.players.p1?.downed).toBe(false);
    expect(after.phase).toBe("action");
  });

  it("lets a downed seat skip its turn instead of being stuck", () => {
    const base = createGame(3, seatsFor(2));
    const down = {
      ...base,
      players: { ...base.players, p1: { ...base.players.p1!, integrity: 0, downed: true } },
    };

    const after = apply(down, { type: "endTurn" });
    expect(after.seat).toBe("p2");
  });
});

describe("gates", () => {
  it("finds the gate a multi-edge route cannot avoid", () => {
    // The old adjacency check could not see this: arrival -> middle-04 is four
    // edges, and G1 sits in the middle of them (§14f).
    expect(distance(ARRIVAL_NODE, "middle-04")).toBe(4);
    expect(gatesAlong(ARRIVAL_NODE, "middle-04", 4).map((gate) => gate.id)).toEqual(["G1"]);
  });

  it("finds no gate when the route stays inside one ring", () => {
    expect(gatesAlong(ARRIVAL_NODE, "outer-06", 4)).toEqual([]);
  });

  it("crosses freely on clearance", () => {
    const base = createGame(2026, seatsFor(2));
    const cleared = {
      ...base,
      players: { ...base.players, p1: { ...base.players.p1!, clearance: 2 } },
    };

    const rolled = apply(cleared, { type: "devRoll", value: 4 });
    const landed = apply(rolled, { type: "moveTo", node: "middle-04" });

    expect(landed.players.p1?.node).toBe("middle-04");
    expect(landed.log.join("\n")).toMatch(/crossed G1 on clearance 2/);
  });

  it("uses the key tag to bypass a gate, and spends it", () => {
    const base = createGame(2026, seatsFor(2));
    const keyed = {
      ...base,
      players: { ...base.players, p1: { ...base.players.p1!, tags: ["key"] } },
    };

    const rolled = apply(keyed, { type: "devRoll", value: 4 });
    const landed = apply(rolled, { type: "moveTo", node: "middle-04" });

    expect(landed.players.p1?.node).toBe("middle-04");
    expect(landed.players.p1?.tags).toEqual([]);
  });

  it("holds the gate when the check fails, and the roll is spent", () => {
    // Without clearance the gate is a test; whichever way it falls, the two
    // branches must agree with the logged shift.
    let sawFail = false;
    let sawPass = false;

    for (let seed = 1; seed <= 40 && !(sawFail && sawPass); seed += 1) {
      const base = createGame(seed, seatsFor(2));
      const rolled = apply(base, { type: "devRoll", value: 4 });
      const landed = apply(rolled, { type: "moveTo", node: "middle-04" });
      const shift = landed.lastTest?.shift as number;

      if (shift >= 0) {
        sawPass = true;
        expect(landed.players.p1?.node).toBe("middle-04");
      } else {
        sawFail = true;
        expect(landed.players.p1?.node).toBe(ARRIVAL_NODE);
        expect(landed.players.p1?.evidence.accident).toBe(1);
        expect(landed.phase).toBe("action");
      }
    }

    expect(sawFail && sawPass).toBe(true);
  });
});

describe("the deck as content", () => {
  it("has 20 cards split 6 / 8 / 6", () => {
    expect(ANOMALIES).toHaveLength(20);
    expect(ANOMALIES.filter((a) => a.tier === "safe")).toHaveLength(6);
    expect(ANOMALIES.filter((a) => a.tier === "euclid")).toHaveLength(8);
    expect(ANOMALIES.filter((a) => a.tier === "keter")).toHaveLength(6);
  });

  it("keeps every difficulty inside its band", () => {
    const bands = { safe: [0, 1], euclid: [2, 3], keter: [4, 5] } as const;
    for (const card of ANOMALIES) {
      const [low, high] = bands[card.tier];
      expect(card.test.difficulty).toBeGreaterThanOrEqual(low);
      expect(card.test.difficulty).toBeLessThanOrEqual(high);
    }
  });

  it("pays 1 / 2 / 3 Records and always allows leaving", () => {
    for (const card of ANOMALIES) {
      expect(card.reward.records).toBe(card.tier === "safe" ? 1 : card.tier === "euclid" ? 2 : 3);
      expect(card.mayLeave).toBe(true);
    }
  });

  it("carries a slug and a licence on every card (authors are tracked debt)", () => {
    for (const card of ANOMALIES) {
      expect(card.attribution.slug).toMatch(/^scp-\d{3,4}$/);
      expect(card.attribution.licence).toBe("CC BY-SA 3.0");
      expect(card.name.es.length).toBeGreaterThan(0);
      expect(card.text.es.length).toBeGreaterThan(0);
    }
  });

  it("uses only effects that exist in the closed vocabulary", () => {
    const known = new Set([
      "modifyIntegrity",
      "modifyMaxIntegrity",
      "modifyRecords",
      "setRecords",
      "grantFate",
      "raiseThreat",
      "setClearance",
      "addTag",
      "spawnHunter",
      "drawCard",
      "removeGear",
      "placeEvidence",
    ]);

    for (const card of ANOMALIES) {
      for (const effect of [...card.collateral, ...card.failure, ...card.breach, ...card.declineCost]) {
        expect(known.has(effect.kind)).toBe(true);
      }
    }
  });

  it("never puts a Keter card on an outer lab node", () => {
    expect(getNode("outer-00").kind).toBe("lab");
    expect(deckForNode("outer-00")).toBe("safe");
  });
});
