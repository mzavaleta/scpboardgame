/**
 * The MVP shell (§S7): setup, draft, handoff, table, endgame, credits.
 *
 * Two rules keep the privacy honest:
 * 1. The table screen never renders another seat's directive.
 * 2. Every private value shown is read through `project(state, claimedSeat)` or
 *    the handoff for the seat currently holding the device.
 *
 * All chrome comes from `src/i18n`; content comes from `{ en, es }` objects.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ANOMALIES, anomalyById } from "../content/anomalies";
import { BOARD } from "../content/board";
import { MAIN_DIRECTIVES, directiveById } from "../content/directives";
import { ESCALATION } from "../content/escalation";
import { EQUIPMENT, gearById, gearTestBonus, hasModifier, modifiersOf } from "../content/gear";
import { RULE_SECTIONS } from "../content/rules";
import { aspectById, roleById, ROLES } from "../content/roles";
import { TUNING, progressionRule } from "../config/tuning";
import { evalCondition } from "../engine/conditions";
import { verdictFor } from "../engine/directives";
import { hashState } from "../engine/hash";
import { reachableEndpoints } from "../engine/movement";
import { project } from "../engine/project";
import { createGame, reduce } from "../engine/reduce";
import { getNode } from "../engine/board";
import { peekRolls } from "../engine/rng";
import { playerAt, playersIn, seatsFor } from "../engine/types";
import type { Action, DeckId, GameState, Phase, SeatId } from "../engine/types";
import { detectLang, localized, rememberLang, t, type Lang, type Key } from "../i18n";
import { Board } from "./board/Board";

const SEAT_COLOR: Record<SeatId, string> = { p1: "#7fd1ff", p2: "#6ee7a0", p3: "#ffb454" };

const PHASE_KEY: Record<Phase, Key> = {
  turnStart: "phaseTurnStart",
  roll: "phaseRoll",
  move: "phaseMove",
  space: "phaseSpace",
  action: "phaseAction",
  end: "phaseEnd",
};

const TIER_KEY: Record<DeckId, Key> = {
  safe: "tierSafe",
  euclid: "tierEuclid",
  keter: "tierKeter",
};

function param(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function seedFromUrl(): number | null {
  const raw = param("seed");
  return raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : null;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function initialSeatCount(): 2 | 3 {
  return param("players") === "3" ? 3 : 2;
}

function remember(seed: number, seats: 2 | 3): void {
  window.history.replaceState(null, "", `?seed=${seed}&players=${seats}&lang=${detectLang()}`);
}

function phaseLabel(lang: Lang, phase: Phase): string {
  return t(lang, PHASE_KEY[phase]);
}

type Screen = "setup" | "table" | "endgame" | "credits" | "rules";

export function App() {
  const [lang, setLang] = useState<Lang>(() => detectLang());
  const [opening] = useState(() => ({ seed: seedFromUrl() ?? randomSeed(), seats: initialSeatCount() }));
  const [game, setGame] = useState<GameState | null>(null);
  const [seatCount, setSeatCount] = useState<2 | 3>(opening.seats);
  const [screen, setScreen] = useState<Screen>("setup");
  const [rulesFrom, setRulesFrom] = useState<Screen>("setup");
  const [error, setError] = useState("");
  const [claimedSeat, setClaimedSeat] = useState<SeatId>("p1");
  const [sheetSeat, setSheetSeat] = useState<SeatId | null>(null);
  const [handoff, setHandoff] = useState<{ seats: SeatId[]; index: number } | null>(null);
  const [handoffDone, setHandoffDone] = useState(false);
  const [devCard, setDevCard] = useState(ANOMALIES[0]?.id ?? "scp-005");
  const [revealed, setRevealed] = useState(false);
  const handoffSeatRef = useRef<SeatId | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const changeLang = useCallback((next: Lang) => {
    setLang(next);
    rememberLang(next);
  }, []);

  const dispatch = useCallback((action: Action) => {
    setGame((current) => {
      if (!current) return current;
      const result = reduce(current, action);
      if (!result.ok) {
        setError(result.error.message);
        return current;
      }
      setError("");
      return result.value;
    });
  }, []);

  const firstStart = useRef(true);

  const start = useCallback((seats: 2 | 3) => {
    const fromUrl = seedFromUrl();
    const seed = firstStart.current && fromUrl !== null ? fromUrl : randomSeed();
    firstStart.current = false;
    setSeatCount(seats);
    setGame(createGame(seed, seatsFor(seats), { draft: true }));
    setScreen("table");
    setError("");
    setHandoff(null);
    setHandoffDone(false);
    setClaimedSeat("p1");
    setRevealed(false);
    remember(seed, seats);
  }, []);

  // After the last role is chosen, deal motives privately, one seat at a time.
  useEffect(() => {
    if (!game || game.draft || handoffDone || handoff || game.outcome) return;
    if (game.round === 1 && game.phase === "roll" && game.log.some((line) => line.includes("draft is complete"))) {
      setHandoff({ seats: playersIn(game.players).map((player) => player.seat), index: 0 });
    }
  }, [game, handoff, handoffDone]);

  // The endgame is a screen, not a toast (§7c.6).
  useEffect(() => {
    if (game?.outcome && screen === "table" && !handoff) setScreen("endgame");
  }, [game, screen, handoff]);

  // A new handoff seat closes any revealed panel.
  useEffect(() => {
    setRevealed(false);
  }, [handoff?.index]);

  const active = game ? playerAt(game.players, game.seat) : null;
  const activeNode = active ? getNode(active.node) : null;
  const seats = game ? playersIn(game.players).map((player) => player.seat) : [];
  const stateHash = useMemo(() => (game ? hashState(game) : ""), [game]);
  const isDev = import.meta.env.DEV || new URLSearchParams(window.location.search).has("dev");
  const phase = game?.phase;

  /* ---------------------------------------------------------------- rules -- */

  if (screen === "rules") {
    return (
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-8">
        <h1 className="mb-1 text-2xl font-semibold">{t(lang, "rules")}</h1>
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="text-[var(--muted)]">{t(lang, "language")}</span>
          {(["en", "es"] as const).map((option) => (
            <button
              key={option}
              onClick={() => changeLang(option)}
              className={`rounded border px-2 py-0.5 ${
                option === lang ? "border-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="mb-6 text-sm text-[var(--muted)]">{t(lang, "rulesLead")}</p>
        <div className="space-y-6">
          {RULE_SECTIONS.map((section) => (
            <section key={section.id}>
              <h2 className="mb-1 text-xs uppercase tracking-widest text-[var(--accent)]">
                {localized(section.title, lang)}
              </h2>
              {section.body.map((line, index) => (
                <p key={index} className="mb-2 text-sm leading-relaxed">
                  {localized(line, lang)}
                </p>
              ))}
            </section>
          ))}
        </div>
        <button
          onClick={() => setScreen(rulesFrom)}
          className="mt-8 rounded border border-[var(--line)] px-4 py-2 text-sm"
        >
          {t(lang, "back")}
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- setup -- */

  if (screen === "setup") {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="w-full max-w-2xl rounded border border-[var(--line)] bg-[var(--panel)] p-8">
          <div className="mb-1 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
            {t(lang, "appTitle")}
          </div>
          <h1 className="mb-3 text-2xl font-semibold">{t(lang, "setupTitle")}</h1>
          <p className="mb-6 text-sm text-[var(--muted)]">{t(lang, "setupLead")}</p>

          <div className="mb-6 flex items-center gap-3 text-sm">
            <span className="text-[var(--muted)]">{t(lang, "tableSize")}</span>
            {([2, 3] as const).map((count) => (
              <button
                key={count}
                onClick={() => setSeatCount(count)}
                className={`rounded border px-3 py-1.5 ${
                  count === seatCount
                    ? "border-[var(--accent)] text-[var(--text)]"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {t(lang, count === 2 ? "twoPlayers" : "threePlayers")}
              </button>
            ))}
          </div>

          <div className="mb-8 flex items-center gap-3 text-sm">
            <span className="text-[var(--muted)]">{t(lang, "language")}</span>
            {(["en", "es"] as const).map((option) => (
              <button
                key={option}
                onClick={() => changeLang(option)}
                className={`rounded border px-3 py-1.5 ${
                  option === lang
                    ? "border-[var(--accent)] text-[var(--text)]"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {t(lang, option === "en" ? "english" : "spanish")}
              </button>
            ))}
          </div>

          <button
            onClick={() => start(seatCount)}
            className="rounded bg-[var(--accent)] px-6 py-2.5 font-semibold text-[#04121b]"
          >
            {t(lang, "start")}
          </button>
          <button
            onClick={() => setScreen("credits")}
            className="ml-3 rounded border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]"
          >
            {t(lang, "credits")}
          </button>
          <button
            onClick={() => {
              setRulesFrom("setup");
              setScreen("rules");
            }}
            className="ml-3 rounded border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]"
          >
            {t(lang, "rules")}
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- credits -- */

  if (screen === "credits") {
    const rows = [
      ...ANOMALIES.map((card) => ({
        id: card.id,
        name: localized(card.name, lang),
        licence: card.attribution.licence,
        author: card.attribution.author,
        slug: card.attribution.slug,
      })),
      ...EQUIPMENT.map((item) => ({
        id: item.id,
        name: localized(item.name, lang),
        licence: item.attribution.licence,
        author: item.attribution.author ?? (item.attribution.licence === "original" ? t(lang, "original") : ""),
        slug: item.attribution.slug ?? "",
      })),
    ];

    return (
      <div className="mx-auto h-full max-w-4xl overflow-y-auto p-8">
        <h1 className="mb-2 text-2xl font-semibold">{t(lang, "creditsTitle")}</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">{t(lang, "creditsLead")}</p>
        <table className="w-full text-left text-xs">
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="py-1.5 pr-3 text-[var(--text)]">{row.name}</td>
                <td className="py-1.5 pr-3 text-[var(--muted)]">{row.licence}</td>
                <td className="py-1.5 pr-3 text-[var(--muted)]">
                  {row.author === "PENDING" ? t(lang, "pendingAttribution") : row.author}
                </td>
                <td className="py-1.5 font-mono text-[var(--muted)]">{row.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => setScreen(game ? "table" : "setup")}
          className="mt-6 rounded border border-[var(--line)] px-4 py-2 text-sm"
        >
          {t(lang, "back")}
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------- endgame -- */

  if (screen === "endgame" && game?.outcome) {
    return (
      <div className="mx-auto h-full max-w-4xl overflow-y-auto p-8">
        <div className="mb-1 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
          {game.outcome.terminal === "recontained" ? t(lang, "siteRecontained") : t(lang, "siteLost")}
        </div>
        <h1 className="mb-2 text-2xl font-semibold">{t(lang, "endgameTitle")}</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">{t(lang, "endgameLead")}</p>

        <ol className="space-y-4">
          {playersIn(game.players).map((player) => {
            const revealedDirective = game.outcome?.revealed[player.seat];
            const final = directiveById(player.mainDirectiveId);
            const verdict = verdictFor(game, player.seat);
            const why =
              verdict.why === "won"
                ? "whyWon"
                : verdict.why === "footprint"
                  ? "whyFootprint"
                  : "whyCondition";

            return (
              <li key={player.seat} className="rounded border border-[var(--line)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEAT_COLOR[player.seat] }} />
                  <b>{player.seat.toUpperCase()}</b>
                  <span className="text-[var(--muted)]">{localized(roleById(player.roleId).name, lang)}</span>
                  <b className={`ml-auto ${verdict.won ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                    {t(lang, verdict.won ? "won" : "lost")} — {t(lang, why)}
                  </b>
                </div>
                <div className="text-sm">{localized(final.name, lang)}</div>
                <div className="text-xs text-[var(--muted)]">{localized(final.text, lang)}</div>
                {revealedDirective?.previousDirectiveId && (
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    {t(lang, "previousDirective")}: {localized(directiveById(revealedDirective.previousDirectiveId).name, lang)}
                  </div>
                )}
                <div className="mt-2 text-xs text-[var(--muted)]">
                  {t(lang, "evidenceTrail")}:{" "}
                  {game.evidence.filter((token) => token.sourceSeat === player.seat).length} ·{" "}
                  {t(lang, "accident")}{" "}
                  {game.evidence.filter((token) => token.sourceSeat === player.seat && token.class === "accident").length} ·{" "}
                  {t(lang, "intent")}{" "}
                  {game.evidence.filter((token) => token.sourceSeat === player.seat && token.class === "intent").length}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setScreen("table");
              start(seatCount);
            }}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#04121b]"
          >
            {t(lang, "playAgain")}
          </button>
          <button
            onClick={() => setScreen("credits")}
            className="rounded border border-[var(--line)] px-4 py-2 text-sm"
          >
            {t(lang, "credits")}
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- table -- */

  if (!game) return null;

  const yes = game.pendingCompel
    ? (() => {
        const pending = game.pendingCompel!;
        const aspect = aspectById(pending.aspectId);
        const compel = aspect.compels[pending.compelIndex]!;
        const target = playerAt(game.players, pending.target);
        const waiver = target.gear.some((id) => gearById(id).modifiers.some((modifier) => modifier.kind === "refuseFree"));
        return { pending, aspect, compel, target, waiver };
      })()
    : null;

  const vote = game.vote;

  return (
    <div className="relative grid h-full grid-cols-[260px_1fr_320px] grid-rows-[auto_1fr_auto] gap-3 p-3">
      {/* status strip */}
      <header className="col-span-3 flex flex-wrap items-center gap-4 rounded border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm">
        <span className="font-semibold tracking-wide">{t(lang, "appTitle")}</span>
        <span className="text-[var(--muted)]">
          {t(lang, "round")} <b className="text-[var(--text)]">{game.round}</b>
        </span>
        <span className="text-[var(--muted)]">
          {t(lang, "phase")} <b className="text-[var(--text)]">{phase ? phaseLabel(lang, phase) : ""}</b>
        </span>
        <span className="text-[var(--muted)]">
          {t(lang, "threat")}{" "}
          <b className={game.threat > 0 ? "text-[var(--danger)]" : "text-[var(--text)]"}>
            {game.threat}/{TUNING.threat.max}
          </b>
        </span>
        <span className="text-[var(--muted)]">
          {t(lang, "protocol")}{" "}
          <b className="text-[var(--accent)]">
            {game.protocolSteps}/{TUNING.protocol.steps}
          </b>
        </span>
        {game.warhead && (
          <span className="text-[var(--danger)]">
            {t(lang, "warhead")} <b>{game.warhead.remaining}</b>
          </span>
        )}
        {game.capsuleSeat && (
          <span className="text-[var(--muted)]">
            {t(lang, "capsule")} <b className="text-[var(--accent)]">{game.capsuleSeat.toUpperCase()}</b>
          </span>
        )}
        <span className="text-[var(--muted)]">
          {t(lang, "seed")} <b className="text-[var(--text)]">{game.rng.seed}</b>
        </span>
        <span className="text-[var(--muted)]">
          {t(lang, "hash")} <code className="text-[var(--accent)]">{stateHash}</code>
        </span>
        <span className="ml-auto flex items-center gap-2">
          {(["en", "es"] as const).map((option) => (
            <button
              key={option}
              onClick={() => changeLang(option)}
              className={`rounded border px-2 py-0.5 text-xs ${
                option === lang ? "border-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => {
              setRulesFrom("table");
              setScreen("rules");
            }}
            className="rounded border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]"
          >
            {t(lang, "rules")}
          </button>
          <button
            onClick={() => start(seatCount)}
            className="rounded border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]"
          >
            {t(lang, "newGame")}
          </button>
        </span>
      </header>

      {/* players + private panel */}
      <aside className="min-h-0 overflow-y-auto rounded border border-[var(--line)] bg-[var(--panel)] p-3">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-[var(--muted)]">{t(lang, "players")}</h2>
        <ul className="space-y-2 text-sm">
          {playersIn(game.players).map((player) => {
            const isActive = player.seat === game.seat;
            return (
              <li
                key={player.seat}
                className={`rounded border px-2 py-2 ${isActive ? "border-[var(--accent)]" : "border-transparent"}`}
                style={{ background: isActive ? "rgba(127,209,255,0.06)" : "transparent" }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEAT_COLOR[player.seat] }} />
                  <b>{player.seat.toUpperCase()}</b>
                  <span className="truncate text-xs text-[var(--muted)]">
                    {player.roleId ? localized(roleById(player.roleId).name, lang) : t(lang, "none")}
                  </span>
                  {player.downed && <span className="font-semibold text-[var(--danger)]">{t(lang, "downed")}</span>}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {t(lang, "integrity")} {player.integrity}/{player.maxIntegrity} · {t(lang, "fate")} {player.fate} ·{" "}
                  {t(lang, "records")} {player.records}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {localized(getNode(player.node).name, lang)}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {t(lang, "aspect")}: {player.aspectId ? localized(aspectById(player.aspectId).name, lang) : t(lang, "none")}
                </div>
                {player.gear.length > 0 && (
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {t(lang, "gear")}: {player.gear.map((id) => localized(gearById(id).name, lang)).join(", ")}
                  </div>
                )}
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {t(lang, "evidence")}: {game.evidence.filter((token) => token.sourceSeat === player.seat && token.class === "accident").length}
                  {" / "}
                  {game.evidence.filter((token) => token.sourceSeat === player.seat && token.class === "intent").length}
                  {player.tags.length > 0 && <> · {player.tags.join(", ")}</>}
                </div>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-4 mb-2 text-xs uppercase tracking-widest text-[var(--muted)]">
          {t(lang, "yourSheet")}
        </h2>
        {/* The seat selector is navigation, not privacy. Hiding on a shared
            screen was theatre — anyone could tap it. On multi-screen play each
            device simply receives its own seat and this disappears. */}
        <div className="rounded border border-[var(--line)] p-2 text-xs">
          <div className="mb-2 flex items-center gap-1 text-[var(--muted)]">
            {t(lang, "claimSeat")}
            {seats.map((seat) => (
              <button
                key={seat}
                onClick={() => setClaimedSeat(seat)}
                className={`rounded border px-1.5 ${
                  claimedSeat === seat ? "border-[var(--accent)] text-[var(--text)]" : "border-[var(--line)]"
                }`}
              >
                {seat.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSheetSeat(claimedSeat)}
            className="w-full rounded border border-[var(--accent)] px-2 py-1.5 text-[var(--accent)]"
          >
            {t(lang, "yourSheet")} · {claimedSeat.toUpperCase()}
          </button>
        </div>
      </aside>

      {/* board */}
      <main className="relative min-h-0 rounded border border-[var(--line)] bg-[var(--panel)] p-2">
        <Board state={game} lang={lang} onMove={(node) => dispatch({ type: "moveTo", node })} />

        {/* Draft */}
        {game.draft && (
          <div className="absolute inset-0 grid place-items-center bg-[#05080a]/90 p-4">
            <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded border border-[var(--accent)] bg-[var(--panel)] p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">{t(lang, "draftTitle")}</div>
              <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
                {game.draft.seat.toUpperCase()} — {t(lang, "draftLead")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {game.draft.options.map((roleId) => {
                  const role = roleById(roleId);
                  return (
                    <button
                      key={roleId}
                      data-testid="draft-option"
                      onClick={() => dispatch({ type: "chooseRole", roleId })}
                      className="rounded border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]"
                    >
                      <div className="font-semibold">{localized(role.name, lang)}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {t(lang, "combat")} {role.stats.combat} · {t(lang, "intellect")} {role.stats.intellect} ·{" "}
                        {t(lang, "integrity")} {role.maxIntegrity}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {t(lang, "aspect")}: {localized(aspectById(role.aspectId).name, lang)}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--muted)]">
                        {t(lang, "gear")}:{" "}
                        {role.startingGear.length === 0
                          ? t(lang, "none")
                          : role.startingGear.map((id) => localized(gearById(id).name, lang)).join(", ")}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Handoff */}
        {handoff && !game.draft && (
          <div className="absolute inset-0 grid place-items-center bg-[#05080a]/95 p-4">
            <div className="w-full max-w-md rounded border border-[var(--accent)] bg-[var(--panel)] p-6 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">{t(lang, "handoffTitle")}</div>
              <h2 className="mt-2 text-xl font-semibold">
                {t(lang, "passTo", { seat: handoff.seats[handoff.index]!.toUpperCase() })}
              </h2>
              <p className="mt-1 mb-4 text-sm text-[var(--muted)]">{t(lang, "handoffLead")}</p>

              <div
                data-testid="handoff-reveal"
                className="mb-4 cursor-pointer select-none rounded border border-dashed border-[var(--line)] p-4"
                onPointerDown={() => {
                  handoffSeatRef.current = handoff.seats[handoff.index]!;
                  setRevealed(true);
                }}
                onPointerUp={() => setRevealed(false)}
                onPointerLeave={() => setRevealed(false)}
              >
                {revealed && handoffSeatRef.current === handoff.seats[handoff.index] ? (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[var(--muted)]">{t(lang, "directive")}</div>
                    <div className="mt-1 font-semibold">
                      {localized(
                        directiveById(playerAt(game.players, handoff.seats[handoff.index]!).mainDirectiveId).name,
                        lang,
                      )}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {localized(
                        directiveById(playerAt(game.players, handoff.seats[handoff.index]!).mainDirectiveId).text,
                        lang,
                      )}
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-widest text-[var(--muted)]">
                      {t(lang, "yourAspect")}
                    </div>
                    <div className="text-sm">
                      {localized(aspectById(playerAt(game.players, handoff.seats[handoff.index]!).aspectId).name, lang)}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--muted)]">{t(lang, "reveal")}</span>
                )}
              </div>

              <button
                onClick={() => {
                  if (handoff.index + 1 < handoff.seats.length) {
                    setHandoff({ ...handoff, index: handoff.index + 1 });
                  } else {
                    setHandoff(null);
                    setHandoffDone(true);
                  }
                }}
                className="rounded bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[#04121b]"
              >
                {handoff.index + 1 < handoff.seats.length ? t(lang, "seatDone") : t(lang, "beginTable")}
              </button>
            </div>
          </div>
        )}

        {/* Compel */}
        {yes && (
          <div className="absolute inset-0 grid place-items-center bg-[#05080a]/95 p-4">
            <div className="w-full max-w-md rounded border border-[var(--accent)] bg-[var(--panel)] p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
                {t(lang, "compelTitle", { invoker: yes.pending.invoker.toUpperCase(), target: yes.pending.target.toUpperCase() })}
              </div>
              <p className="mt-3 text-sm">{localized(yes.compel.text, lang)}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{t(lang, "compelLead")}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {localized(yes.aspect.name, lang)} · {t(lang, "fate")} {yes.target.fate}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => dispatch({ type: "respondCompel", accept: true })}
                  className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#04121b]"
                >
                  {t(lang, "accept")}
                </button>
                <button
                  onClick={() => dispatch({ type: "respondCompel", accept: false })}
                  disabled={!yes.waiver && yes.target.fate < 1}
                  className="rounded border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-30"
                >
                  {yes.waiver ? t(lang, "refuseFree") : t(lang, "refuse")}
                </button>
              </div>
              {!yes.waiver && yes.target.fate < 1 && (
                <p className="mt-2 text-xs text-[var(--danger)]">{t(lang, "cannotRefuse")}</p>
              )}
            </div>
          </div>
        )}

        {/* Assembly */}
        {vote && (
          <div className="absolute inset-0 grid place-items-center bg-[#05080a]/95 p-4">
            <div className="w-full max-w-md rounded border border-[var(--accent)] bg-[var(--panel)] p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">{t(lang, "assemblyTitle")}</div>
              <p className="mt-2 text-sm text-[var(--muted)]">{t(lang, "assemblyLead")}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {t(lang, "votesCast", { done: Object.keys(vote.votes).length, total: seats.length })} ·{" "}
                {t(lang, "waitingFor", { seat: game.seat.toUpperCase() })}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => dispatch({ type: "castVote", choice: "seal" })}
                  className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#04121b]"
                >
                  {t(lang, "sealBulkhead")}
                </button>
                <button
                  onClick={() => dispatch({ type: "castVote", choice: "hold" })}
                  className="rounded border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)]"
                >
                  {t(lang, "holdItOpen")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player sheet. Full-screen on purpose: it is a card you open and put
            down, not a corner of the screen the next player can read. When each
            player has a device this overlay disappears entirely — the device
            receives only its own seat's projection. */}
        {sheetSeat &&
          (() => {
            const view = project(game, sheetSeat).players[sheetSeat];
            const owner = game.players[sheetSeat];
            if (!view || !owner) return null;
            const modifiers = modifiersOf(owner.gear);
            const composition = (stat: "combat" | "intellect"): string => {
              const base = owner.stats[stat];
              const bonus = modifiers.reduce(
                (sum, modifier) =>
                  sum + (modifier.kind === "statBonus" && modifier.stat === stat ? modifier.bonus : 0),
                0,
              );
              return bonus > 0 ? `${base} +${bonus} = ${base + bonus}` : `${base}`;
            };
            const directive = view.mainDirectiveId ? directiveById(view.mainDirectiveId) : null;

            return (
              <div className="absolute inset-0 z-20 overflow-y-auto bg-[#05080a]/97 p-4">
                <div className="mx-auto w-full max-w-2xl rounded border border-[var(--accent)] bg-[var(--panel)] p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: SEAT_COLOR[sheetSeat] }}
                    />
                    <b>{sheetSeat.toUpperCase()}</b>
                    <span className="text-[var(--muted)]">
                      {owner.roleId ? localized(roleById(owner.roleId).name, lang) : t(lang, "none")}
                    </span>
                    <button
                      onClick={() => setSheetSeat(null)}
                      className="ml-auto rounded border border-[var(--line)] px-3 py-1 text-xs"
                    >
                      {t(lang, "back")}
                    </button>
                  </div>

                  <div className="mt-4 text-xs uppercase tracking-widest text-[var(--muted)]">
                    {t(lang, "directive")}
                  </div>
                  <div className="text-sm">{directive ? localized(directive.name, lang) : t(lang, "none")}</div>
                  {directive && (
                    <div className="text-xs text-[var(--muted)]">{localized(directive.text, lang)}</div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <span className="text-[var(--muted)]">{t(lang, "combat")}</span>
                    <span>{composition("combat")}</span>
                    <span className="text-[var(--muted)]">{t(lang, "intellect")}</span>
                    <span>{composition("intellect")}</span>
                    <span className="text-[var(--muted)]">{t(lang, "integrity")}</span>
                    <span>
                      {owner.integrity}/{owner.maxIntegrity}
                    </span>
                    <span className="text-[var(--muted)]">{t(lang, "fate")}</span>
                    <span>{owner.fate}</span>
                    <span className="text-[var(--muted)]">{t(lang, "records")}</span>
                    <span>{owner.records}</span>
                    <span className="text-[var(--muted)]">{t(lang, "yourAspect")}</span>
                    <span>{owner.aspectId ? localized(aspectById(owner.aspectId).name, lang) : t(lang, "none")}</span>
                    <span className="text-[var(--muted)]">{t(lang, "evidence")}</span>
                    <span>
                      {t(lang, "accident")}{" "}
                      {game.evidence.filter((token) => token.sourceSeat === sheetSeat && token.class === "accident").length}
                      {" · "}
                      {t(lang, "intent")}{" "}
                      {game.evidence.filter((token) => token.sourceSeat === sheetSeat && token.class === "intent").length}
                    </span>
                    <span className="text-[var(--muted)]">{t(lang, "tags")}</span>
                    <span>{owner.tags.length > 0 ? owner.tags.join(", ") : t(lang, "none")}</span>
                  </div>

                  <div className="mt-4 text-xs uppercase tracking-widest text-[var(--muted)]">
                    {t(lang, "gear")}
                  </div>
                  {owner.gear.length === 0 ? (
                    <div className="text-sm text-[var(--muted)]">{t(lang, "none")}</div>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm">
                      {owner.gear.map((id) => {
                        const item = gearById(id);
                        return (
                          <li key={id}>
                            <b>{localized(item.name, lang)}</b>
                            <span className="text-[var(--muted)]"> — {localized(item.text, lang)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })()}
      </main>

      {/* log */}
      <aside className="min-h-0 rounded border border-[var(--line)] bg-[var(--panel)] p-3">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-[var(--muted)]">{t(lang, "log")}</h2>
        <ol className="h-[calc(100%-2rem)] space-y-1 overflow-y-auto pr-1 text-xs leading-relaxed" aria-live="polite">
          {[...game.log].reverse().map((line, index) => (
            <li key={game.log.length - index} className="text-[var(--muted)]">
              {line}
            </li>
          ))}
        </ol>
      </aside>

      {/* controls */}
      <footer className="col-span-3 flex flex-col gap-2 rounded border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
        {game.phase === "space" && game.encounter && active && (() => {
          const card = anomalyById(game.encounter!.card);
          // The preview must show the number the engine will actually use:
          // gear bonuses are added to the stat, and the `hardTest` tag raises
          // the difficulty (Reckless #2). Showing the raw stat lied to the table.
          const gearBonus = gearTestBonus(active.gear, "anomaly", card.test.stat);
          const hard = active.tags.includes("hardTest");
          const statValue = active.stats[card.test.stat] + gearBonus;
          const difficulty = card.test.difficulty + (hard ? 1 : 0);
          const threatCost = card.declineCost.length > 0 ? 1 : 0;
          return (
            <div className="flex items-center gap-4 rounded border border-[var(--accent)] bg-[#0d1a22] px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm">
                  <b>{localized(card.name, lang)}</b>
                  <span className="text-[var(--muted)]"> · {t(lang, TIER_KEY[card.tier])}</span>
                </div>
                <div className="truncate text-xs text-[var(--muted)]">{localized(card.text, lang)}</div>
              </div>
              <div className="ml-auto whitespace-nowrap text-right text-xs text-[var(--muted)]">
                {t(lang, "testLine", {
                  stat: t(lang, card.test.stat === "combat" ? "combat" : "intellect"),
                  value: statValue,
                  difficulty,
                })}
              </div>
              <button
                onClick={() => dispatch({ type: "resolveAnomaly", choice: "contain" })}
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#04121b]"
              >
                {t(lang, "contain", { records: card.reward.records })}
              </button>
              <button
                onClick={() => dispatch({ type: "resolveAnomaly", choice: "decline" })}
                className="rounded border border-[var(--line)] px-3 py-1.5 text-sm"
              >
                {threatCost > 0 ? t(lang, "walkAwayCost", { threat: threatCost }) : t(lang, "walkAwayFree")}
              </button>
            </div>
          );
        })()}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => dispatch({ type: "rollMovement" })}
            disabled={game.phase !== "roll" || active?.downed}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#04121b] disabled:opacity-30"
          >
            {t(lang, "rollMovement")}
          </button>
          <button
            onClick={() => dispatch({ type: "endTurn" })}
            disabled={!(game.phase === "action" || (game.phase === "roll" && active?.downed))}
            className="rounded border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-30"
          >
            {t(lang, "endTurn")}
          </button>

          {game.phase === "move" && (
            <button
              onClick={() => dispatch({ type: "spendFateToReroll" })}
              disabled={(active?.fate ?? 0) < TUNING.fate.reroll}
              className="rounded border border-[var(--line)] px-3 py-2 text-xs disabled:opacity-30"
            >
              {t(lang, "fate")} · {TUNING.fate.reroll}
            </button>
          )}

          {game.draft === null && active?.downed && game.phase === "roll" && (
            <button
              onClick={() => dispatch({ type: "respawn" })}
              className="rounded border border-[var(--danger)] px-4 py-2 text-sm text-[var(--danger)]"
            >
              {t(lang, "respawn")}
            </button>
          )}

          {game.phase === "action" && active && !active.downed && !active.tags.includes("held") && !active.tags.includes("distracted") && (
            <>
              {activeNode?.kind === "core" && (
                <>
                  <button
                    onClick={() => dispatch({ type: "advanceProtocol" })}
                    className="rounded border border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)]"
                  >
                    {t(lang, "advanceProtocol", { difficulty: TUNING.protocol.difficulty })}
                  </button>
                  <button
                    onClick={() => dispatch({ type: "sabotageProtocol" })}
                    className="rounded border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]"
                  >
                    {t(lang, "sabotageProtocol")}
                  </button>
                  <button
                    onClick={() => dispatch({ type: "claimCapsule" })}
                    disabled={game.capsuleSeat !== null}
                    className="rounded border border-[var(--accent)] bg-[#0d1a22] px-3 py-2 text-sm text-[var(--accent)] disabled:opacity-30"
                  >
                    {game.capsuleSeat ? t(lang, "capsuleHeld", { seat: game.capsuleSeat.toUpperCase() }) : t(lang, "claimCapsule")}
                  </button>
                </>
              )}

              {activeNode?.kind === "checkpoint" &&
                (["combat", "intellect"] as const).map((stat) => {
                  const rule = progressionRule();
                  const atCap = active.stats[stat] >= rule.statCap;
                  return (
                    <button
                      key={`raise-${stat}`}
                      onClick={() => dispatch({ type: "raiseStat", stat })}
                      disabled={atCap || active.records < rule.pointsPerStep}
                      className="rounded border border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)] disabled:opacity-30"
                    >
                      {t(lang, "raiseStat", {
                        stat: t(lang, stat),
                        cost: rule.pointsPerStep,
                        value: active.stats[stat],
                      })}
                    </button>
                  );
                })}

              {game.hunters
                .filter((hunter) => hunter.node === active.node)
                .map((hunter) => (
                  <button
                    key={`confront-${hunter.id}`}
                    onClick={() => dispatch({ type: "confrontHunter", hunterId: hunter.id })}
                    className="rounded border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]"
                  >
                    {t(lang, "confront", { hunter: hunter.id })}
                  </button>
                ))}

              {game.dropped
                .filter((drop) => drop.node === active.node)
                .map((drop) => (
                  <button
                    key={`pick-${drop.itemId}`}
                    onClick={() => dispatch({ type: "pickUp", itemId: drop.itemId })}
                    className="rounded border border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)]"
                  >
                    {t(lang, "pickUp", { item: localized(gearById(drop.itemId).name, lang) })}
                  </button>
                ))}

              <button
                onClick={() => dispatch({ type: "rest" })}
                className="rounded border border-[var(--line)] px-3 py-2 text-sm"
              >
                {t(lang, "rest")}
              </button>

              {playersIn(game.players)
                .filter(
                  (other) =>
                    other.seat !== active.seat &&
                    other.downed &&
                    (other.node === active.node ||
                      (hasModifier(active.gear, "rescueAdjacent") &&
                        Math.abs(getNode(other.node).slot - getNode(active.node).slot) === 1 &&
                        getNode(other.node).ring === getNode(active.node).ring)),
                )
                .map((other) => (
                  <button
                    key={`rescue-${other.seat}`}
                    onClick={() => dispatch({ type: "rescue", target: other.seat })}
                    className="rounded border border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)]"
                  >
                    {t(lang, "rescue", { seat: other.seat.toUpperCase() })}
                  </button>
                ))}

              {BOARD.gates
                .filter((gate) => gate.a === active.node || gate.b === active.node)
                .filter((gate) => !(game.gates[gate.id]?.reopen !== undefined && game.gates[gate.id]!.reopen! > game.round))
                .map((gate) => (
                  <button
                    key={`seal-${gate.id}`}
                    onClick={() => dispatch({ type: "sealGate", gateId: gate.id })}
                    className="rounded border border-[var(--line)] px-3 py-2 text-xs"
                  >
                    {t(lang, "sealGate", { gate: gate.id })}
                  </button>
                ))}

              {active.gear
                .filter((id) => gearById(id).lifetime === "consumed")
                .map((id) => (
                  <button
                    key={`use-${id}`}
                    onClick={() => dispatch({ type: "useItem", itemId: id })}
                    className="rounded border border-[var(--line)] px-3 py-2 text-xs"
                  >
                    {t(lang, "useItem")} {localized(gearById(id).name, lang)}
                  </button>
                ))}

              {playersIn(game.players)
                .filter((other) => other.seat !== active.seat)
                .flatMap((other) => {
                  const aspect = aspectById(other.aspectId);
                  return aspect.compels
                    .map((compel, index) => ({ other, aspect, compel, index }))
                    .filter(({ compel }) => evalCondition(game, other.seat, compel.condition))
                    .map(({ other, aspect, compel, index }) => (
                      <button
                        key={`compel-${other.seat}-${index}`}
                        onClick={() =>
                          dispatch({
                            type: "compel",
                            target: other.seat,
                            aspectId: aspect.id,
                            compelIndex: index,
                          })
                        }
                        disabled={active.fate < TUNING.fate.invokeCompel}
                        title={localized(compel.text, lang)}
                        className="rounded border border-[var(--line)] px-3 py-2 text-xs disabled:opacity-30"
                      >
                        {t(lang, "compel")} {other.seat.toUpperCase()}
                      </button>
                    ));
                })}
            </>
          )}

          <span className="ml-2 text-sm">
            <b style={{ color: SEAT_COLOR[game.seat] }}>{game.seat.toUpperCase()}</b>
            <span className="text-[var(--muted)]"> · </span>
            <b>{active ? localized(getNode(active.node).name, lang) : ""}</b>
            {game.phase === "move" && active && (
              <span className="text-[var(--muted)]">
                {" "}
                · {t(lang, "chooseLanding", { count: reachableEndpoints(active.node, game.roll).length })}
              </span>
            )}
          </span>

          {error && <span className="ml-auto text-sm text-[var(--danger)]">{t(lang, "errorPrefix")}: {error}</span>}
        </div>

        {isDev && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-dashed border-[var(--line)] px-2 py-1 text-[10px] text-[var(--muted)]">
            <span className="uppercase tracking-widest">{t(lang, "devTools")}</span>
            {[1, 2, 3, 4, 5, 6].map((face) => (
              <button
                key={face}
                onClick={() => dispatch({ type: "devRoll", value: face })}
                disabled={game.phase !== "roll"}
                className="w-6 rounded border border-[var(--line)] disabled:opacity-25"
              >
                {face}
              </button>
            ))}
            <span>
              next {peekRolls(game.rng, 5).join(" ")} · {t(lang, "fingerprint")} {game.config}
            </span>
            <select
              value={devCard}
              onChange={(event) => setDevCard(event.target.value)}
              className="max-w-[12rem] rounded border border-[var(--line)] bg-transparent px-1 py-0.5 text-[10px] text-[var(--text)]"
            >
              {ANOMALIES.map((card) => (
                <option key={card.id} value={card.id} className="bg-[#0b141b]">
                  {card.id.replace("scp-", "")} · {localized(card.name, lang)}
                </option>
              ))}
            </select>
            <button
              onClick={() => dispatch({ type: "devEncounter", card: devCard })}
              disabled={game.encounter !== null}
              className="rounded border border-[var(--line)] px-2 disabled:opacity-25"
            >
              {t(lang, "forceCard")}
            </button>
            <button
              onClick={() => dispatch({ type: "devHurt", amount: 3 })}
              className="rounded border border-[var(--line)] px-2"
            >
              {t(lang, "damage")}
            </button>
            <button
              onClick={() => dispatch({ type: "devHurt", amount: 99 })}
              className="rounded border border-[var(--line)] px-2"
            >
              {t(lang, "down")}
            </button>
            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) dispatch({ type: "devEscalation", card: event.target.value });
                event.currentTarget.value = "";
              }}
              className="max-w-[11rem] rounded border border-[var(--line)] bg-transparent px-1 py-0.5 text-[10px] text-[var(--text)]"
            >
              <option value="" className="bg-[#0b141b]">{t(lang, "forceEscalation")}</option>
              {ESCALATION.map((card) => (
                <option key={card.id} value={card.id} className="bg-[#0b141b]">
                  {localized(card.name, lang)}
                </option>
              ))}
            </select>
            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) {
                  dispatch({ type: "devDirective", seat: game.seat, directiveId: event.target.value });
                }
                event.currentTarget.value = "";
              }}
              className="max-w-[11rem] rounded border border-[var(--line)] bg-transparent px-1 py-0.5 text-[10px] text-[var(--text)]"
            >
              <option value="" className="bg-[#0b141b]">{t(lang, "forceDirective")}</option>
              {MAIN_DIRECTIVES.map((directive) => (
                <option key={directive.id} value={directive.id} className="bg-[#0b141b]">
                  {localized(directive.name, lang)}
                </option>
              ))}
            </select>
            <button
              onClick={() => dispatch({ type: "devOutcome", terminal: "recontained" })}
              className="rounded border border-[var(--line)] px-2"
            >
              {t(lang, "siteRecontained")}
            </button>
            <button
              onClick={() => dispatch({ type: "devOutcome", terminal: "detonated" })}
              className="rounded border border-[var(--line)] px-2"
            >
              {t(lang, "siteLost")}
            </button>
            <span>{t(lang, "rolesCount", { count: ROLES.length })}</span>
          </div>
        )}
      </footer>
    </div>
  );
}
