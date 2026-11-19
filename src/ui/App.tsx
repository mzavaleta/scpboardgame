/**
 * M1 shell: a functional table, not a polished one. The point of this build is
 * to sit around a table and find out what is wrong with the *rules*, so the UI
 * shows state honestly and hides nothing behind decoration.
 */

import { useCallback, useMemo, useState } from "react";
import { BOARD } from "../content/board";
import { getNode } from "../engine/board";
import { reachableEndpoints } from "../engine/movement";
import { hashState } from "../engine/hash";
import { createGame, reduce } from "../engine/reduce";
import type { Action, GameState, SeatId } from "../engine/types";
import { Board } from "./board/Board";

const SEAT_COLOR: Record<SeatId, string> = { p1: "#7fd1ff", p2: "#6ee7a0", p3: "#ffb454" };

const KIND_CODE: Record<(typeof BOARD.nodes)[number]["kind"], string> = {
  entry: "IN",
  medical: "MD",
  checkpoint: "CP",
  supply: "SU",
  terminal: "TM",
  lab: "LB",
  cell: "CL",
  alarm: "AL",
  core: "CC",
};

function newSeed(): number {
  const fromUrl = new URLSearchParams(window.location.search).get("seed");
  if (fromUrl && Number.isFinite(Number(fromUrl))) return Number(fromUrl);
  return Math.floor(Math.random() * 1_000_000_000);
}

export function App() {
  const [seed, setSeed] = useState(newSeed);
  const [state, setState] = useState<GameState>(() => createGame(newSeed()));
  const [error, setError] = useState<string>("");

  const dispatch = useCallback((action: Action) => {
    setState((current) => {
      const result = reduce(current, action);
      if (!result.ok) {
        setError(result.error.message);
        return current;
      }
      setError("");
      return result.value;
    });
  }, []);

  const restart = useCallback(() => {
    const next = newSeed();
    // Seed in the URL so a playtest that found something odd can be reopened exactly.
    window.history.replaceState(null, "", `?seed=${next}`);
    setSeed(next);
    setState(createGame(next));
    setError("");
  }, []);

  const active = state.players[state.seat];
  const activeNode = getNode(active.node);
  const stateHash = useMemo(() => hashState(state), [state]);

  return (
    <div className="grid h-full grid-cols-[260px_1fr_320px] grid-rows-[auto_1fr_auto] gap-3 p-3">
      {/* Status strip */}
      <header className="col-span-3 flex items-center gap-6 rounded border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm">
        <span className="font-semibold tracking-wide">PROTOCOL BREACH</span>
        <span className="text-[var(--muted)]">
          round <b className="text-[var(--text)]">{state.round}</b>
        </span>
        <span className="text-[var(--muted)]">
          phase <b className="text-[var(--text)]">{state.phase}</b>
        </span>
        <span className="text-[var(--muted)]">
          rolled <b className="text-[var(--text)]">{state.roll}</b>
        </span>
        <span className="text-[var(--muted)]">
          seed <b className="text-[var(--text)]">{seed}</b>
        </span>
        <span className="text-[var(--muted)]">
          hash <code className="text-[var(--accent)]">{stateHash}</code>
        </span>
        <button
          onClick={restart}
          className="ml-auto rounded border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          New game
        </button>
      </header>

      {/* Players */}
      <aside className="rounded border border-[var(--line)] bg-[var(--panel)] p-3">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-[var(--muted)]">Players</h2>
        <ul className="space-y-2 text-sm">
          {Object.values(state.players).map((player) => {
            const isActive = player.seat === state.seat;
            return (
              <li
                key={player.seat}
                className={`rounded border px-2 py-2 ${
                  isActive ? "border-[var(--accent)]" : "border-transparent"
                }`}
                style={{ background: isActive ? "rgba(127,209,255,0.06)" : "transparent" }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEAT_COLOR[player.seat] }} />
                  <b>{player.seat.toUpperCase()}</b>
                  <span className="text-[var(--muted)]">int {player.integrity}</span>
                  <span className="text-[var(--muted)]">fate {player.fate}</span>
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">{getNode(player.node).name.en}</div>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-4 mb-2 text-xs uppercase tracking-widest text-[var(--muted)]">Legend</h2>
        <ul className="grid grid-cols-2 gap-1 text-[11px] text-[var(--muted)]">
          {/* Code plus name: colour is never the only channel carrying information. */}
          {[...new Set(BOARD.nodes.map((node) => node.kind))].map((kind) => (
            <li key={kind}>
              <b className="text-[var(--text)]">{KIND_CODE[kind]}</b> {kind}
            </li>
          ))}
        </ul>
      </aside>

      {/* Board */}
      <main className="min-h-0 rounded border border-[var(--line)] bg-[var(--panel)] p-2">
        <Board state={state} onMove={(node: string) => dispatch({ type: "moveTo", node })} />
      </main>

      {/* Log */}
      <aside className="min-h-0 rounded border border-[var(--line)] bg-[var(--panel)] p-3">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-[var(--muted)]">Log</h2>
        <ol className="h-[calc(100%-2rem)] space-y-1 overflow-y-auto pr-1 text-xs leading-relaxed">
          {[...state.log].reverse().map((line, index) => (
            <li key={state.log.length - index} className="text-[var(--muted)]">
              {line}
            </li>
          ))}
        </ol>
      </aside>

      {/* Controls */}
      <footer className="col-span-3 flex items-center gap-3 rounded border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
        <button
          onClick={() => dispatch({ type: "rollMovement" })}
          disabled={state.phase !== "roll"}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#04121b] disabled:opacity-30"
        >
          Roll movement
        </button>
        <button
          onClick={() => dispatch({ type: "endTurn" })}
          disabled={state.phase !== "action"}
          className="rounded border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-30"
        >
          End turn
        </button>

        <span className="ml-4 text-sm">
          <b style={{ color: SEAT_COLOR[state.seat] }}>{state.seat.toUpperCase()}</b>
          <span className="text-[var(--muted)]"> to act · at </span>
          <b>{activeNode.name.en}</b>
          {state.phase === "move" && (
            <span className="text-[var(--muted)]">
              {" "}
              · choose where to land ({reachableEndpoints(active.node, state.roll).length} options)
            </span>
          )}
        </span>

        {error && <span className="ml-auto text-sm text-[var(--danger)]">{error}</span>}
        {!error && (
          <span className="ml-auto text-xs text-[var(--muted)]">
            M1 — no encounters yet (M2). Gates cross without a clearance check (M3).
          </span>
        )}
      </footer>
    </div>
  );
}
