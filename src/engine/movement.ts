/**
 * Movement (§D5, owner's ruling 2026-11-18).
 *
 * Talisman shape: the die says how far, **you** choose where, and the move is a
 * single decision — not a walk you can reverse. Three consequences, all of them
 * the point:
 *
 * 1. Only the **landing** space resolves. Passing through is free, so the deck
 *    burn rate matches the pacing math (§C1.1) instead of quadrupling.
 * 2. The path must be **simple** — no revisiting a node. That is what "you
 *    should not be able to go back and forth" means mechanically: a walk that
 *    returns to where it started is not a legal move.
 * 3. Gates are **edges like any other**, so a bridge that is exactly on your
 *    distance shows up as a landing option with no special case.
 */

import { neighborsOf } from "./board";

/**
 * Every node reachable from `from` by a simple path of exactly `steps` edges.
 *
 * Sorted, so the order is deterministic and the same list reaches the UI and the
 * replay log. Path enumeration is cheap here: the graph is rings of 8–12 nodes
 * with degree 3 at gate mouths, and `steps` never exceeds 6.
 */
export function reachableEndpoints(from: string, steps: number): readonly string[] {
  if (steps < 0) throw new RangeError(`reachableEndpoints: negative steps (${steps})`);
  if (steps === 0) return [from];

  const endpoints = new Set<string>();

  const walk = (node: string, remaining: number, visited: ReadonlySet<string>): void => {
    if (remaining === 0) {
      endpoints.add(node);
      return;
    }

    for (const neighbour of neighborsOf(node)) {
      if (visited.has(neighbour)) continue;
      const next = new Set(visited);
      next.add(neighbour);
      walk(neighbour, remaining - 1, next);
    }
  };

  walk(from, steps, new Set([from]));

  return [...endpoints].sort();
}

/** True when `to` is a legal landing for a roll of `steps` from `from`. */
export function canLandOn(from: string, to: string, steps: number): boolean {
  return reachableEndpoints(from, steps).includes(to);
}
