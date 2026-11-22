/**
 * R6 — two racks of three, and a dropped item stays on the floor.
 *
 * The old rule destroyed the fourth draw (D5). Now the rack is split by lifetime:
 * consumables (`consumed`) and standing equipment (`permanent`) each hold three,
 * and a piece that does not fit is left on the node for anyone to take.
 */

import { describe, expect, it } from "vitest";
import { equipmentRule } from "../config/tuning";
import { EQUIPMENT, gearById } from "../content/gear";
import { acquireItem } from "./effects";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, GameState } from "./types";

const consumable = EQUIPMENT.filter((item) => item.lifetime === "consumed");
const standing = EQUIPMENT.filter((item) => item.lifetime === "permanent");

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code}`);
  return result.value;
}

function withRack(items: readonly string[]): GameState {
  const base = createGame(2026, seatsFor(2));
  return {
    ...base,
    phase: "action",
    players: { ...base.players, p1: { ...base.players.p1!, gear: [...items] } },
  };
}

describe("two racks, and drops stay on the node (R6)", () => {
  it("fills each rack independently", () => {
    const slot = equipmentRule().slots;
    const full = withRack([]);
    let next = full;
    for (const item of [...consumable.slice(0, slot), ...standing.slice(0, slot)]) {
      next = acquireItem(next, "p1", item.id).state;
    }

    const gear = next.players.p1!.gear;
    expect(gear.filter((id) => gearById(id).lifetime === "consumed")).toHaveLength(slot);
    expect(gear.filter((id) => gearById(id).lifetime === "permanent")).toHaveLength(slot);
  });

  it("leaves the overflow on the node instead of destroying it", () => {
    const slot = equipmentRule().slots;
    const full = withRack(consumable.slice(0, slot).map((item) => item.id));
    const extra = consumable[slot];
    if (!extra) throw new Error("not enough consumables in content to test the overflow");

    const acquired = acquireItem(full, "p1", extra.id);
    expect(acquired.state.players.p1?.gear).not.toContain(extra.id);
    expect(acquired.state.dropped).toContainEqual({ node: "outer-02", itemId: extra.id });
  });

  it("lets anyone standing there pick it up", () => {
    const slot = equipmentRule().slots;
    const extra = consumable[slot];
    if (!extra) throw new Error("not enough consumables in content to test the pickup");
    // One free slot: the drop only becomes takeable once the rack has room.
    const state = {
      ...withRack(consumable.slice(0, slot - 1).map((item) => item.id)),
      dropped: [{ node: "outer-02" as const, itemId: extra.id }],
    };

    const picked = apply(state, { type: "pickUp", itemId: extra.id });
    expect(picked.players.p1?.gear).toContain(extra.id);
    expect(picked.dropped).toHaveLength(0);
  });
});
