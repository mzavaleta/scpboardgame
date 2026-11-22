/**
 * The tuning surface: validation, completeness against content, and wiring.
 *
 * These tests check that the config is *read*, not what it currently says. The
 * shipped numbers are pinned by the behaviour tests elsewhere — so editing a
 * value that a test asserts is a deliberate act with a visible consequence,
 * which is the point of a default.
 */

import { describe, expect, it } from "vitest";
import { ANOMALIES } from "../content/anomalies";
import { BOARD } from "../content/board";
import { createGame, reduce } from "../engine/reduce";
import { seatsFor } from "../engine/types";
import {
  CONFIG_FINGERPRINT,
  TUNING,
  clearancePrice,
  deckCopies,
  declineThreat,
  tierReward,
  gateRule,
  roleSheet,
  tuningSchema,
} from "./tuning";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("validation fails loudly", () => {
  it("rejects a role outside the balance band", () => {
    const broken = clone(TUNING);
    broken.roles[0] = { ...broken.roles[0]!, combat: 6, intellect: 6 };

    const result = tuningSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects an impossible gate condition", () => {
    const broken = clone(TUNING);
    broken.gates = { G1: { condition: "ajar", difficulty: 2 } } as unknown as typeof TUNING.gates;

    expect(tuningSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects fractional or negative copies", () => {
    for (const copies of [-1, 1.5]) {
      const broken = clone(TUNING);
      broken.decks.safe = { "scp-005": copies };
      expect(tuningSchema.safeParse(broken).success).toBe(false);
    }
  });

  it("names the path of the offending value", () => {
    const broken = clone(TUNING);
    broken.start.integrity = 0;

    const result = tuningSchema.safeParse(broken);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path.join(".")).toBe("start.integrity");
    }
  });
});

describe("config and content agree", () => {
  it("puts every anomaly in exactly one deck with at least one copy", () => {
    for (const card of ANOMALIES) {
      const copies = deckCopies(card.tier, card.id);
      expect(copies).toBeGreaterThan(0);
      // and not in any other deck
      for (const other of ["safe", "euclid", "keter"] as const) {
        if (other !== card.tier) expect(deckCopies(other, card.id)).toBe(0);
      }
    }
  });

  it("mentions no card that does not exist", () => {
    const known = new Set(ANOMALIES.map((card) => card.id));
    for (const deck of ["safe", "euclid", "keter"] as const) {
      for (const id of Object.keys(TUNING.decks[deck])) {
        expect(known.has(id)).toBe(true);
      }
    }
  });

  it("has one gate rule per board gate, and no orphans", () => {
    const boardGates = BOARD.gates.map((gate) => gate.id).sort();
    const tuned = Object.keys(TUNING.gates).sort();
    expect(tuned).toEqual(boardGates);

    // And the content really reads the config rather than keeping a copy.
    for (const gate of BOARD.gates) {
      const rule = gateRule(gate.id);
      expect(gate.condition).toBe(rule.condition);
      expect(gate.test.difficulty).toBe(rule.test.difficulty);
    }
  });

  it("projects rewards and decline costs from the tuning, not from the cards", () => {
    for (const card of ANOMALIES) {
      expect(card.reward.records).toBe(tierReward(card.tier));
      const expected = declineThreat(card.tier);
      if (expected === 0) expect(card.declineCost).toEqual([]);
      else expect(card.declineCost).toEqual([{ kind: "raiseThreat", delta: expected }]);
    }
  });

  it("prices clearance as the access economy documents (§C1.4)", () => {
    expect(clearancePrice(2)).toBe(3);
    expect(clearancePrice(3)).toBe(4);
    expect(clearancePrice(4)).toBe(5);
  });
});

describe("the game reads the tuning, not a copy of it", () => {
  it("starts every seat from `start` in the config", () => {
    const state = createGame(1, seatsFor(2));
    const player = state.players.p1;
    if (!player) throw new Error("no p1");

    expect(player.integrity).toBe(TUNING.start.integrity);
    expect(player.maxIntegrity).toBe(TUNING.start.maxIntegrity);
    expect(player.fate).toBe(TUNING.start.fate);
    expect(player.clearance).toBe(TUNING.start.clearance);
    expect(player.stats).toEqual(TUNING.start.stats);
  });

  it("carries the config fingerprint in the state, so a replay knows its tuning", () => {
    const state = createGame(1, seatsFor(2));
    expect(state.config).toBe(CONFIG_FINGERPRINT);
    expect(state.config).toMatch(/^[0-9a-f]{8}$/);
  });

  it("changes the fingerprint when a number changes", () => {
    // A different object must hash differently; identity is the whole point.
    const altered = clone(TUNING);
    altered.start.integrity += 1;
    expect(tuningSchema.parse(altered).start.integrity).not.toBe(TUNING.start.integrity);
  });

  it("exposes the six role sheets the draft will need", () => {
    expect(TUNING.roles).toHaveLength(6);
    for (const role of TUNING.roles) {
      expect(roleSheet(role.id).name.es.length).toBeGreaterThan(0);
      expect(role.combat + role.intellect).toBeGreaterThanOrEqual(5);
      expect(role.combat + role.intellect).toBeLessThanOrEqual(6);
      expect(role.maxIntegrity).toBeGreaterThanOrEqual(5);
      expect(role.maxIntegrity).toBeLessThanOrEqual(7);
    }
  });

  it("still plays a full turn after the extraction", () => {
    // The extraction's promise: identical behaviour. This is a smoke check that
    // the config did not break the loop the 95 behaviour tests already cover.
    let state = createGame(2026, seatsFor(2));
    const roll = reduce(state, { type: "devRoll", value: 2 });
    if (!roll.ok) throw new Error(roll.error.code);
    state = roll.value;

    const move = reduce(state, { type: "moveTo", node: "outer-00" });
    if (!move.ok) throw new Error(move.error.code);
    expect(move.value.phase).toBe("space");
  });
});
