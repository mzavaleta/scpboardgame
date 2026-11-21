/**
 * Condition evaluation (§S4 + §C4.7).
 *
 * The closed set that makes a digital FATE possible: every compel and directive
 * is a machine-checkable predicate over state the engine already tracks. If a
 * condition needed a new tracked value it would be a structural finding (C4.5),
 * not a wording problem.
 */

import { getNode, distance } from "./board";
import { anyoneHoldsIntent, evidenceClassCount, hasEvidence, othersWithIntentEvidence } from "./evidence";
import { gearMaxIntegrity } from "../content/gear";
import { playerAt, playersIn } from "./types";
import type { Condition, GameState, Player, RingId, SeatId } from "./types";

const MARKED_KINDS = new Set(["supply", "terminal", "lab", "cell", "alarm"]);

function isWounded(player: Player): boolean {
  return player.downed || player.integrity * 2 < player.maxIntegrity;
}

function hunterDistances(state: GameState, node: string): readonly number[] {
  return state.hunters.map((hunter) => distance(hunter.node, node));
}

export function evalCondition(
  state: GameState,
  seat: SeatId,
  condition: Condition,
  terminal?: "recontained" | "detonated",
): boolean {
  const player = playerAt(state.players, seat);
  const others = playersIn(state.players).filter((candidate) => candidate.seat !== seat);
  const node = getNode(player.node);

  switch (condition.kind) {
    case "always":
      return true;
    case "all":
      return condition.of.every((child) => evalCondition(state, seat, child, terminal));
    case "any":
      return condition.of.some((child) => evalCondition(state, seat, child, terminal));
    case "not":
      return !evalCondition(state, seat, condition.of, terminal);
    case "atNode":
      return player.node === condition.node;
    case "atNodeKind":
      return node.kind === condition.nodeKind;
    case "inRing":
      return node.ring === condition.ring;
    case "atMarkedNode":
      return MARKED_KINDS.has(node.kind);
    case "atCheckpoint":
      return node.kind === "checkpoint";
    case "clearanceAtLeast":
      return player.clearance >= condition.n;
    case "fateAtLeast":
      return player.fate >= condition.n;
    case "recordsAtLeast":
      return player.records >= condition.n;
    case "gearAtLeast":
      return player.gear.length >= condition.n;
    case "holdsGear":
      return player.gear.length > 0;
    case "integrityBelow":
      return player.integrity < condition.n;
    case "fullIntegrity":
      return player.integrity >= player.maxIntegrity && !player.downed;
    case "hasTag":
      return player.tags.includes(condition.tag);
    case "hasAspect":
      return player.aspectId === condition.aspectId;
    case "hasEvidence":
      return hasEvidence(state, seat, condition.evidence);
    case "evidenceCount":
      return evidenceClassCount(state, seat, condition.evidenceClass) >= condition.atLeast;
    case "othersWithIntentEvidence":
      return othersWithIntentEvidence(state, seat) >= condition.atLeast;
    case "anyoneHoldsIntent":
      return anyoneHoldsIntent(state, ["sealedGate", "tamperedProtocol"]);
    case "containments":
      return player.counters.containments >= condition.atLeast;
    case "containmentsByTier": {
      const key = condition.tier === "safe" ? "containmentsSafe" : condition.tier === "euclid" ? "containmentsEuclid" : "containmentsKeter";
      return player.counters[key] >= condition.atLeast;
    }
    case "rescues":
      return player.counters.rescues >= condition.atLeast;
    case "sealedGates":
      return player.counters.sealedGates >= condition.atLeast;
    case "noGateFailures":
      return player.counters.gateFailures === 0;
    case "visitedRings":
      return player.visitedRings.length >= condition.atLeast;
    case "protocolSteps":
      return state.protocolSteps >= condition.atLeast;
    case "completedFinalProtocolStep":
      return player.counters.protocolFinishers >= 1;
    case "allLivingAtCore":
      return playersIn(state.players)
        .filter((candidate) => !candidate.downed)
        .every((candidate) => candidate.node === "core-00");
    case "anySeatDowned":
      return playersIn(state.players).some((candidate) => candidate.downed);
    case "warheadArmed":
      return state.warhead !== null;
    case "terminalIs":
      return (terminal ?? state.outcome?.terminal) === condition.terminal;
    case "threatAtLeast":
      return state.threat >= condition.n;
    case "hunterWithin":
      return hunterDistances(state, player.node).some((steps) => steps <= condition.steps);
    case "hunterInRing":
      return state.hunters.some((hunter) => getNode(hunter.node).ring === condition.ring);
    case "hunterSharesRing":
      return state.hunters.some((hunter) => getNode(hunter.node).ring === node.ring);
    case "allyWounded":
      return others.some(isWounded);
    case "allyDownedOnNode":
      return others.some((candidate) => candidate.downed && candidate.node === player.node);
    case "adjacentAllyWounded":
      return others.some((candidate) => isWounded(candidate) && distance(candidate.node, player.node) <= 1);
    case "declinedThisTurn":
      return state.turnEvents.some((event) => event.seat === seat && event.event === "declined");
    case "containedThisTurn":
      return state.turnEvents.some((event) => event.seat === seat && event.event === "contained");
    case "gainedGearThisTurn":
      return state.turnEvents.some((event) => event.seat === seat && event.event === "gainedGear");
    case "startedContainmentThisTurn":
      return state.turnEvents.some((event) => event.seat === seat && event.event === "startedContainment");
    case "inEncounter":
      return state.seat === seat && state.encounter !== null;
    case "activeSeat":
      return state.seat === seat;
    default: {
      const never: never = condition;
      throw new Error(`unhandled condition ${JSON.stringify(never)}`);
    }
  }
}

/** How much extra maximum Integrity the gear is adding right now (vest bookkeeping). */
export function gearIntegrityBonus(gear: readonly string[]): number {
  return gearMaxIntegrity(gear);
}

export function ringOfNode(nodeId: string): RingId {
  return getNode(nodeId).ring;
}
