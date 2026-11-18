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

export function nodeName(nodeId: string): string {
  return getNode(nodeId).name.en;
}

export function gateBetween(a: string, b: string): Gate | undefined {
  return BOARD.gates.find((gate) => (gate.a === a && gate.b === b) || (gate.a === b && gate.b === a));
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
