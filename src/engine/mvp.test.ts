/**
 * The MVP's behavioural contract: roles, the draft, directives, victory, compels,
 * Fate, escalation, the Assembly, hunters, gear, evidence and the actions the
 * content forced (§S1-S10, §C3-C5).
 *
 * One test per rule the document names — not one per function.
 */

import { describe, expect, it } from "vitest";
import { TUNING } from "../config/tuning";
import { MAIN_DIRECTIVES, directiveById } from "../content/directives";
import { ESCALATION } from "../content/escalation";
import { EQUIPMENT, ROLE_GEAR, gearById } from "../content/gear";
import { ASPECTS, ROLES } from "../content/roles";
import { distance } from "./board";
import { getNode } from "./board";
import { reachableEndpoints } from "./movement";
import { containmentRecords, acquireItem } from "./effects";
import { resolveOutcome } from "./directives";
import { moveHunters } from "./hunters";
import { project } from "./project";
import { createGame, reduce } from "./reduce";
import { seatsFor } from "./types";
import type { Action, GameState, SeatId } from "./types";

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`rejected ${action.type}: ${result.error.code} — ${result.error.message}`);
  return result.value;
}

const rejection = (state: GameState, action: Action): string => {
  const result = reduce(state, action);
  if (result.ok) throw new Error(`expected a rejection from ${action.type}`);
  return result.error.code;
};

/** The real table: the draft is part of setup (D7 keeps the fixture path flat). */
function draftTable(seed: number, players: 2 | 3): GameState {
  let state = createGame(seed, seatsFor(players), { draft: true });
  let guard = 0;
  while (state.draft && guard < 10) {
    state = apply(state, { type: "chooseRole", roleId: state.draft.options[0]! });
    guard += 1;
  }
  return state;
}

const at = (state: GameState, seat: SeatId, patch: Partial<GameState["players"][SeatId]>): GameState => ({
  ...state,
  players: { ...state.players, [seat]: { ...state.players[seat]!, ...patch } },
});

describe("roles and the draft (§S1, Q26)", () => {
  it("offers three options at two players and two at three", () => {
    expect(createGame(1, seatsFor(2), { draft: true }).draft?.options).toHaveLength(3);
    expect(createGame(1, seatsFor(3), { draft: true }).draft?.options).toHaveLength(2);
  });

  it("gates every other action until the seat chooses", () => {
    const state = createGame(1, seatsFor(2), { draft: true });
    expect(rejection(state, { type: "rollMovement" })).toBe("draft-pending");
  });

  it("gives the chosen role its stats, gear and public aspect", () => {
    const state = draftTable(11, 2);
    for (const seat of seatsFor(2)) {
      const player = state.players[seat]!;
      const role = ROLES.find((candidate) => candidate.id === player.roleId)!;
      expect(player.stats).toEqual(role.stats);
      expect(player.aspectId).toBe(role.aspectId);
      expect(player.gear).toEqual(role.startingGear);
      expect(player.mainDirectiveId).not.toBe("");
    }
    expect(state.players.p1?.roleId).not.toBe(state.players.p2?.roleId);
  });

  it("keeps every role inside the balance band and every aspect at three compels", () => {
    for (const role of ROLES) {
      const total = role.stats.combat + role.stats.intellect;
      expect(total).toBeGreaterThanOrEqual(5);
      expect(total).toBeLessThanOrEqual(6);
      expect(role.maxIntegrity).toBeGreaterThanOrEqual(5);
      expect(role.maxIntegrity).toBeLessThanOrEqual(7);
    }

    for (const aspect of ASPECTS) {
      expect(aspect.compels).toHaveLength(3);
      const costs = aspect.compels.filter((compel) =>
        compel.effect.some(
          (effect) =>
            (effect.kind === "modifyIntegrity" && effect.delta < 0) ||
            (effect.kind === "modifyRecords" && effect.delta < 0) ||
            effect.kind === "removeGear" ||
            effect.kind === "addTag",
        ),
      );
      expect(costs.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("directives and the safety valve (§S4, §S5, D19)", () => {
  it("deals one unique directive per seat", () => {
    const state = createGame(4, seatsFor(3));
    const ids = seatsFor(3).map((seat) => state.players[seat]!.mainDirectiveId);
    expect(new Set(ids).size).toBe(3);
  });

  it("never deals more breach seats than the table can hold", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      for (const players of [2, 3] as const) {
        const state = createGame(seed, seatsFor(players));
        const breach = seatsFor(players).filter(
          (seat) => directiveById(state.players[seat]!.mainDirectiveId).alignment === "breach",
        );
        expect(breach.length).toBeLessThanOrEqual(Math.floor(players / 2));
      }
    }
  });

  it("ships twelve directives: nine containment, three breach", () => {
    expect(MAIN_DIRECTIVES).toHaveLength(12);
    expect(MAIN_DIRECTIVES.filter((directive) => directive.alignment === "containment")).toHaveLength(9);
    expect(MAIN_DIRECTIVES.filter((directive) => directive.alignment === "breach")).toHaveLength(3);
    for (const directive of MAIN_DIRECTIVES) {
      if (directive.alignment === "breach") expect(directive.publicFootprint.length).toBeGreaterThan(0);
      else expect(directive.publicFootprint).toHaveLength(0);
    }
  });
});

describe("victory is explicit (§7c.3, D18, L15)", () => {
  it("rewards a directive whose condition holds, wherever the seat stands", () => {
    const base = createGame(1, seatsFor(2));
    const state = at(at({ ...base, outcome: null }, "p1", { node: "inner-02", mainDirectiveId: "m-untouched" }), "p2", {
      mainDirectiveId: "m-keter",
    });
    expect(resolveOutcome(state, "detonated")?.winners).toEqual(["p1"]);
  });

  it("rewards nobody whose condition does not hold", () => {
    const base = createGame(1, seatsFor(2));
    const state = at(at({ ...base, outcome: null }, "p1", { mainDirectiveId: "m-keter" }), "p2", {
      mainDirectiveId: "m-medic",
    });
    expect(resolveOutcome(state, "detonated")?.winners).toEqual([]);
  });

  it("rewards a breach seat only with its own intent footprint", () => {
    const base = createGame(1, seatsFor(2));
    const withFootprint = {
      ...at(at({ ...base, outcome: null }, "p1", { mainDirectiveId: "b-saboteur" }), "p2", { mainDirectiveId: "m-keter" }),
      evidence: [
        { class: "intent" as const, kind: "tamperedProtocol" as const, sourceSeat: "p1" as const, nodeId: "core-00", round: 2 },
      ],
    };
    expect(resolveOutcome(withFootprint, "detonated")?.winners).toEqual(["p1"]);

    const accidentOnly = {
      ...at(at({ ...base, outcome: null }, "p1", { mainDirectiveId: "b-saboteur" }), "p2", { mainDirectiveId: "m-keter" }),
      evidence: [
        { class: "accident" as const, kind: "uncontained" as const, sourceSeat: "p1" as const, nodeId: "core-00", round: 2 },
      ],
    };
    expect(resolveOutcome(accidentOnly, "detonated")?.winners).toEqual([]);
  });

  it("gives the capsule holder the ending, whatever their directive says", () => {
    const base = createGame(1, seatsFor(2));
    const state = {
      ...at(at({ ...base, outcome: null }, "p1", { mainDirectiveId: "m-keter" }), "p2", { mainDirectiveId: "m-keter" }),
      capsuleSeat: "p1" as const,
    };
    expect(resolveOutcome(state, "detonated")?.winners).toEqual(["p1"]);
  });

  it("leaves a downed capsule holder behind", () => {
    const base = createGame(1, seatsFor(2));
    const state = {
      ...at(
        at({ ...base, outcome: null }, "p1", { mainDirectiveId: "m-keter", downed: true }),
        "p2",
        { mainDirectiveId: "m-keter" },
      ),
      capsuleSeat: "p1" as const,
    };
    expect(resolveOutcome(state, "detonated")?.winners).toEqual([]);
  });
});

describe("compels and the Fate economy (§7b.3, §C3.5)", () => {
  function compelled(seed = 1): GameState {
    const base = createGame(seed, seatsFor(2));
    return {
      ...base,
      phase: "action",
      players: {
        ...base.players,
        p1: { ...base.players.p1!, fate: 1 },
        p2: { ...base.players.p2!, aspectId: "curious", records: 2, fate: 1 },
      },
    };
  }

  it("costs the invoker one Fate, pauses the turn, and pays the target on accept", () => {
    const state = apply(compelled(), { type: "compel", target: "p2", aspectId: "curious", compelIndex: 2 });

    expect(state.pendingCompel?.target).toBe("p2");
    expect(state.players.p1?.fate).toBe(0);
    expect(rejection(state, { type: "endTurn" })).toBe("pending-compel");

    const accepted = apply(state, { type: "respondCompel", accept: true });
    expect(accepted.pendingCompel).toBeNull();
    expect(accepted.players.p2?.records).toBe(3);
    // R5: the invoker's point moves to the target; nothing is created.
    expect(accepted.players.p2?.fate).toBe(2);
    expect(accepted.players.p1?.fate).toBe(0);
    expect(accepted.threat).toBe(1);
  });

  it("lets the target refuse by paying Fate, and traps one with none", () => {
    const state = apply(compelled(), { type: "compel", target: "p2", aspectId: "curious", compelIndex: 2 });
    const refused = apply(state, { type: "respondCompel", accept: false });
    expect(refused.players.p2?.fate).toBe(0);
    // R5: refusing hands the offered point back.
    expect(refused.players.p1?.fate).toBe(1);
    expect(refused.players.p2?.records).toBe(2);

    const broke = { ...state, players: { ...state.players, p2: { ...state.players.p2!, fate: 0 } } };
    expect(rejection(broke, { type: "respondCompel", accept: false })).toBe("no-fate");
  });

  it("spends the Ethics Waiver instead of Fate", () => {
    const state = apply(compelled(), { type: "compel", target: "p2", aspectId: "curious", compelIndex: 2 });
    const brokeWithWaiver = {
      ...state,
      players: { ...state.players, p2: { ...state.players.p2!, fate: 0, gear: ["ethics-waiver"] } },
    };
    const refused = apply(brokeWithWaiver, { type: "respondCompel", accept: false });
    expect(refused.players.p2?.gear).toEqual([]);
  });

  it("rejects self-compels, wrong aspects, unmet conditions and a second compel", () => {
    const state = compelled();
    expect(rejection(state, { type: "compel", target: "p1", aspectId: "curious", compelIndex: 2 })).toBe("invalid-target");
    expect(rejection(state, { type: "compel", target: "p2", aspectId: "reckless", compelIndex: 0 })).toBe("compel-unavailable");

    const poor = at(state, "p2", { records: 0 });
    expect(rejection(poor, { type: "compel", target: "p2", aspectId: "curious", compelIndex: 2 })).toBe("compel-unavailable");

    const once = at(
      apply(apply(state, { type: "compel", target: "p2", aspectId: "curious", compelIndex: 2 }), {
        type: "respondCompel",
        accept: true,
      }),
      "p1",
      { fate: 1 },
    );
    expect(rejection(once, { type: "compel", target: "p2", aspectId: "curious", compelIndex: 2 })).toBe("compel-unavailable");
  });

  it("earns Fate for the first descent into a deeper ring, and only once", () => {
    const base = createGame(2, seatsFor(2));
    // §14k.4: G1 is open, G4 is locked — the key buys the second descent.
    const onGate = { ...base, seat: "p1" as const, phase: "move" as const, roll: 1, players: { ...base.players, p1: { ...base.players.p1!, node: "outer-05" } } };

    const down = apply(onGate, { type: "moveTo", node: "middle-04" });
    expect(down.players.p1?.fate).toBe(1);
    expect(down.players.p1?.visitedRings).toContain("middle");

    const again = { ...down, phase: "move" as const, roll: 1, players: { ...down.players, p1: { ...down.players.p1!, node: "middle-07", tags: ["key"] } } };
    const deeper = apply(again, { type: "moveTo", node: "inner-06" });
    expect(deeper.players.p1?.fate).toBe(2);
  });

  it("caps Fate at three", () => {
    const base = createGame(2, seatsFor(2));
    const onGate = {
      ...base,
      seat: "p1" as const,
      phase: "move" as const,
      roll: 1,
      players: { ...base.players, p1: { ...base.players.p1!, node: "outer-05", clearance: 4, fate: 3 } },
    };
    expect(apply(onGate, { type: "moveTo", node: "middle-04" }).players.p1?.fate).toBe(3);
  });

  it("pays one Fate to re-roll the movement die", () => {
    const base = createGame(3, seatsFor(2));
    const rolling = { ...base, phase: "move" as const, roll: 2, players: { ...base.players, p1: { ...base.players.p1!, fate: 1 } } };
    const rerolled = apply(rolling, { type: "spendFateToReroll" });
    expect(rerolled.players.p1?.fate).toBe(0);
    expect(rerolled.roll).toBeGreaterThanOrEqual(1);
    expect(rerolled.roll).toBeLessThanOrEqual(6);
  });
});

describe("evidence is classed and public (§S6, §C2.3)", () => {
  it("classifies accidents and intent, and a breach leaves accident evidence", () => {
    let sawBreach = false;
    for (let seed = 1; seed <= 120 && !sawBreach; seed += 1) {
      const base = createGame(seed, seatsFor(2));
      const opened = apply(base, { type: "devEncounter", card: "scp-106" });
      const resolved = apply(opened, { type: "resolveAnomaly", choice: "contain" });
      const token = resolved.evidence.find((candidate) => candidate.sourceSeat === "p1");
      if (token) {
        expect(token.class).toBe("accident");
        expect(token.kind).toBe("uncontained");
        expect(resolved.players.p1?.fate).toBe(1);
        sawBreach = true;
      }
    }
    expect(sawBreach).toBe(true);
  });

  it("marks a tampered protocol as intent", () => {
    const base = createGame(1, seatsFor(2));
    const atCore = { ...base, phase: "action" as const, players: { ...base.players, p1: { ...base.players.p1!, node: "core-00" } } };
    const sabotaged = apply(atCore, { type: "sabotageProtocol" });
    const token = sabotaged.evidence.find((candidate) => candidate.kind === "tamperedProtocol");
    expect(token?.class).toBe("intent");
  });
});

describe("escalation and the Emergency Assembly (§C5)", () => {
  it("ships fourteen cards, two Assemblies, and both target classes", () => {
    expect(ESCALATION).toHaveLength(14);
    expect(ESCALATION.filter((card) => card.id.startsWith("e-assembly"))).toHaveLength(2);
    const facility = ESCALATION.filter((card) => card.target === "facility").length;
    expect(facility / ESCALATION.length).toBeGreaterThanOrEqual(0.4);
  });

  it("applies a drawn card: alarm cascade raises threat and spawns a hunter", () => {
    const base = createGame(1, seatsFor(2));
    const after = apply(base, { type: "devEscalation", card: "e-alarm-cascade" });
    expect(after.threat).toBe(1);
    expect(after.hunters.length).toBe(1);
  });

  it("seals a gate and keeps the track still when the table votes seal", () => {
    const base = createGame(1, seatsFor(2));
    const voting = apply(base, { type: "devEscalation", card: "e-assembly-1" });
    expect(voting.vote).not.toBeNull();

    const first = apply(voting, { type: "castVote", choice: "seal" });
    const done = apply(first, { type: "castVote", choice: "seal" });

    expect(done.vote).toBeNull();
    expect(done.threat).toBe(0);
    expect(Object.values(done.gates).filter((status) => status.reopen !== undefined).length).toBe(1);
  });

  it("advances the track by two on hold, and by one on a tie", () => {
    const base = createGame(1, seatsFor(2));
    const voting = apply(base, { type: "devEscalation", card: "e-assembly-1" });
    const held = apply(apply(voting, { type: "castVote", choice: "hold" }), { type: "castVote", choice: "hold" });
    expect(held.threat).toBe(2);

    const tied = apply(apply(voting, { type: "castVote", choice: "seal" }), { type: "castVote", choice: "hold" });
    expect(tied.threat).toBe(1);
  });
});

describe("projection keeps the motive private (§S5, §S7.3)", () => {
  it("gives a viewer their own directive and no other seat's", () => {
    const state = createGame(1, seatsFor(3));
    const view = project(state, "p1");

    expect(view.players.p1?.mainDirectiveId).toBe(state.players.p1?.mainDirectiveId);
    expect(view.players.p2?.mainDirectiveId).toBeNull();
    expect(view.players.p3?.previousDirectiveId).toBeNull();

    const bytes = JSON.stringify(view);
    expect(bytes.includes(state.players.p2!.mainDirectiveId)).toBe(false);
    expect(bytes.includes(state.players.p3!.mainDirectiveId)).toBe(false);
  });
});

describe("hunters move and bite (§7)", () => {
  it("takes one step toward the nearest seat", () => {
    const base = createGame(1, seatsFor(2));
    const state = {
      ...base,
      players: { ...base.players, p1: { ...base.players.p1!, node: "outer-03" }, p2: { ...base.players.p2!, node: "inner-00" } },
      hunters: [{ id: "h1", node: "outer-00" }],
    };
    const moved = moveHunters(state);
    expect(moved.state.hunters[0]?.node).not.toBe("outer-00");
    expect(distance(moved.state.hunters[0]!.node, "outer-03")).toBeLessThan(3);
  });

  it("costs Integrity on contact at the round boundary", () => {
    const base = createGame(1, seatsFor(2));
    const state = {
      ...base,
      seat: "p2" as SeatId,
      phase: "action" as const,
      hunters: [{ id: "h1", node: "outer-02" }],
    };
    const afterRound = apply(state, { type: "endTurn" });

    expect(afterRound.players.p1?.integrity).toBe(5);
    expect(afterRound.players.p2?.integrity).toBe(5);
  });
});

describe("gear: three slots, two lifetimes (§C5.4)", () => {
  it("caps the rack at three and discards the fourth draw", () => {
    let state = createGame(1, seatsFor(2));
    for (const id of ["i-telekill", "i-dosimeter", "i-radio", "i-vest"]) {
      state = acquireItem(state, "p1", id).state;
    }
    expect(state.players.p1?.gear).toHaveLength(3);
  });

  it("uses a consumed item and removes it", () => {
    const base = at(createGame(1, seatsFor(2)), "p1", { gear: ["i-medkit"], integrity: 3 });
    const used = apply({ ...base, phase: "action" }, { type: "useItem", itemId: "i-medkit" });
    expect(used.players.p1?.integrity).toBe(5);
    expect(used.players.p1?.gear).toEqual([]);
  });

  it("lets the vest raise the ceiling", () => {
    const after = acquireItem(createGame(1, seatsFor(2)), "p1", "i-vest").state;
    expect(after.players.p1?.maxIntegrity).toBe(TUNING.start.maxIntegrity + 1);
  });

  it("lets Cola be spent in the move phase", () => {
    const base = at(createGame(1, seatsFor(2)), "p1", { gear: ["i-cola"] });
    const used = apply({ ...base, phase: "move", roll: 2 }, { type: "useItem", itemId: "i-cola" });
    expect(used.roll).toBe(4);
    expect(used.players.p1?.gear).toEqual([]);
  });

  it("pays the Idol an extra Record for every containment", () => {
    const player = at(createGame(1, seatsFor(2)), "p1", { gear: ["i-idol"] }).players.p1!;
    expect(containmentRecords(player, "safe", 1)).toBe(2);
  });

  it("ships ten equipment items and five role items", () => {
    expect(EQUIPMENT).toHaveLength(10);
    expect(ROLE_GEAR).toHaveLength(5);
    for (const item of EQUIPMENT) expect(gearById(item.id).name.en.length).toBeGreaterThan(0);
  });
});

describe("the actions the content forced (§S9)", () => {
  it("seals a gate at its mouth, blocks the crossing, and leaves intent evidence", () => {
    const base = createGame(1, seatsFor(2));
    const atGate = { ...base, phase: "action" as const, players: { ...base.players, p1: { ...base.players.p1!, node: "outer-05" } } };

    const sealed = apply(atGate, { type: "sealGate", gateId: "G1" });
    expect(sealed.players.p1?.counters.sealedGates).toBe(1);
    expect(sealed.evidence.some((token) => token.kind === "sealedGate" && token.class === "intent")).toBe(true);

    const crossing = { ...sealed, phase: "move" as const, roll: 1 };
    expect(rejection(crossing, { type: "moveTo", node: "middle-04" })).toBe("blocked-by-gate");
  });

  it("rescues a downed ally on your space and counts it", () => {
    const base = createGame(1, seatsFor(2));
    const state = {
      ...base,
      phase: "action" as const,
      players: {
        ...base.players,
        p1: { ...base.players.p1!, node: "outer-02" },
        p2: { ...base.players.p2!, node: "outer-02", downed: true, integrity: 0, gear: ["sidearm"] },
      },
    };
    const rescued = apply(state, { type: "rescue", target: "p2" });
    expect(rescued.players.p2?.downed).toBe(false);
    expect(rescued.players.p2?.integrity).toBe(1);
    expect(rescued.players.p2?.gear).toEqual(["sidearm"]);
    expect(rescued.players.p1?.counters.rescues).toBe(1);
  });

  it("rests for one, or two at a medical bay, once per turn", () => {
    const base = createGame(1, seatsFor(2));
    const medical = at({ ...base, phase: "action" }, "p1", { node: "outer-06", integrity: 3 });
    const rested = apply(medical, { type: "rest" });
    expect(rested.players.p1?.integrity).toBe(5);
    expect(rejection(rested, { type: "rest" })).toBe("invalid-target");
  });

  it("draws a hazard after three stalled turns", () => {
    let state = createGame(4, seatsFor(2));

    const idleTurn = (input: GameState): GameState => {
      const started = apply(input, { type: "devRoll", value: 1 });
      const player = started.players[started.seat]!;
      const target = reachableEndpoints(player.node, 1).find((node) =>
        ["medical", "checkpoint", "entry", "supply", "terminal"].includes(getNode(node).kind),
      );
      if (!target) throw new Error(`no idle landing from ${player.node}`);
      const moved = apply(started, { type: "moveTo", node: target });
      return apply(moved, { type: "endTurn" });
    };

    let sawHazard = false;
    for (let step = 0; step < 12 && !sawHazard; step += 1) {
      if (state.vote) {
        for (const seat of seatsFor(2)) {
          if (!state.vote?.votes[seat]) state = apply(state, { type: "castVote", choice: "seal" });
        }
        continue;
      }
      try {
        state = idleTurn(state);
      } catch {
        break;
      }
      sawHazard = state.log.some((line) => line.includes("stalled three turns"));
    }

    expect(sawHazard).toBe(true);
  });
});
