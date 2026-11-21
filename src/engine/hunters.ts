/**
 * Hunters (§7): the local pressure layer.
 *
 * The scent rule is **visible and deterministic on purpose** — hidden movement
 * produces gotcha, visible movement produces dread and planning. Each hunter takes
 * one step along the shortest path to the nearest player (ties to the lowest
 * seat), and contact costs Integrity.
 */

import { getNode, neighborsOf, distance } from "./board";
import { applyEffects } from "./effects";
import { hunterRule } from "../config/tuning";
import { playerAt, playersIn } from "./types";
import type { GameState, Hunter, SeatId } from "./types";

/** Player targets, ignoring seats wearing the Cap of Neglect this round. */
function visibleSeats(state: GameState): readonly SeatId[] {
  return playersIn(state.players)
    .filter((player) => !player.tags.includes("unseen"))
    .map((player) => player.seat);
}

function nearestSeat(state: GameState, from: string): SeatId | null {
  const seats = visibleSeats(state);
  if (seats.length === 0) return null;

  let best: SeatId | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const seat of seats) {
    const steps = distance(from, playerAt(state.players, seat).node);
    // Ties go to the lowest seat, which is why `playersIn` order is seat order.
    if (steps < bestDistance) {
      bestDistance = steps;
      best = seat;
    }
  }
  return best;
}

function stepToward(from: string, to: string): string {
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

/** Round boundary step 1 (§S2): every hunter moves one visible step. */
export function moveHunters(state: GameState): { state: GameState; notes: readonly string[] } {
  const notes: string[] = [];
  const hunters: Hunter[] = state.hunters.map((hunter) => {
    const target = nearestSeat(state, hunter.node);
    if (!target) return hunter;
    const destination = playerAt(state.players, target).node;
    const node = stepToward(hunter.node, destination);
    if (node !== hunter.node) {
      notes.push(`${hunter.id} moves toward ${target} (${getNode(hunter.node).name.en} → ${getNode(node).name.en}).`);
    }
    return { ...hunter, node };
  });

  return { state: { ...state, hunters }, notes };
}

/** Round boundary step 2 (§S2): contact costs Integrity, publicly. */
export function hunterContact(state: GameState): { state: GameState; notes: readonly string[] } {
  const damage = hunterRule().contactDamage;
  if (damage <= 0 || state.hunters.length === 0) return { state, notes: [] };

  let next = state;
  const notes: string[] = [];

  for (const hunter of state.hunters) {
    for (const player of playersIn(next.players)) {
      if (player.node !== hunter.node || player.downed) continue;
      const hit = applyEffects(next, player.seat, [{ kind: "modifyIntegrity", delta: -damage }]);
      next = hit.state;
      notes.push(`${hunter.id} reaches ${player.seat} — ${damage} Integrity.`);
      if (playerAt(next.players, player.seat).downed) {
        notes.push(`${player.seat} is down at ${getNode(hunter.node).name.en}.`);
      }
    }
  }

  return { state: next, notes };
}
