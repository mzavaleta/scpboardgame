/**
 * The SVG board (§S7.4). Click/tap only — no drag, which is worse on touch and
 * worse for accessibility. The board's only job in M1 is to make adjacency
 * legible enough to test movement.
 */

import { BOARD, type BoardNode } from "../../content/board";
import { reachableEndpoints } from "../../engine/movement";
import { playerAt } from "../../engine/types";
import type { GameState, SeatId } from "../../engine/types";
import { CENTER, VIEW, positionOf, ringRadius } from "./layout";

const KIND_STYLE: Record<BoardNode["kind"], { short: string; color: string }> = {
  entry: { short: "IN", color: "#7fd1ff" },
  medical: { short: "MD", color: "#6ee7a0" },
  checkpoint: { short: "CP", color: "#c9a6ff" },
  supply: { short: "SU", color: "#8fd694" },
  terminal: { short: "TM", color: "#9aa7b8" },
  lab: { short: "LB", color: "#e0b978" },
  cell: { short: "CL", color: "#ff6b6b" },
  alarm: { short: "AL", color: "#ffb454" },
  core: { short: "CC", color: "#ffffff" },
};

const SEAT_COLOR: Record<SeatId, string> = {
  p1: "#7fd1ff",
  p2: "#6ee7a0",
  p3: "#ffb454",
};

type Props = {
  state: GameState;
  onMove: (nodeId: string) => void;
};

export function Board({ state, onMove }: Props) {
  const active = playerAt(state.players, state.seat);
  // Landing options, not adjacent steps: the die fixes the distance (§D5).
  const reachable =
    state.phase === "move" ? new Set(reachableEndpoints(active.node, state.roll)) : new Set<string>();

  const occupants = new Map<string, SeatId[]>();
  for (const player of Object.values(state.players)) {
    occupants.set(player.node, [...(occupants.get(player.node) ?? []), player.seat]);
  }

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-full w-full" role="img" aria-label="Facility board">
      {(["outer", "middle", "inner"] as const).map((ring) => (
        <circle
          key={ring}
          cx={CENTER}
          cy={CENTER}
          r={ringRadius(ring)}
          fill="none"
          stroke="var(--line)"
          strokeWidth={1.5}
        />
      ))}

      {/* Gates as chords between rings (§C1.3). */}
      {BOARD.gates.map((gate) => {
        const a = positionOf(BOARD.nodes.find((node) => node.id === gate.a) as BoardNode);
        const b = positionOf(BOARD.nodes.find((node) => node.id === gate.b) as BoardNode);
        return (
          <line
            key={gate.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--warn)"
            strokeWidth={1}
            strokeDasharray="5 5"
            opacity={0.55}
          >
            <title>{`${gate.id} — clearance ${gate.clearance} or Intellect ${gate.test.difficulty}`}</title>
          </line>
        );
      })}

      {BOARD.nodes.map((node) => {
        const { x, y } = positionOf(node);
        const style = KIND_STYLE[node.kind];
        const isActive = node.id === active.node;
        const isReachable = reachable.has(node.id);
        const seats = occupants.get(node.id) ?? [];

        return (
          <g
            key={node.id}
            transform={`translate(${x} ${y})`}
            onClick={isReachable ? () => onMove(node.id) : undefined}
            style={{ cursor: isReachable ? "pointer" : "default" }}
          >
            <title>{`${node.name.en} · ${node.kind}`}</title>
            <circle
              r={isReachable ? 20 : 16}
              fill={isReachable ? "var(--panel)" : "var(--ink)"}
              stroke={isActive ? "#ffffff" : style.color}
              strokeWidth={isActive ? 3 : isReachable ? 2 : 1}
              opacity={isReachable || isActive ? 1 : 0.75}
            />
            <text textAnchor="middle" y={3} fontSize={9} fill={style.color} style={{ pointerEvents: "none" }}>
              {style.short}
            </text>
            {node.slot % 2 === 0 && (
              <text className="node-label" textAnchor="middle" y={30}>
                {node.name.en.length > 16 ? `${node.name.en.slice(0, 15)}…` : node.name.en}
              </text>
            )}
            {seats.map((seat, index) => (
              <circle
                key={seat}
                cx={-8 + index * 9}
                cy={-22}
                r={5}
                fill={SEAT_COLOR[seat]}
                stroke="#0b0d10"
                strokeWidth={1}
              >
                <title>{seat}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
