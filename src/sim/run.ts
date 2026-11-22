/**
 * The simulator (§S9, M3a → M4).
 *
 * The instrument owns the tuning parameters, because "does it feel right?" is not
 * a measurement. It plays whole games through the real reducer, with bots that
 * consume state exactly like a player (no hidden information), and reports what
 * can be counted — now including alignment, compels, hunters and the thresholds
 * §S9.4 names.
 *
 * **Pure:** no I/O, no clock, no ambient randomness. `seedBase + index` is the
 * whole seed, so the same options always produce the same report (§S9.1).
 */

import { CONFIG_FINGERPRINT, protocolRule, progressionRule } from "../config/tuning";
import { BOARD } from "../content/board";
import { directiveById } from "../content/directives";
import { aspectById, roleById } from "../content/roles";
import { gatesAlong, getNode, ringDepth } from "../engine/board";
import { evalCondition } from "../engine/conditions";
import { deckForNode } from "../engine/encounter";
import { reachableEndpoints } from "../engine/movement";
import { createGame, reduce } from "../engine/reduce";
import { playerAt, playersIn, seatsFor } from "../engine/types";
import type { Alignment, Action, GameState, SeatId } from "../engine/types";

export type Policy = "cautious" | "aggressive";

export type SimOptions = {
  readonly games: number;
  readonly players: readonly (2 | 3)[];
  /** A policy, or `"mixed"` to run both and compare them side by side. */
  readonly policy: Policy | "mixed";
  readonly seedBase: number;
  readonly maxRounds: number;
};

export type RoleCount = { readonly seats: number; readonly wins: number };

/** What one finished (or capped) game produced. */
export type GameSample = {
  readonly players: number;
  readonly policy: Policy;
  readonly rounds: number;
  readonly capHit: boolean;
  readonly terminal: "recontained" | "detonated" | null;
  readonly maxDepth: number;
  readonly reachedInner: boolean;
  readonly reachedCore: boolean;
  readonly purchases: number;
  readonly recordsSpent: number;
  readonly gateAttempts: number;
  readonly gateFailures: number;
  readonly deaths: number;
  readonly draws: number;
  readonly containmentSeats: number;
  readonly breachSeats: number;
  readonly containmentWins: number;
  readonly breachWins: number;
  readonly breachConditionMet: number;
  readonly compels: number;
  readonly votes: number;
  readonly hazards: number;
  readonly declines: number;
  readonly roleSeats: Readonly<Record<string, number>>;
  readonly roleWins: Readonly<Record<string, number>>;
};

export type SimRow = {
  readonly players: number;
  readonly policy: Policy;
  readonly games: number;
  readonly capHitShare: number;
  readonly detonatedShare: number;
  readonly recontainedShare: number;
  readonly roundsToTerminalP50: number;
  readonly roundsP50: number;
  readonly roundsP90: number;
  readonly reachedInnerShare: number;
  readonly reachedCoreShare: number;
  readonly purchasesPerGame: number;
  readonly recordsSpentPerGame: number;
  readonly gateFailureShare: number;
  readonly deathsPerGame: number;
  readonly drawsPerGame: number;
  readonly containmentWinRate: number;
  readonly breachWinRate: number;
  readonly breachAchievableShare: number;
  readonly compelsPerGame: number;
  readonly votesPerGame: number;
  readonly hazardsPerGame: number;
  readonly declinesPerGame: number;
  readonly roleWinRates: Readonly<Record<string, number>>;
};

export type Threshold = {
  readonly id: string;
  readonly target: string;
  readonly value: string;
  readonly verdict: "PASS" | "FAIL" | "N/A";
};

export type SimReport = {
  readonly command: string;
  readonly config: string;
  readonly games: number;
  readonly seedBase: number;
  readonly maxRounds: number;
  readonly rows: readonly SimRow[];
  readonly thresholds: readonly Threshold[];
  readonly notMeasured: Readonly<Record<string, string>>;
};

const depthOf = ringDepth;

/** Would the bot cross `gate` without a fight? §14k.4 makes it a condition, not clearance. */
function gateIsPassable(state: GameState, seat: SeatId, gate: { readonly id: string }): boolean {
  const player = playerAt(state.players, seat);
  const status = state.gates[gate.id];
  if (!status) return true;
  if (status.reopen !== undefined && status.reopen > state.round) return false;
  if (status.condition === "open") return true;
  // A guard is a fight the cautious bot avoids; a lock opens with a key or a roll.
  if (status.condition === "guarded") return false;
  return player.tags.includes("key") || player.stats.intellect >= 3;
}

function alignmentOf(state: GameState, seat: SeatId): Alignment {
  return directiveById(playerAt(state.players, seat).mainDirectiveId).alignment;
}

function roleChoice(state: GameState, policy: Policy): string {
  const options = state.draft?.options ?? [];
  const scored = [...options].sort((a, b) => {
    const left = roleById(a);
    const right = roleById(b);
    const value = (role: typeof left): number =>
      policy === "cautious" ? role.stats.intellect : role.stats.combat;
    return value(right) - value(left) || (a < b ? -1 : 1);
  });
  return scored[0] ?? "d-class";
}

/**
 * Where to walk. Talisman (§D26) means the die fixes the distance, so the bot
 * picks a destination and the choice is the whole decision.
 */
function pickDestination(state: GameState, policy: Policy): string {
  const player = playerAt(state.players, state.seat);
  const options = reachableEndpoints(player.node, state.roll);
  if (options.length === 0) return player.node;

  const passable = (node: string): boolean =>
    gatesAlong(player.node, node, state.roll).every((gate) => gateIsPassable(state, state.seat, gate));

  const rank = (node: string): number =>
    depthOf(node) * 10 + (deckForNode(node) === null ? 0 : 1);
  const deepest = (nodes: readonly string[]): string =>
    [...nodes].sort((a, b) => rank(b) - rank(a) || (a < b ? -1 : a > b ? 1 : 0))[0]!;

  if (policy === "aggressive") {
    // Gamble at the gate: the only destinations it refuses are sealed ones.
    const open = options.filter((node) =>
      gatesAlong(player.node, node, state.roll).every((gate) => {
        const reopen = state.gates[gate.id]?.reopen;
        return reopen === undefined || reopen <= state.round;
      }),
    );
    return deepest(open.length > 0 ? open : options);
  }

  // Cautious: take a route it can open for free; otherwise stay at depth and
  // keep containing.
  const enterable = (_node: string): boolean => true;

  const passableOptions = options.filter((node) => enterable(node) && passable(node));
  if (passableOptions.length > 0) return deepest(passableOptions);

  const currentDepth = depthOf(player.node);
  const stay = options.filter((node) => enterable(node) && depthOf(node) <= currentDepth);
  return deepest(stay.length > 0 ? stay : options);
}

/** The first legal compel this bot can afford, if any. Never reads hidden information. */
function pickCompel(state: GameState, policy: Policy): Action | null {
  const player = playerAt(state.players, state.seat);
  const minimum = policy === "cautious" ? 2 : 1;
  if (player.fate < minimum) return null;
  // Mirror the reducer's own gate (§C3.5): one compel per turn, and the invoker
  // must actually be able to act. Without this the bot chose actions it could
  // not take, and the sample stopped silently — the instrument lied.
  if (player.downed || player.tags.includes("held") || player.tags.includes("distracted")) return null;
  if (state.turnEvents.some((event) => event.seat === state.seat && event.event === "compelled")) return null;

  for (const other of playersIn(state.players)) {
    if (other.seat === state.seat || !other.aspectId) continue;
    const aspect = aspectById(other.aspectId);
    for (let index = 0; index < aspect.compels.length; index += 1) {
      const compel = aspect.compels[index]!;
      if (evalCondition(state, other.seat, compel.condition)) {
        return { type: "compel", target: other.seat, aspectId: aspect.id, compelIndex: index };
      }
    }
  }
  return null;
}

/** One action, chosen from the policy. Never reads anything a player could not. */
function chooseAction(state: GameState, policy: Policy): Action | null {
  if (state.outcome) return null;
  if (state.draft) return { type: "chooseRole", roleId: roleChoice(state, policy) };
  if (state.pendingCompel) return { type: "respondCompel", accept: true };
  if (state.vote) return { type: "castVote", choice: policy === "cautious" ? "seal" : "hold" };

  const player = playerAt(state.players, state.seat);

  switch (state.phase) {
    case "roll":
      return player.downed ? { type: "respawn" } : { type: "rollMovement" };
    case "move":
      return { type: "moveTo", node: pickDestination(state, policy) };
    case "space":
      return state.encounter ? { type: "resolveAnomaly", choice: "contain" } : null;
    case "action": {
      // A held or distracted seat cannot act, and the reducer says so; the bot
      // must not ask for an action it cannot take (it stopped samples silently).
      if (player.downed || player.tags.includes("held") || player.tags.includes("distracted")) {
        return { type: "endTurn" };
      }
      const atCore = getNode(player.node).kind === "core";
      const breach = alignmentOf(state, state.seat) === "breach";

      // Breach play is its directive: hold the protocol down, and seal gates.
      if (breach && atCore && state.protocolSteps > 0) return { type: "sabotageProtocol" };
      if (breach && player.counters.sealedGates < 2) {
        const gate = BOARD.gates.find((candidate) => candidate.a === player.node || candidate.b === player.node);
        if (gate) return { type: "sealGate", gateId: gate.id };
      }

      // L15: the capsule is a win; a bot that can take it, takes it.
      if (atCore && state.capsuleSeat === null) return { type: "claimCapsule" };

      if (!breach && atCore && state.protocolSteps < protocolRule().steps) return { type: "advanceProtocol" };

      const compel = pickCompel(state, policy);
      if (compel) return compel;

      if (player.integrity * 2 < player.maxIntegrity && !player.tags.includes("rested")) return { type: "rest" };

      if (policy === "cautious" && getNode(player.node).kind === "checkpoint") {
        const rule = progressionRule();
        const stat = player.stats.combat <= player.stats.intellect ? "combat" : "intellect";
        if (player.stats[stat] < rule.statCap && player.records >= rule.pointsPerStep) {
          return { type: "raiseStat", stat };
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
  let state = createGame(seed, seatsFor(players), { draft: true });

  let maxDepth = 0;
  let reachedInner = false;
  let reachedCore = false;
  let recordsSpent = 0;
  let deaths = 0;

  for (const seat of seatsFor(players)) {
    const player = state.players[seat];
    if (player) maxDepth = Math.max(maxDepth, depthOf(player.node));
  }

  const actionBudget = maxRounds * players * 60;

  for (let step = 0; step < actionBudget && state.round <= maxRounds && !state.outcome; step += 1) {
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

    if (action.type === "raiseStat") {
      const paid = (before.players[state.seat]?.records ?? 0) - (playerAt(state.players, state.seat).records);
      recordsSpent += paid;
    }
  }

  const log = state.log;
  const gateFailures = count(log, /^\s+the gate holds\.$/);
  const gateCrossedFree = count(log, /^\s+crossed G\d+ on clearance \d+\.$/);
  const gateCrossedByTest = count(log, /^\s+crossed G\d+\.$/);
  const draws = count(log, /^\s+.+ is here\.$/);
  const purchases = count(log, /raised (combat|intellect) to \d+/);

  const seats = playersIn(state.players);
  const containmentSeats = seats.filter((player) => playerRoleAlignment(state, player.seat) === "containment").length;
  const breachSeats = seats.length - containmentSeats;
  const winners = state.outcome?.winners ?? [];

  let containmentWins = 0;
  let breachWins = 0;
  let breachConditionMet = 0;
  const roleSeats: Record<string, number> = {};
  const roleWins: Record<string, number> = {};

  for (const player of seats) {
    if (player.roleId) roleSeats[player.roleId] = (roleSeats[player.roleId] ?? 0) + 1;
    const alignment = playerRoleAlignment(state, player.seat);
    const won = winners.includes(player.seat);
    if (won) {
      if (alignment === "containment") containmentWins += 1;
      else breachWins += 1;
      if (player.roleId) roleWins[player.roleId] = (roleWins[player.roleId] ?? 0) + 1;
    }
    if (alignment === "breach" && state.outcome) {
      const directive = directiveById(player.mainDirectiveId);
      if (evalCondition(state, player.seat, directive.condition, state.outcome.terminal)) breachConditionMet += 1;
    }
  }

  return {
    players,
    policy,
    rounds: Math.min(state.round, maxRounds),
    capHit: state.outcome === null,
    terminal: state.outcome?.terminal ?? null,
    maxDepth,
    reachedInner,
    reachedCore,
    purchases,
    recordsSpent,
    gateAttempts: gateFailures + gateCrossedFree + gateCrossedByTest,
    gateFailures,
    deaths,
    draws,
    containmentSeats,
    breachSeats,
    containmentWins,
    breachWins,
    breachConditionMet,
    compels: count(log, / compels /),
    votes: count(log, /Emergency Assembly/),
    hazards: count(log, /stalled three turns/),
    declines: count(log, /walked away/),
    roleSeats,
    roleWins,
  };
}

/** A respawned seat's directive is final; callers read the live player. */
function playerRoleAlignment(state: GameState, seat: SeatId): Alignment {
  return directiveById(playerAt(state.players, seat).mainDirectiveId).alignment;
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
  const ended = samples
    .filter((sample) => sample.terminal !== null)
    .map((sample) => sample.rounds)
    .sort((a, b) => a - b);
  const attempts = samples.reduce((sum, sample) => sum + sample.gateAttempts, 0);
  const failures = samples.reduce((sum, sample) => sum + sample.gateFailures, 0);
  const containmentSeats = samples.reduce((sum, sample) => sum + sample.containmentSeats, 0);
  const breachSeats = samples.reduce((sum, sample) => sum + sample.breachSeats, 0);
  const containmentWins = samples.reduce((sum, sample) => sum + sample.containmentWins, 0);
  const breachWins = samples.reduce((sum, sample) => sum + sample.breachWins, 0);
  const breachMet = samples.reduce((sum, sample) => sum + sample.breachConditionMet, 0);

  const roleSeats: Record<string, number> = {};
  const roleWins: Record<string, number> = {};
  for (const sample of samples) {
    for (const [role, seats] of Object.entries(sample.roleSeats)) roleSeats[role] = (roleSeats[role] ?? 0) + seats;
    for (const [role, wins] of Object.entries(sample.roleWins)) roleWins[role] = (roleWins[role] ?? 0) + wins;
  }
  const roleWinRates = Object.fromEntries(
    Object.entries(roleSeats).map(([role, seats]) => [role, round3((roleWins[role] ?? 0) / seats)]),
  );

  return {
    players: first.players,
    policy: first.policy,
    games: samples.length,
    capHitShare: round3(share(samples.map((sample) => sample.capHit))),
    detonatedShare: round3(share(samples.map((sample) => sample.terminal === "detonated"))),
    recontainedShare: round3(share(samples.map((sample) => sample.terminal === "recontained"))),
    roundsToTerminalP50: ended.length === 0 ? 0 : quantile(ended, 0.5),
    roundsP50: quantile(rounds, 0.5),
    roundsP90: quantile(rounds, 0.9),
    reachedInnerShare: round3(share(samples.map((sample) => sample.reachedInner))),
    reachedCoreShare: round3(share(samples.map((sample) => sample.reachedCore))),
    purchasesPerGame: round3(mean(samples.map((sample) => sample.purchases))),
    recordsSpentPerGame: round3(mean(samples.map((sample) => sample.recordsSpent))),
    gateFailureShare: attempts === 0 ? 0 : round3(failures / attempts),
    deathsPerGame: round3(mean(samples.map((sample) => sample.deaths))),
    drawsPerGame: round3(mean(samples.map((sample) => sample.draws))),
    containmentWinRate: containmentSeats === 0 ? 0 : round3(containmentWins / containmentSeats),
    breachWinRate: breachSeats === 0 ? 0 : round3(breachWins / breachSeats),
    breachAchievableShare: breachSeats === 0 ? 0 : round3(breachMet / breachSeats),
    compelsPerGame: round3(mean(samples.map((sample) => sample.compels))),
    votesPerGame: round3(mean(samples.map((sample) => sample.votes))),
    hazardsPerGame: round3(mean(samples.map((sample) => sample.hazards))),
    declinesPerGame: round3(mean(samples.map((sample) => sample.declines))),
    roleWinRates,
  };
}

/** §S9.4 thresholds: report, never round off. Some are only meaningful at 4 seats. */
function thresholdsFor(rows: readonly SimRow[]): Threshold[] {
  const row = rows.find((candidate) => candidate.policy === "aggressive") ?? rows[0];
  if (!row) return [];

  const medianRounds = Math.min(...rows.map((candidate) => candidate.roundsToTerminalP50 || Number.POSITIVE_INFINITY));
  const compelsPerPlayerPer3 = row.players === 0 ? 0 : (row.compelsPerGame / row.players) * (3 / Math.max(1, row.roundsP50));
  const deaths = Math.max(...rows.map((candidate) => candidate.deathsPerGame));
  const worstRole = Math.min(...Object.values(row.roleWinRates));
  const bestRole = Math.max(...Object.values(row.roleWinRates));

  return [
    {
      id: "median-rounds",
      target: "12–18",
      value: String(medianRounds),
      verdict: medianRounds >= 12 && medianRounds <= 18 ? "PASS" : "FAIL",
    },
    {
      id: "compels-per-player-per-3-rounds",
      target: ">= 1",
      value: round3(compelsPerPlayerPer3).toFixed(2),
      verdict: compelsPerPlayerPer3 >= 1 ? "PASS" : "FAIL",
    },
    {
      id: "deaths-per-game",
      target: "<= 1.5",
      value: deaths.toFixed(2),
      verdict: deaths <= 1.5 ? "PASS" : "FAIL",
    },
    {
      id: "breach-achievable",
      target: ">= 0.80",
      value: row.breachAchievableShare.toFixed(2),
      verdict: row.breachAchievableShare >= 0.8 ? "PASS" : "FAIL",
    },
    {
      id: "role-win-spread",
      target: "every role 0.20–0.40",
      value: `${worstRole.toFixed(2)}–${bestRole.toFixed(2)}`,
      verdict: worstRole >= 0.2 && bestRole <= 0.4 ? "PASS" : "FAIL",
    },
    {
      id: "deck-exhaustion",
      target: "no pile exhausted",
      value: "not observable",
      verdict: "N/A",
    },
  ];
}

/**
 * §S9.5: the markdown report is what gets committed next to a balance change, so
 * nobody hand-copies numbers into the document.
 */
export function toMarkdown(report: SimReport): string {
  const lines = [
    "# Simulator report",
    "",
    `Command: \`pnpm ${report.command}\``,
    `Tuning fingerprint: \`cfg ${report.config}\` · ${report.games} games · cap ${report.maxRounds} rounds`,
    "",
    "| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |",
    "| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |",
    ...report.rows.map(
      (row) =>
        `| ${row.players} | ${row.policy} | ${row.games} | ${pct(row.capHitShare)} | ` +
        `${pct(row.detonatedShare)} | ${pct(row.recontainedShare)} | ` +
        `${row.roundsToTerminalP50} | ` +
        `${row.roundsP50} | ${row.roundsP90} | ${pct(row.reachedInnerShare)} | ` +
        `${pct(row.reachedCoreShare)} | ${row.purchasesPerGame} | ` +
        `${row.recordsSpentPerGame} | ${pct(row.gateFailureShare)} | ` +
        `${row.deathsPerGame} | ${row.drawsPerGame} |`,
    ),
    "",
    "## The political layer",
    "",
    "| Players | Policy | Containment win | Breach win | Breach achievable | Compels / game | Votes / game | Hazards / game | Declines / game |",
    "| --: | --- | --: | --: | --: | --: | --: | --: | --: |",
    ...report.rows.map(
      (row) =>
        `| ${row.players} | ${row.policy} | ${pct(row.containmentWinRate)} | ${pct(row.breachWinRate)} | ` +
        `${pct(row.breachAchievableShare)} | ${row.compelsPerGame} | ${row.votesPerGame} | ` +
        `${row.hazardsPerGame} | ${row.declinesPerGame} |`,
    ),
    "",
    "## Thresholds (§S9.4)",
    "",
    "| Threshold | Target | Measured | Verdict |",
    "| --- | --- | ---: | --- |",
    ...report.thresholds.map(
      (threshold) => `| \`${threshold.id}\` | ${threshold.target} | ${threshold.value} | **${threshold.verdict}** |`,
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

const pct = (value: number): string => `${Math.round(value * 100)}%`;

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
    thresholds: thresholdsFor(rows),
    notMeasured: {
      deckExhaustion: "not observable by design — D27 draws never deplete a pile",
      sideDirectives: "cut from the MVP (§14b)",
      compelsByPolicyPair: "needs a per-pair matrix, not a per-table aggregate",
    },
  };
}
