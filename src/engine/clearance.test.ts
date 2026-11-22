/**
 * M3a: Records buy clearance at a checkpoint (§C1.4).
 *
 * Before this milestone Records had no sink: every gate was a pure `4dF`
 * gamble and the middle ring was locked rather than earned. This file pins the
 * purchase rule and the loop that makes it matter — pay, then cross free.
 */

import { describe, expect, it } from "vitest";
import { clearancePrice } from "../config/tuning";
import { gatesAlong } from "./board";
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

/** A seat parked on a checkpoint in the action phase, so no walking is needed. */
function atCheckpoint(options: { records: number; clearance?: 1 | 2 | 3 | 4 }): GameState {
  const base = createGame(2026, seatsFor(2));
  return {
    ...base,
    phase: "action",
    players: {
      ...base.players,
      p1: {
        ...base.players.p1!,
        node: "outer-05",
        records: options.records,
        clearance: options.clearance ?? 1,
      },
    },
  };
}

describe("buying clearance at a checkpoint", () => {
  it("trades Records for the next level and logs the exchange", () => {
    const bought = apply(atCheckpoint({ records: clearancePrice(2) }), {
      type: "attemptClearance",
      level: 2,
    });

    expect(bought.players.p1?.clearance).toBe(2);
    expect(bought.players.p1?.records).toBe(0);
    expect(bought.log.join("\n")).toMatch(/clearance 1 → 2/);
  });

  it("charges the price the tuning file states", () => {
    for (const level of [2, 3, 4] as const) {
      const price = clearancePrice(level);
      const bought = apply(atCheckpoint({ records: price, clearance: (level - 1) as 1 | 2 | 3 }), {
        type: "attemptClearance",
        level,
      });
      expect(bought.players.p1?.records).toBe(0);
      expect(bought.players.p1?.clearance).toBe(level);
    }
  });

  it("rejects the purchase away from a checkpoint", () => {
    const base = atCheckpoint({ records: 10 });
    const lab = {
      ...base,
      players: { ...base.players, p1: { ...base.players.p1!, node: "outer-00" } },
    };

    expect(rejection(lab, { type: "attemptClearance", level: 2 })).toBe("no-checkpoint");
  });

  it("rejects an unaffordable purchase and leaves the Records alone", () => {
    const state = atCheckpoint({ records: clearancePrice(2) - 1 });
    expect(rejection(state, { type: "attemptClearance", level: 2 })).toBe("not-enough-records");
    expect(state.players.p1?.records).toBe(clearancePrice(2) - 1);
  });

  it("rejects skipping a level", () => {
    const state = atCheckpoint({ records: 20 });
    expect(rejection(state, { type: "attemptClearance", level: 3 })).toBe("clearance-order");
  });

  it("rejects buying a level you already hold", () => {
    const state = atCheckpoint({ records: 20, clearance: 2 });
    expect(rejection(state, { type: "attemptClearance", level: 2 })).toBe("clearance-order");
  });

  it("rejects the purchase outside the action phase", () => {
    const state = { ...atCheckpoint({ records: 10 }), phase: "roll" as const };
    expect(rejection(state, { type: "attemptClearance", level: 2 })).toBe("wrong-phase");
  });

  it("rejects a downed seat", () => {
    const base = atCheckpoint({ records: 10 });
    const downed = {
      ...base,
      players: { ...base.players, p1: { ...base.players.p1!, downed: true } },
    };

    expect(rejection(downed, { type: "attemptClearance", level: 2 })).toBe("downed");
  });
});

describe("the loop M3a exists for", () => {
  it("no longer buys passage: clearance 4 still cannot open a locked gate", () => {
    // §14k.4 deleted the toll. Buying clearance is administrative rank now; the
    // door has a condition, and rank is not a key.
    const base = createGame(2026, seatsFor(2));
    const rich = {
      ...base,
      phase: "move" as const,
      roll: 1,
      players: { ...base.players, p1: { ...base.players.p1!, node: "outer-10", clearance: 4 } },
    };

    const landed = apply(rich, { type: "moveTo", node: "middle-08" });

    expect(gatesAlong("outer-10", "middle-08", 1).map((gate) => gate.id)).toEqual(["G2"]);
    // Rank is not a key: a test was rolled at the lock either way.
    expect(landed.lastTest).not.toBeNull();
    expect(landed.log.join("\n")).toContain("lock at G2");
  });

  it("earns the Records by containing, then spends them on the same visit", () => {
    // A full loop in one test: contain a Euclid anomaly for 2 Records, walk to a
    // checkpoint, pay, and read the clearance back. The seat is placed rather
    // than walked because movement is already covered in `movement`/`encounter`.
    const base = createGame(2026, seatsFor(2));
    const withRecords = {
      ...base,
      phase: "action" as const,
      players: { ...base.players, p1: { ...base.players.p1!, node: "outer-05", records: 2 } },
    };

    expect(rejection(withRecords, { type: "attemptClearance", level: 2 })).toBe("not-enough-records");

    const rich = {
      ...withRecords,
      players: { ...withRecords.players, p1: { ...withRecords.players.p1!, records: 3 } },
    };
    const bought = apply(rich, { type: "attemptClearance", level: 2 });

    expect(bought.players.p1?.clearance).toBe(2);
    expect(bought.players.p1?.records).toBe(0);
  });
});
