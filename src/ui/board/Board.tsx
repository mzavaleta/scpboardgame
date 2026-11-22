/**
 * The SVG board (§S7.4). Click/tap only — no drag, which is worse on touch and
 * worse for accessibility. Sealed gates and hunters are visible here because the
 * scent rule and the Lockdown are public information (§7, §C5).
 */

import { BOARD, type BoardNode } from "../../content/board";
import { reachableEndpoints } from "../../engine/movement";
import { playerAt } from "../../engine/types";
import type { GameState, SeatId } from "../../engine/types";
import { localized, t, type Key, type Lang } from "../../i18n";
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

/** Tooltip label per node kind — chrome, so it goes through `t()` (M4 S12). */
const KIND_KEY: Record<BoardNode["kind"], Key> = {
  entry: "kindEntry",
  medical: "kindMedical",
  checkpoint: "kindCheckpoint",
  supply: "kindSupply",
  terminal: "kindTerminal",
  lab: "kindLab",
  cell: "kindCell",
  alarm: "kindAlarm",
  core: "kindCore",
};

const SEAT_COLOR: Record<SeatId, string> = {
  p1: "#7fd1ff",
  p2: "#6ee7a0",
  p3: "#ffb454",
};

type Props = {
  state: GameState;
  lang: Lang;
  onMove: (nodeId: string) => void;
};

export function Board({ state, lang, onMove }: Props) {
  const active = playerAt(state.players, state.seat);
  const reachable =
    state.phase === "move" ? new Set(reachableEndpoints(active.node, state.roll)) : new Set<string>();

  const occupants = new Map<string, SeatId[]>();
  for (const player of Object.values(state.players)) {
    occupants.set(player.node, [...(occupants.get(player.node) ?? []), player.seat]);
  }

  const hunters = new Map<string, number>();
  for (const hunter of state.hunters) hunters.set(hunter.node, (hunters.get(hunter.node) ?? 0) + 1);

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-full w-full"
      role="img"
      aria-label={localized({ en: "Facility board", es: "Tablero de la instalación" }, lang)}
    >
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

      {BOARD.gates.map((gate) => {
        const a = positionOf(BOARD.nodes.find((node) => node.id === gate.a) as BoardNode);
        const b = positionOf(BOARD.nodes.find((node) => node.id === gate.b) as BoardNode);
        const reopen = state.sealedGates[gate.id];
        const sealed = reopen !== undefined && reopen > state.round;
        return (
          <line
            key={gate.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={sealed ? "var(--danger)" : "var(--warn)"}
            strokeWidth={sealed ? 2.5 : 1}
            strokeDasharray={sealed ? "2 4" : "5 5"}
            opacity={sealed ? 0.95 : 0.55}
          >
            <title>
              {t(lang, sealed ? "gateTipSealed" : "gateTip", {
                gate: gate.id,
                clearance: gate.clearance,
                difficulty: gate.test.difficulty,
                round: reopen ?? "",
              })}
            </title>
          </line>
        );
      })}

      {BOARD.nodes.map((node) => {
        const { x, y } = positionOf(node);
        const style = KIND_STYLE[node.kind];
        const isActive = node.id === active.node;
        const isReachable = reachable.has(node.id);
        const seats = occupants.get(node.id) ?? [];
        const here = hunters.get(node.id) ?? 0;

        return (
          <g
            key={node.id}
            data-node={node.id}
            data-reachable={isReachable ? "true" : "false"}
            transform={`translate(${x} ${y})`}
            onClick={isReachable ? () => onMove(node.id) : undefined}
            style={{ cursor: isReachable ? "pointer" : "default" }}
          >
            <title>{`${localized(node.name, lang)} · ${t(lang, KIND_KEY[node.kind])}`}</title>
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
                {localized(node.name, lang).length > 16
                  ? `${localized(node.name, lang).slice(0, 15)}…`
                  : localized(node.name, lang)}
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
            {here > 0 && (
              <g transform="translate(18 -16)">
                <circle r={6} fill="#ff4d4d" stroke="#0b0d10" strokeWidth={1}>
                  <title>{t(lang, "hunterCount", { count: here })}</title>
                </circle>
                <text textAnchor="middle" y={3} fontSize={8} fill="#0b0d10" style={{ pointerEvents: "none" }}>
                  {here}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
