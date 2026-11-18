/**
 * Polar layout (§C1, §6). Positions are derived from ring slot counts, never
 * stored: changing a ring size is a content edit, and this file follows.
 */

import { BOARD, type BoardNode } from "../../content/board";

export const VIEW = 1000;
export const CENTER = VIEW / 2;

/** Inner-to-outer radii, tuned so labels do not collide at 12 slots. */
const RADIUS: Record<BoardNode["ring"], number> = {
  core: 0,
  inner: 215,
  middle: 320,
  outer: 425,
};

export function positionOf(node: BoardNode): { x: number; y: number } {
  if (node.ring === "core") return { x: CENTER, y: CENTER };

  const slots = BOARD.rings[node.ring].slots;
  // Slot 0 at 12 o'clock, clockwise.
  const angle = (node.slot / slots) * Math.PI * 2 - Math.PI / 2;

  return {
    x: CENTER + RADIUS[node.ring] * Math.cos(angle),
    y: CENTER + RADIUS[node.ring] * Math.sin(angle),
  };
}

export function ringRadius(ring: BoardNode["ring"]): number {
  return RADIUS[ring];
}
