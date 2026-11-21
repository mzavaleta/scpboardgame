/**
 * Board graph helpers (§C1, §S1 "no derived data is stored").
 *
 * Adjacency is computed once from content and never stored in `GameState`:
 * storing it would invalidate every save and golden replay the day a ring size
 * changes, and ring size is a tuning parameter (§10.2).
 *
 * DEPENDENCY NOTE: this module imports the board directly. That is fine while
 * there is exactly one content set; when a second one exists (a scenario, an
 * expansion), the board becomes an argument threaded through `createGame`.
 * Recorded here so the shortcut is visible rather than accidental.
 */

import { BOARD, type BoardDef, type BoardNode, type Gate, type RingId } from "../content/board";

const nodesById = new Map<string, BoardNode>(BOARD.nodes.map((n) => [n.id, n]));

function buildAdjacency(board: BoardDef): Map<string, string[]> {
  const adjacency = new Map<string, string[]>(board.nodes.map((n) => [n.id, []]));

  const link = (a: string, b: string) => {
    if (a === b) return;
    adjacency.get(a)?.push(b);
    adjacency.get(b)?.push(a);
  };

  for (const ring of Object.keys(board.rings) as RingId[]) {
    const slots = board.rings[ring].slots;
    if (slots < 2) continue;
    for (let slot = 0; slot < slots; slot += 1) {
      link(`${ring}-${String(slot).padStart(2, "0")}`, `${ring}-${String((slot + 1) % slots).padStart(2, "0")}`);
    }
  }

  for (const gate of board.gates) link(gate.a, gate.b);

  return adjacency;
}

const ADJACENCY = buildAdjacency(BOARD);

/** Neighbours in a stable, content-derived order (deterministic for replays). */
export function neighborsOf(nodeId: string): readonly string[] {
  return ADJACENCY.get(nodeId) ?? [];
}

export function getNode(nodeId: string): BoardNode {
  const found = nodesById.get(nodeId);
  if (!found) throw new Error(`Unknown node: ${nodeId}`);
  return found;
}

/** 0 outer, 1 middle, 2 inner, 3 core. Used by the progress rule and the sim. */
export function ringDepth(nodeId: string): number {
  return { outer: 0, middle: 1, inner: 2, core: 3 }[getNode(nodeId).ring];
}

export function nodeName(nodeId: string): string {
  return getNode(nodeId).name.en;
}

export function gateBetween(a: string, b: string): Gate | undefined {
  return BOARD.gates.find((gate) => (gate.a === a && gate.b === b) || (gate.a === b && gate.b === a));
}

/**
 * The gates that **every** simple path of exactly `steps` edges between `from`
 * and `to` must cross (§D26 + §C1.6).
 *
 * This exists because movement is a single destination, not a walk: the reducer
 * never sees the intermediate nodes, so a gate crossed mid-path used to be
 * undetectable (§14f). Intersecting the paths gives the exact answer — if a
 * route exists that avoids a gate, a player would take it, so that gate is not
 * unavoidable and no check applies.
 *
 * The graph is rings of 8-12 nodes and `steps` never exceeds 6, so enumerating
 * simple paths is cheap; the result is deduplicated and returned in board order.
 */
export function gatesAlong(from: string, to: string, steps: number): readonly Gate[] {
  if (steps <= 0 || from === to) return [];

  const paths: (readonly string[])[] = [];

  const walk = (node: string, remaining: number, visited: Set<string>, crossed: readonly string[]): void => {
    if (remaining === 0) {
      if (node === to) paths.push(crossed);
      return;
    }
    for (const neighbour of neighborsOf(node)) {
      if (visited.has(neighbour)) continue;
      const gate = gateBetween(node, neighbour);
      const nextVisited = new Set(visited);
      nextVisited.add(neighbour);
      walk(neighbour, remaining - 1, nextVisited, gate ? [...crossed, gate.id] : crossed);
    }
  };

  walk(from, steps, new Set([from]), []);
  const [first, ...rest] = paths;
  if (!first) return [];

  const unavoidable = new Set(first);
  for (const path of rest) {
    for (const id of [...unavoidable]) {
      if (!path.includes(id)) unavoidable.delete(id);
    }
  }

  return BOARD.gates.filter((gate) => unavoidable.has(gate.id));
}

export function ringOf(nodeId: string): RingId {
  return getNode(nodeId).ring;
}

/** Breadth-first distance in movement steps, used by board invariants and the sim. */
export function distance(from: string, to: string): number {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let depth = 0;

  while (frontier.length > 0) {
    depth += 1;
    const next: string[] = [];
    for (const node of frontier) {
      for (const neighbour of neighborsOf(node)) {
        if (seen.has(neighbour)) continue;
        if (neighbour === to) return depth;
        seen.add(neighbour);
        next.push(neighbour);
      }
    }
    frontier = next;
  }

  return Number.POSITIVE_INFINITY;
}

export { BOARD };
