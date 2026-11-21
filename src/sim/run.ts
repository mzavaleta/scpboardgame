/**
 * The simulator skeleton (§S9, M3a).
 *
 * §S9's contract says the simulator owns the tuning parameters, because "does it
 * feel right?" is not a measurement. This file is the *instrument*, not the
 * answer: it plays whole games with simple bots and reports what can be counted
 * today.
 *
 * **What it deliberately cannot report yet:** rounds-to-terminal, win rates by
 * alignment, breach-achievable rate, compels — all of them need a terminal state,
 * a threat track, a protocol track and an alignment, and none of those exist
 * until M3b/M3c. Reporting fake zeros for them would be worse than omitting them,
 * so the report says `null` and names the milestone that will fill it in.
 *
 * **Why bots are dumb on purpose:** §S9.2 asks for representative, not smart. Two
 * policies here differ in exactly one decision — pay for clearance, or gamble at
 * the gate — because that is the question M3a created.
 *
 * Pure: no I/O, no clock, no ambient randomness. `seedBase + index` is the whole
 * seed, so the same options always produce the same report (§S9.1).
 */

import { CONFIG_FINGERPRINT, clearancePrice } from "../config/tuning";
import { gatesAlong, getNode } from "../engine/board";
import { reachableEndpoints } from "../engine/movement";
import { createGame, reduce } from "../engine/reduce";
import { playerAt, seatsFor } from "../engine/types";
import type { RingId } from "../content/board";
import type { Action, GameState, SeatId } from "../engine/types";

export type Policy = "cautious" | "aggressive";

export type SimOptions = {
  readonly games: number;
  readonly players: readonly (2 | 3)[];
  /** A policy, or `"mixed"` to run both and compare them side by side. */
  readonly policy: Policy | "mixed";
  readonly seedBase: number;
  /**
   * Turn cap. Stands in for the missing terminal state: every game that reaches
   * it is a `capHit`, which is the honest way to say "we cannot yet tell how long
   * a real game is".
   */
  readonly maxRounds: number;
};

/** What one finished (or capped) game produced. */
export type GameSample = {
  readonly players: number;
  readonly policy: Policy;
  readonly rounds: number;
  readonly capHit: boolean;
  /** Deepest ring any seat reached: 0 outer, 1 middle, 2 inner, 3 core. */
  readonly maxDepth: number;
  readonly reachedInner: boolean;
  readonly reachedCore: boolean;
  readonly purchases: number;
  readonly recordsSpent: number;
  readonly gateAttempts: number;
  readonly gateFailures: number;
  readonly deaths: number;
  readonly draws: number;
};

export type SimRow = {
  readonly players: number;
  readonly policy: Policy;
  readonly games: number;
  readonly capHitShare: number;
  readonly roundsP50: number;
  readonly roundsP90: number;
  readonly reachedInnerShare: number;
  readonly reachedCoreShare: number;
  readonly purchasesPerGame: number;
  readonly recordsSpentPerGame: number;
  readonly gateFailureShare: number;
  readonly deathsPerGame: number;
  readonly drawsPerGame: number;
};

export type SimReport = {
  readonly command: string;
  readonly config: string;
  readonly games: number;
  readonly seedBase: number;
  readonly maxRounds: number;
  readonly rows: readonly SimRow[];
  readonly notMeasured: Readonly<Record<string, string>>;
};

const DEPTH: Readonly<Record<RingId, number>> = { outer: 0, middle: 1, inner: 2, core: 3 };

const depthOf = (nodeId: string): number => DEPTH[getNode(nodeId).ring];

/** Would crossing `gate` cost a test, under this seat's clearance and tags? */
function gateIsPassable(state: GameState, seat: SeatId, gate: { readonly clearance: number }): boolean {
  const player = playerAt(state.players, seat);
  return player.clearance >= gate.clearance || player.tags.includes("key");
}

/**
 * Where to walk. Talisman (§D26) means the die fixes the distance, so the bot
 * picks a destination and the choice is the whole decision.
 *
 * `cautious` only takes a destination whose *unavoidable* gates it can pass
 * without a test, and falls back to the deepest same-ring space when every route
 * is a gamble. `aggressive` takes the deepest landing it can reach and lets the
 * dice decide.
 */
function pickDestination(state: GameState, policy: Policy): string {
  const player = playerAt(state.players, state.seat);
  const options = reachableEndpoints(player.node, state.roll);
  if (options.length === 0) return player.node;

  const passable = (node: string): boolean =>
    gatesAlong(player.node, node, state.roll).every((gate) => gateIsPassable(state, state.seat, gate));

  const deepest = (nodes: readonly string[]): string =>
    [...nodes].sort((a, b) => depthOf(b) - depthOf(a) || (a < b ? -1 : a > b ? 1 : 0))[0]!;

  if (policy === "aggressive") return deepest(options);

  // Cautious: take a route it can open for free; if there is none, stay at the
  // current depth and keep containing anomalies rather than gambling at a gate it
  // cannot pay for. That is the strategy M3a made possible, so the simulator has
  // to be able to play it.
  //
  // One extra guard, found by running the thing: the Command Center is reachable
  // through G5/G6 (clearance 4), and every way *out* of it is the same pair of
  // gates. Entering on clearance 3 — or on a one-shot key — traps the seat, which
  // is a real board finding, not a bot bug. The bot therefore refuses the core
  // until it can pay for the way in.
  const enterable = (node: string): boolean =>
    getNode(node).ring !== "core" || player.clearance >= 4;

  const passableOptions = options.filter((node) => enterable(node) && passable(node));
  if (passableOptions.length > 0) return deepest(passableOptions);

  const currentDepth = depthOf(player.node);
  const stay = options.filter((node) => enterable(node) && depthOf(node) <= currentDepth);
  return deepest(stay.length > 0 ? stay : options);
}

/** One action, chosen from the policy. Never reads anything a player could not. */
function chooseAction(state: GameState, policy: Policy): Action | null {
  const player = playerAt(state.players, state.seat);

  switch (state.phase) {
    case "roll":
      return player.downed ? { type: "respawn" } : { type: "rollMovement" };
    case "move":
      return { type: "moveTo", node: pickDestination(state, policy) };
    case "space":
      // §S9.2 skeleton: both policies contain. Declining is priced by D30 and
      // that decision does not exist yet, so a bot that declined would be
      // answering a question the game has not asked.
      return state.encounter ? { type: "resolveAnomaly", choice: "contain" } : null;
    case "action": {
      if (policy === "cautious") {
        const level = player.clearance < 4 ? player.clearance + 1 : null;
        if (level && getNode(player.node).kind === "checkpoint") {
          const price = clearancePrice(level as 2 | 3 | 4);
          if (player.records >= price) return { type: "attemptClearance", level };
        }
      }
      return { type: "endTurn" };
    }
    default:
      return null;
  }
}

const count = (lines: readonly string[], pattern: RegExp): number =>
  lines.filter((line) => pattern.test(line)).length;

/** Plays one game to the turn cap and returns what it measured. */
export function playGame(policy: Policy, players: 2 | 3, seed: number, maxRounds: number): GameSample {
  let state = createGame(seed, seatsFor(players));

  let maxDepth = 0;
  let reachedInner = false;
  let reachedCore = false;
  let recordsSpent = 0;
  let deaths = 0;

  for (const seat of seatsFor(players)) {
    const player = state.players[seat];
    if (player) maxDepth = Math.max(maxDepth, depthOf(player.node));
  }

  // Every action either advances the phase or changes the seat, so the bound is
  // generous but finite: a bug that loops forever fails loudly instead of hanging.
  const actionBudget = maxRounds * players * 40;

  for (let step = 0; step < actionBudget && state.round <= maxRounds; step += 1) {
    const before = state;
    const action = chooseAction(state, policy);
    if (!action) break;

    const result = reduce(state, action);
    if (!result.ok) break;
    state = result.value;

    for (const seat of seatsFor(players)) {
      const player = state.players[seat];
      if (!player) continue;
      const depth = depthOf(player.node);
      maxDepth = Math.max(maxDepth, depth);
      if (depth >= 2) reachedInner = true;
      if (depth >= 3) reachedCore = true;
      if (!before.players[seat]?.downed && player.downed) deaths += 1;
    }

    if (action.type === "attemptClearance") {
      const paid = (before.players[state.seat]?.records ?? 0) - (playerAt(state.players, state.seat).records);
      recordsSpent += paid;
    }
  }

  const log = state.log;
  const gateFailures = count(log, /^\s+the gate holds\.$/);
  const gateCrossedFree = count(log, /^\s+crossed G\d+ on clearance \d+\.$/);
  const gateCrossedByTest = count(log, /^\s+crossed G\d+\.$/);
  const draws = count(log, /^\s+.+ is here\.$/);
  const purchases = count(log, /bought clearance \d+ → \d+/);

  return {
    players,
    policy,
    rounds: Math.min(state.round, maxRounds),
    capHit: state.round > maxRounds,
    maxDepth,
    reachedInner,
    reachedCore,
    purchases,
    recordsSpent,
    gateAttempts: gateFailures + gateCrossedFree + gateCrossedByTest,
    gateFailures,
    deaths,
    draws,
  };
}

function quantile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index] as number;
}

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const share = (values: readonly boolean[]): number =>
  values.length === 0 ? 0 : values.filter(Boolean).length / values.length;

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

function summarize(samples: readonly GameSample[]): SimRow {
  const first = samples[0]!;
  const rounds = samples.map((sample) => sample.rounds).sort((a, b) => a - b);
  const attempts = samples.reduce((sum, sample) => sum + sample.gateAttempts, 0);
  const failures = samples.reduce((sum, sample) => sum + sample.gateFailures, 0);

  return {
    players: first.players,
    policy: first.policy,
    games: samples.length,
    capHitShare: round3(share(samples.map((sample) => sample.capHit))),
    roundsP50: quantile(rounds, 0.5),
    roundsP90: quantile(rounds, 0.9),
    reachedInnerShare: round3(share(samples.map((sample) => sample.reachedInner))),
    reachedCoreShare: round3(share(samples.map((sample) => sample.reachedCore))),
    purchasesPerGame: round3(mean(samples.map((sample) => sample.purchases))),
    recordsSpentPerGame: round3(mean(samples.map((sample) => sample.recordsSpent))),
    gateFailureShare: attempts === 0 ? 0 : round3(failures / attempts),
    deathsPerGame: round3(mean(samples.map((sample) => sample.deaths))),
    drawsPerGame: round3(mean(samples.map((sample) => sample.draws))),
  };
}

/**
 * §S9.5: the markdown report is what gets committed next to a balance change, so
 * nobody hand-copies numbers into the document. Thresholds are not marked PASS /
 * FAIL yet — §S9.4 measures rounds-to-terminal, which needs M3b — and inventing a
 * verdict would be worse than showing the raw number.
 */
export function toMarkdown(report: SimReport): string {
  const lines = [
    "# Simulator report",
    "",
    `Command: \`pnpm ${report.command}\``,
    `Tuning fingerprint: \`cfg ${report.config}\` · ${report.games} games · cap ${report.maxRounds} rounds`,
    "",
    "| Players | Policy | Games | Cap hit | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |",
    "| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |",
    ...report.rows.map(
      (row) =>
        `| ${row.players} | ${row.policy} | ${row.games} | ${Math.round(row.capHitShare * 100)}% | ` +
        `${row.roundsP50} | ${row.roundsP90} | ${Math.round(row.reachedInnerShare * 100)}% | ` +
        `${Math.round(row.reachedCoreShare * 100)}% | ${row.purchasesPerGame} | ` +
        `${row.recordsSpentPerGame} | ${Math.round(row.gateFailureShare * 100)}% | ` +
        `${row.deathsPerGame} | ${row.drawsPerGame} |`,
    ),
    "",
    "## Not measured yet",
    "",
    "| Metric | Waiting on |",
    "| --- | --- |",
    ...Object.entries(report.notMeasured).map(([metric, reason]) => `| \`${metric}\` | ${reason} |`),
    "",
  ];

  return lines.join("\n");
}

export function runSimulation(options: SimOptions): SimReport {
  const policies: readonly Policy[] =
    options.policy === "mixed" ? ["cautious", "aggressive"] : [options.policy];

  const samples = new Map<string, GameSample[]>();
  let index = 0;

  for (const players of options.players) {
    for (const policy of policies) {
      for (let game = 0; game < options.games; game += 1) {
        const seed = (options.seedBase + index) >>> 0;
        index += 1;
        const key = `${players}/${policy}`;
        const bucket = samples.get(key) ?? [];
        bucket.push(playGame(policy, players, seed, options.maxRounds));
        samples.set(key, bucket);
      }
    }
  }

  const rows = [...samples.values()].map(summarize);

  return {
    command:
      `sim --games ${options.games} --players ${options.players.join(",")} ` +
      `--policy ${options.policy} --seed-base ${options.seedBase} --max-rounds ${options.maxRounds}`,
    config: CONFIG_FINGERPRINT,
    games: options.games * options.players.length * policies.length,
    seedBase: options.seedBase,
    maxRounds: options.maxRounds,
    rows,
    notMeasured: {
      roundsToTerminal: "M3b — needs a terminal state",
      winRateByAlignment: "M3b/M3c — needs alignments and both terminal states",
      breachAchievableRate: "M3c — needs breach directives",
      compelsPerGame: "M3c — needs the protocol track",
      deckExhaustion: "M3b — needs a depleted pile to be observable (D27 draws never deplete)",
    },
  };
}
