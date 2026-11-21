/**
 * M1 shell: a functional table, not a polished one. The point of this build is
 * to sit around a table and find out what is wrong with the *rules*, so the UI
 * shows state honestly and hides nothing behind decoration.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ANOMALIES, anomalyById } from "../content/anomalies";
import { TUNING, clearancePrice } from "../config/tuning";
import { BOARD } from "../content/board";
import { getNode } from "../engine/board";
import { reachableEndpoints } from "../engine/movement";
import { describeTest, drawAnomaly } from "../engine/encounter";
import { hashState } from "../engine/hash";
import { createGame, reduce } from "../engine/reduce";
import { peekRolls } from "../engine/rng";
import { playersIn, playerAt, seatsFor } from "../engine/types";
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

function param(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * `?seed=` is an instruction for the **first** game of the session, not a setting.
 *
 * Reading it every time `New game` runs made the button a no-op whenever the URL
 * carried a seed — which is every playtest URL, so it was a no-op always.
 */
function seedFromUrl(): number | null {
  const raw = param("seed");
  return raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : null;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

/** §D10: two or three. Two is the default because a playtest is half as long. */
function initialSeatCount(): 2 | 3 {
  return param("players") === "3" ? 3 : 2;
}

/** Seed *and* table in the URL, so a playtest reopens exactly as it was dealt. */
function remember(seed: number, seats: 2 | 3): void {
  window.history.replaceState(null, "", `?seed=${seed}&players=${seats}`);
}

type EncounterProps = {
  cardId: string;
  combat: number;
  intellect: number;
  onChoose: (choice: "contain" | "decline") => void;
};

function EncounterPanel({ cardId, combat, intellect, onChoose }: EncounterProps) {
  const card = anomalyById(cardId);
  const stat = card.test.stat === "combat" ? combat : intellect;
  const need = card.test.difficulty - stat;

  return (
    <div className="flex items-center gap-4 rounded border border-[var(--accent)] bg-[#0d1a22] px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm">
          <b>{card.name.en}</b>
          <span className="text-[var(--muted)]">
            {" "}
            · {card.tier} · {card.name.es}
          </span>
        </div>
        <div className="truncate text-xs text-[var(--muted)]">{card.text.en}</div>
      </div>

      <div className="ml-auto whitespace-nowrap text-right text-xs text-[var(--muted)]">
        <div>
          {card.test.stat} <b className="text-[var(--text)]">{stat}</b> vs difficulty{" "}
          <b className="text-[var(--text)]">{card.test.difficulty}</b>
        </div>
        <div>
          4dF needs {need > 0 ? `+${need}` : need} or better to reach 0 shift
        </div>
      </div>

      <button
        onClick={() => onChoose("contain")}
        className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#04121b]"
      >
        Contain · {card.reward.records} Rec
      </button>
      <button
        onClick={() => onChoose("decline")}
        className="rounded border border-[var(--line)] px-3 py-1.5 text-sm"
      >
        {card.declineCost.length > 0 ? "Decline · +1 Threat" : "Decline · free"}
      </button>
    </div>
  );
}

export function App() {
  // Resolve the opening table exactly once. Calling a random generator per
  // `useState` also meant a fresh visit could show one seed in the strip while
  // playing a different one — the two calls disagreed.
  const [opening] = useState(() => ({
    seed: seedFromUrl() ?? randomSeed(),
    seats: initialSeatCount(),
  }));
  const [devCard, setDevCard] = useState<string>(ANOMALIES[0]?.id ?? "scp-005");
  const [seed, setSeed] = useState(opening.seed);
  const [seatCount, setSeatCount] = useState<2 | 3>(opening.seats);
  const [state, setState] = useState<GameState>(() =>
    createGame(opening.seed, seatsFor(opening.seats)),
  );
  const [error, setError] = useState<string>("");

  // The address bar is the playtest record: it always matches the table on screen,
  // including on first load, so a bug can be reopened from the URL alone.
  useEffect(() => {
    remember(seed, seatCount);
  }, [seed, seatCount]);

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

  const start = useCallback((seats: 2 | 3) => {
    const next = randomSeed();
    setSeed(next);
    setSeatCount(seats);
    setState(createGame(next, seatsFor(seats)));
    setError("");
  }, []);

  const restart = useCallback(() => start(seatCount), [start, seatCount]);

  // Dev tool (§14e): present in `pnpm dev`, or when the URL says so. It never
  // ships to a plain build, because it is a testing aid, not a rule.
  const isDev = import.meta.env.DEV || new URLSearchParams(window.location.search).has("dev");

  const active = playerAt(state.players, state.seat);
  const activeNode = getNode(active.node);
  // §C1.4: only the next level is ever purchasable, so the button has one face.
  const nextClearance = active.clearance < 4 ? active.clearance + 1 : null;
  const nextClearancePrice = nextClearance ? clearancePrice(nextClearance as 2 | 3 | 4) : 0;
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
        <span className="text-[var(--muted)]" title="Threat track — a round where nobody attempts anything advances it">
          threat{" "}
          <b className={state.threat > 0 ? "text-[var(--danger)]" : "text-[var(--text)]"}>
            {state.threat}/{TUNING.threat.max}
          </b>
        </span>
        <span
          className="text-[var(--muted)]"
          title="Recontainment protocol — advanced or sabotaged at the Command Center"
        >
          protocol{" "}
          <b className={state.protocolSteps > 0 ? "text-[var(--accent)]" : "text-[var(--text)]"}>
            {state.protocolSteps}/{TUNING.protocol.steps}
          </b>
        </span>
        {state.warhead && (
          <span
            className="text-[var(--danger)]"
            title="The Alpha Warhead is armed. When this reaches 0 the site is lost."
          >
            warhead <b>{state.warhead.remaining}</b>
          </span>
        )}
        <span className="text-[var(--muted)]">
          seed <b className="text-[var(--text)]">{seed}</b>
        </span>
        <span className="text-[var(--muted)]">
          hash <code className="text-[var(--accent)]">{stateHash}</code>
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs text-[var(--muted)]">
          players
          {([2, 3] as const).map((count) => (
            <button
              key={count}
              onClick={() => start(count)}
              title={`Start a ${count}-player game with a new seed`}
              className={`w-6 rounded border px-1 ${
                count === seatCount
                  ? "border-[var(--accent)] text-[var(--text)]"
                  : "border-[var(--line)] hover:text-[var(--text)]"
              }`}
            >
              {count}
            </button>
          ))}
        </span>
        <button
          onClick={restart}
          className="rounded border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          New game
        </button>
      </header>

      {/* Players */}
      <aside className="rounded border border-[var(--line)] bg-[var(--panel)] p-3">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-[var(--muted)]">Players</h2>
        <ul className="space-y-2 text-sm">
          {playersIn(state.players).map((player) => {
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
                  {player.downed && <span className="font-semibold text-[var(--danger)]">DOWN</span>}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {getNode(player.node).name.en}
                  <div className="mt-0.5 text-[11px]">
                    C{player.stats.combat} I{player.stats.intellect} · rec {player.records} · clr{" "}
                    {player.clearance} · ev {player.evidence.accident}/{player.evidence.intent}
                    {player.evidence.tamperedProtocol > 0 && (
                      <span className="text-[var(--danger)]"> · tamper {player.evidence.tamperedProtocol}</span>
                    )}
                    {player.tags.length > 0 && <> · {player.tags.join(", ")}</>}
                  </div>
                </div>
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
      <footer className="col-span-3 flex flex-col gap-2 rounded border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
        {state.outcome && (
          <div className="rounded border border-[var(--danger)] px-3 py-2 text-sm">
            <b className="uppercase tracking-widest text-[var(--danger)]">
              {state.outcome.terminal === "detonated" ? "Site lost" : "Site recontained"}
            </b>
            <span className="ml-3 text-[var(--muted)]">
              {state.outcome.winners.length === 0
                ? "nobody wins — no directives yet, so every seat shares the loss"
                : `winners: ${state.outcome.winners.join(", ")}`}
            </span>
          </div>
        )}
        {state.phase === "space" && state.encounter && (
          <EncounterPanel
            cardId={state.encounter.card}
            combat={active.stats.combat}
            intellect={active.stats.intellect}
            onChoose={(choice) => dispatch({ type: "resolveAnomaly", choice })}
          />
        )}
        <div className="flex items-center gap-3">
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

        {state.phase === "action" && activeNode.kind === "core" && state.protocolSteps < TUNING.protocol.steps && (
          <>
            <button
              onClick={() => dispatch({ type: "advanceProtocol" })}
              title={`Intellect test at difficulty ${TUNING.protocol.difficulty} — three steps recontain the site`}
              className="rounded border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]"
            >
              Advance protocol · I{TUNING.protocol.difficulty}
            </button>
            <button
              onClick={() => dispatch({ type: "sabotageProtocol" })}
              title="Push the protocol down one step. Leaves tamperedProtocol evidence on you."
              className="rounded border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)]"
            >
              Sabotage protocol
            </button>
          </>
        )}

        {state.phase === "action" && activeNode.kind === "checkpoint" && nextClearance !== null && (
          <button
            onClick={() => dispatch({ type: "attemptClearance", level: nextClearance })}
            disabled={active.records < nextClearancePrice}
            title={`${activeNode.name.en} — access desk. ${active.records} Records held.`}
            className="rounded border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] disabled:opacity-30"
          >
            Buy clearance {nextClearance} · {nextClearancePrice} Rec
          </button>
        )}

        {active.downed && (
          <button
            onClick={() => dispatch({ type: "respawn" })}
            disabled={state.phase !== "roll"}
            className="rounded border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)] disabled:opacity-30"
          >
            Respawn
          </button>
        )}

        {isDev && (
          <div className="flex flex-col gap-1 rounded border border-dashed border-[var(--line)] px-2 py-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--muted)]">dev</span>
              {[1, 2, 3, 4, 5, 6].map((face) => (
                <button
                  key={face}
                  onClick={() => dispatch({ type: "devRoll", value: face })}
                  disabled={state.phase !== "roll"}
                  title={`Force a roll of ${face}`}
                  className="w-6 rounded border border-[var(--line)] text-xs disabled:opacity-25"
                >
                  {face}
                </button>
              ))}
              <span className="text-[10px] text-[var(--muted)]">
                next {peekRolls(state.rng, 5).join(" ")}
              </span>
              <span
                className="text-[10px] text-[var(--muted)]"
                title="Fingerprint of src/config/tuning.json — the numbers this game was created with"
              >
                cfg {state.config}
              </span>
              {state.phase === "move" && (
                <span
                  className="text-[10px] text-[var(--muted)]"
                  title="Next card in each pile (safe·euclid·keter) at this cursor, assuming no gate check"
                >
                  draw{" "}
                  {(["safe", "euclid", "keter"] as const)
                    .map((deck) => drawAnomaly(state, deck).card?.replace("scp-", "") ?? "--")
                    .join("·")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <span className="uppercase tracking-widest">card</span>
              <select
                value={devCard}
                onChange={(event) => setDevCard(event.target.value)}
                className="max-w-[15rem] rounded border border-[var(--line)] bg-transparent px-1 py-0.5 text-[10px] text-[var(--text)]"
              >
                {(["safe", "euclid", "keter"] as const).map((tier) => (
                  <optgroup key={tier} label={tier}>
                    {ANOMALIES.filter((card) => card.tier === tier).map((card) => (
                      <option key={card.id} value={card.id} className="bg-[#0b141b]">
                        {card.id.replace("scp-", "")} · {card.name.en} (d{card.test.difficulty})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                onClick={() => dispatch({ type: "devEncounter", card: devCard })}
                disabled={state.encounter !== null}
                title="Open an encounter with this card, wherever you are"
                className="rounded border border-[var(--line)] px-2 disabled:opacity-25"
              >
                open
              </button>
              <span className="ml-2 uppercase tracking-widest">damage</span>
              <button
                onClick={() => dispatch({ type: "devHurt", amount: 3 })}
                title="Take 3 Integrity damage"
                className="rounded border border-[var(--line)] px-2"
              >
                3
              </button>
              <button
                onClick={() => dispatch({ type: "devHurt", amount: 99 })}
                title="Bring the active player to 0 Integrity"
                className="rounded border border-[var(--line)] px-2"
              >
                down
              </button>
            </div>
          </div>
        )}

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

        {state.lastTest && !error && (
          <span className="ml-auto font-mono text-[11px] text-[var(--muted)]">
            last: {describeTest(state.lastTest)}
          </span>
        )}
        {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
        {!error && !state.lastTest && (
          <span className="ml-auto text-xs text-[var(--muted)]">
            M3c — the Command Center now holds the protocol: three steps recontain the site, sabotage pushes it back. Hunters and directives are next.
          </span>
        )}
        </div>
      </footer>
    </div>
  );
}
