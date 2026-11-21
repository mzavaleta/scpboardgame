/**
 * The effect interpreter (§S4).
 *
 * Cards, compels, escalation and directives are data; this is the only code that
 * changes the world on their behalf. Two rules keep it honest:
 *
 * 1. **Every effect is a member of the closed union.** A card cannot invent one,
 *    because the type would not compile — the "content must fit the mechanics"
 *    filter enforced by the compiler instead of by taste.
 * 2. **A substitution is never silent.** Anything that resolves into real state
 *    still writes a note into the public log, so inert debt is visible.
 */

import { BOARD } from "../content/board";
import { EQUIPMENT, gearById, gearExtraRecords, gearMaxIntegrity } from "../content/gear";
import { roleById } from "../content/roles";
import { equipmentRule, fateRule, threatRule, TUNING } from "../config/tuning";
import { distance, gateBetween, getNode, neighborsOf, ringDepth } from "./board";
import { addEvidence } from "./evidence";
import { deckForNode, drawAnomaly, pickWeighted } from "./encounter";
import { createVote, nearestGate, pickEscalation } from "./escalation";
import { nextInt } from "./rng";
import { playerAt, playersIn } from "./types";
import type { DeckId, Effect, EvidenceKind, GameState, ItemId, NodeId, Player, RingId, SeatId } from "./types";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export type EffectsResult = {
  readonly state: GameState;
  readonly notes: readonly string[];
};

/** Base sheet + gear = the ceiling. Called after any change to the rack. */
function withGearCeiling(player: Player): Player {
  const base = player.roleId ? roleById(player.roleId).maxIntegrity : TUNING.start.maxIntegrity;
  const maxIntegrity = Math.max(1, base + gearMaxIntegrity(player.gear));
  return { ...player, maxIntegrity, integrity: Math.min(player.integrity, maxIntegrity) };
}

function replacePlayer(state: GameState, player: Player): GameState {
  return { ...state, players: { ...state.players, [player.seat]: player } };
}

function spawnAt(state: GameState, ring: RingId): { state: GameState; node: NodeId } {
  const candidates = BOARD.nodes
    .filter((node) => node.ring === ring)
    .map((node) => node.id)
    .sort();
  if (candidates.length === 0) return { state, node: state.hunters[0]?.node ?? "outer-02" };
  const [index, rng] = nextInt(state.rng, 0, candidates.length - 1);
  return { state: { ...state, rng }, node: candidates[index] as string };
}

function addHunter(state: GameState, node: NodeId): GameState {
  return {
    ...state,
    hunters: [...state.hunters, { id: `h${state.hunters.length + 1}`, node }],
  };
}

/** One step toward a node, **never across a gate** (§C3.7, §C4.5). */
function stepWithoutGate(from: string, to: string): string {
  if (from === to) return from;
  const candidates = [...neighborsOf(from)]
    .filter((neighbour) => gateBetween(from, neighbour) === undefined)
    .sort();
  let best = from;
  let bestDistance = distance(from, to);
  for (const candidate of candidates) {
    const steps = distance(candidate, to);
    if (steps < bestDistance) {
      bestDistance = steps;
      best = candidate;
    }
  }
  return best;
}

function forceTargetOf(state: GameState, seat: SeatId, toward: Effect & { kind: "forceMove" }): NodeId | null {
  const player = playerAt(state.players, seat);
  const others = playersIn(state.players).filter((candidate) => candidate.seat !== seat);

  if (toward.toward === "hunter") {
    if (state.hunters.length === 0) return null;
    return [...state.hunters].sort((a, b) => distance(a.node, player.node) - distance(b.node, player.node))[0]?.node ?? null;
  }

  if (toward.toward === "anomalyNode") {
    const candidates = BOARD.nodes.filter((node) => node.kind === "lab" || node.kind === "cell");
    return (
      [...candidates].sort((a, b) => distance(a.id, player.node) - distance(b.id, player.node))[0]?.id ?? null
    );
  }

  const wounded = others
    .filter((candidate) => (toward.toward === "downedAlly" ? candidate.downed : candidate.downed || candidate.integrity * 2 < candidate.maxIntegrity))
    .sort((a, b) => distance(a.node, player.node) - distance(b.node, player.node));
  return wounded[0]?.node ?? null;
}

/** Add an item through the rack cap; a full rack discards the new draw (debt D5). */
export function acquireItem(state: GameState, seat: SeatId, itemId: ItemId): EffectsResult {
  let player = playerAt(state.players, seat);
  const item = gearById(itemId);

  if (player.gear.length >= equipmentRule().slots) {
    return { state, notes: [`${seat}'s rack is full — ${item.name.en} is left behind.`] };
  }

  player = withGearCeiling({ ...player, gear: [...player.gear, itemId] });
  let next = replacePlayer(state, player);
  const notes: string[] = [`${seat} takes ${item.name.en}.`];

  if (item.effects.length > 0) {
    const applied = applyEffects(next, seat, item.effects);
    next = applied.state;
    notes.push(...applied.notes);
  }

  next = {
    ...next,
    turnEvents: [...next.turnEvents, { seat, event: "gainedGear" }],
  };

  return { state: next, notes };
}

function applyDraw(
  state: GameState,
  seat: SeatId,
  deck: Effect & { kind: "drawCard" },
): EffectsResult {
  if (deck.deck === "equipment") {
    let next = state;
    const notes: string[] = [];
    for (let i = 0; i < deck.count; i += 1) {
      const { picked, rng } = pickWeighted(next.rng, EQUIPMENT, () => 1);
      next = { ...next, rng };
      if (!picked) continue;
      const acquired = acquireItem(next, seat, picked.id);
      next = acquired.state;
      notes.push(...acquired.notes);
    }
    return { state: next, notes };
  }

  if (deck.deck === "escalation") {
    let next = state;
    const notes: string[] = [];
    for (let i = 0; i < deck.count; i += 1) {
      const picked = pickEscalation(next);
      next = picked.state;
      if (!picked.card) continue;
      notes.push(`${picked.card.name.en} (${picked.card.target}).`);
      if (picked.card.effects.some((effect) => effect.kind === "openVote")) {
        const vote = createVote(next, seat);
        next = vote.state;
        notes.push(...vote.notes);
        continue;
      }
      const applied = applyEffects(next, seat, picked.card.effects);
      next = applied.state;
      notes.push(...applied.notes);
    }
    return { state: next, notes };
  }

  let next = state;
  const notes: string[] = [];
  for (let i = 0; i < deck.count; i += 1) {
    const player = playerAt(next.players, seat);
    const tier: DeckId =
      deck.deck === "anomaly" ? deckForNode(player.node) ?? "safe" : deck.deck;
    const drawn = drawAnomaly(next, tier);
    next = drawn.state;
    if (!drawn.card) continue;
    notes.push(`an anomaly surfaces: ${drawn.card}.`);
    next = { ...next, phase: "space", encounter: { card: drawn.card, node: player.node } };
  }
  return { state: next, notes };
}

/** Apply a list of effects to `seat`, returning new state and the lines to log. */
export function applyEffects(
  state: GameState,
  seat: SeatId,
  effects: readonly Effect[],
): EffectsResult {
  let next = state;
  let player: Player = playerAt(state.players, seat);
  const notes: string[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "modifyIntegrity": {
        const integrity = clamp(player.integrity + effect.delta, 0, player.maxIntegrity);
        const downed = player.downed || integrity === 0;
        player = { ...player, integrity, downed };
        notes.push(`${sign(effect.delta)} Integrity`);
        break;
      }

      case "modifyMaxIntegrity": {
        const maxIntegrity = Math.max(1, player.maxIntegrity + effect.delta);
        const integrity = Math.min(player.integrity, maxIntegrity);
        player = { ...player, maxIntegrity, integrity, downed: integrity === 0 };
        notes.push(`${sign(effect.delta)} max Integrity`);
        break;
      }

      case "modifyRecords": {
        player = { ...player, records: Math.max(0, player.records + effect.delta) };
        notes.push(`${sign(effect.delta)} Record${Math.abs(effect.delta) === 1 ? "" : "s"}`);
        break;
      }

      case "setRecords": {
        player = { ...player, records: Math.max(0, effect.value) };
        notes.push(`Records set to ${Math.max(0, effect.value)}`);
        break;
      }

      case "grantFate": {
        player = { ...player, fate: clamp(player.fate + effect.delta, 0, fateRule().cap) };
        notes.push(`${sign(effect.delta)} Fate`);
        break;
      }

      case "raiseThreat": {
        const threat = clamp(next.threat + effect.delta, 0, threatRule().max);
        next = { ...next, threat };
        notes.push(`Threat ${sign(effect.delta)} → ${threat}`);
        break;
      }

      case "setClearance": {
        player = { ...player, clearance: clamp(effect.level, 1, 4) };
        notes.push(`Clearance ${player.clearance}`);
        break;
      }

      case "addTag": {
        if (!player.tags.includes(effect.tag)) {
          player = { ...player, tags: [...player.tags, effect.tag] };
          notes.push(`gain tag "${effect.tag}"`);
        }
        break;
      }

      case "spawnHunter": {
        for (let i = 0; i < effect.count; i += 1) next = addHunter(next, player.node);
        notes.push(`${effect.count} hunter${effect.count === 1 ? "" : "s"} at ${getNode(player.node).name.en}`);
        break;
      }

      case "spawnHunterAtRing": {
        for (let i = 0; i < effect.count; i += 1) {
          const spawned = spawnAt(next, effect.ring);
          next = addHunter(spawned.state, spawned.node);
        }
        notes.push(`${effect.count} hunter${effect.count === 1 ? "" : "s"} in the ${effect.ring} ring`);
        break;
      }

      case "moveHunter": {
        const seats = playersIn(next.players);
        const hunters = next.hunters.map((hunter) => {
          const target = [...seats].sort(
            (a, b) => distance(a.node, hunter.node) - distance(b.node, hunter.node),
          )[0];
          if (!target) return hunter;
          return { ...hunter, node: stepTowardAllowingGates(hunter.node, target.node) };
        });
        next = { ...next, hunters };
        notes.push("hunters move");
        break;
      }

      case "modifyRoll": {
        next = { ...next, roll: Math.max(0, next.roll + effect.delta) };
        notes.push(`movement ${sign(effect.delta)} → ${next.roll}`);
        break;
      }

      case "hitMarkedNodes": {
        const marked = new Set(["supply", "terminal", "lab", "cell", "alarm"]);
        for (const victim of playersIn(next.players)) {
          if (!marked.has(getNode(victim.node).kind) || victim.downed) continue;
          const hit = applyEffects(next, victim.seat, [{ kind: "modifyIntegrity", delta: effect.delta }]);
          next = hit.state;
          notes.push(`${victim.seat} ${sign(effect.delta)} Integrity (marked space)`);
        }
        break;
      }

      case "openVote": {
        const vote = createVote(next, seat);
        next = vote.state;
        notes.push(...vote.notes);
        break;
      }

      case "drawCard": {
        const drawn = applyDraw(next, seat, effect);
        next = drawn.state;
        notes.push(...drawn.notes);
        break;
      }

      case "removeGear": {
        const removed = player.gear.slice(-effect.count);
        player = withGearCeiling({ ...player, gear: player.gear.slice(0, Math.max(0, player.gear.length - effect.count)) });
        notes.push(
          removed.length > 0
            ? `${seat} loses ${removed.map((id) => gearById(id).name.en).join(", ")}`
            : `${seat} has no gear to lose`,
        );
        break;
      }

      case "placeEvidence": {
        next = addEvidence(next, seat, effect.evidence as EvidenceKind);
        notes.push(`evidence: ${effect.evidence}`);
        break;
      }

      case "forceMove": {
        const destination = forceTargetOf(next, seat, effect);
        if (destination) {
          const node = stepWithoutGate(player.node, destination);
          if (node !== player.node) {
            player = { ...player, node };
            notes.push(`${seat} is forced to ${getNode(node).name.en}`);
          }
        }
        break;
      }

      case "lockGate": {
        const gateId = effect.gateId === "nearest" ? nearestGate(player.node) : effect.gateId;
        if (effect.rounds <= 0) {
          const sealed = { ...next.sealedGates };
          delete sealed[gateId];
          next = { ...next, sealedGates: sealed };
          notes.push(`${gateId} is open again`);
        } else {
          const reopen = next.round + effect.rounds;
          next = { ...next, sealedGates: { ...next.sealedGates, [gateId]: reopen } };
          notes.push(`${gateId} sealed until round ${reopen}`);
        }
        break;
      }

      case "grantAspect": {
        player = { ...player, aspectId: effect.aspectId };
        notes.push(`aspect: ${effect.aspectId}`);
        break;
      }

      case "armWarhead": {
        if (!next.warhead) {
          next = { ...next, warhead: { remaining: threatRule().countdown } };
          notes.push(`the Alpha Warhead is armed — ${threatRule().countdown} rounds to detonation.`);
        }
        break;
      }

      default: {
        const never: never = effect;
        throw new Error(`unhandled effect ${JSON.stringify(never)}`);
      }
    }
  }

  return {
    state: replacePlayer(next, player),
    notes,
  };
}

function stepTowardAllowingGates(from: string, to: string): string {
  if (from === to) return from;
  const neighbours = [...neighborsOf(from)].sort();
  let best = from;
  let bestDistance = distance(from, to);
  for (const neighbour of neighbours) {
    const steps = distance(neighbour, to);
    if (steps < bestDistance) {
      bestDistance = steps;
      best = neighbour;
    }
  }
  return best;
}

/** Records paid by a containment, including the Idol's extra Record (§C5.5). */
export function containmentRecords(player: Player, _tier: DeckId, base: number): number {
  return base + gearExtraRecords(player.gear);
}

export const ringOf = ringDepth;

const sign = (delta: number): string => (delta >= 0 ? `+${delta}` : `${delta}`);
