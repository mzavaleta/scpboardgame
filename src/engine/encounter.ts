/**
 * Encounter machinery (§S2 `space` phase, §C2, §5).
 *
 * Three small pure pieces: which pile a landing node draws from, how a 4dF test
 * becomes an outcome tier, and how a card is drawn without breaking the
 * seed-addressable RNG.
 */

import { ANOMALY_BY_ID } from "../content/anomalies";
import { getNode } from "./board";
import { nextInt, roll4dF } from "./rng";
import { playerAt } from "./types";
import type { DeckId, GameState, Outcome, SeatId, Stat, TestResult } from "./types";

/**
 * §C2.2 draw bands. Three independent piles, never one filtered deck: filtering
 * breaks the moment a tier runs dry.
 */
export function deckForNode(nodeId: string): DeckId | null {
  const node = getNode(nodeId);
  if (node.kind === "lab" && node.ring === "outer") return "safe";
  if (node.kind === "lab" && node.ring === "middle") return "euclid";
  if (node.kind === "cell" && (node.ring === "middle" || node.ring === "inner")) return "keter";
  return null;
}

/** §5, the tier table. The law: content never invents its own ladder. */
export function tierOf(shift: number): Outcome {
  if (shift >= 3) return "clean";
  if (shift >= 1) return "success";
  if (shift === 0) return "collateral";
  if (shift >= -2) return "failure";
  return "breach";
}

/**
 * Draw the top card of a pile, chosen from the seed stream.
 *
 * The pile is stored as remaining ids, so the draw is a uniform index into what
 * is left and the whole thing stays a pure function of `(seed, cursor)`.
 */
export function drawAnomaly(
  state: GameState,
  deck: DeckId,
): { readonly state: GameState; readonly card: string | null } {
  const pile = state.decks[deck];
  if (pile.length === 0) return { state, card: null };

  const [index, rng] = nextInt(state.rng, 0, pile.length - 1);
  const card = pile[index];
  if (card === undefined) return { state, card: null };

  return {
    state: {
      ...state,
      rng,
      decks: { ...state.decks, [deck]: pile.filter((_, at) => at !== index) },
    },
    card,
  };
}

/** `4dF + stat - difficulty`, recorded on the state so the table can see it. */
export function rollTest(
  state: GameState,
  seat: SeatId,
  stat: Stat,
  difficulty: number,
  kind: "gate" | "anomaly",
): { readonly state: GameState; readonly result: TestResult } {
  const [dice, rng] = roll4dF(state.rng);
  const statValue = playerAt(state.players, seat).stats[stat];
  const shift = dice + statValue - difficulty;

  const result: TestResult = {
    kind,
    seat,
    stat,
    difficulty,
    statValue,
    dice,
    shift,
    outcome: tierOf(shift),
  };

  return { state: { ...state, rng, lastTest: result }, result };
}

/** Human-readable arithmetic: `4dF +1 + 3 − 2 = +2`. */
export function showTest(result: TestResult): string {
  const sign = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);
  return `4dF ${sign(result.dice)} + ${result.statValue} − ${result.difficulty} = ${sign(result.shift)}`;
}

/**
 * How a test reads in the log. A gate has two states, not five: printing
 * "collateral" on a door that opened is exactly the kind of noise that makes a
 * playtest report say "the game is confusing".
 */
export function describeTest(result: TestResult): string {
  if (result.kind === "gate") {
    return `${showTest(result)} → ${result.shift >= 0 ? "passes" : "fails"}`;
  }
  return `${showTest(result)} → ${result.outcome}`;
}

export function anomalyName(cardId: string): string {
  return ANOMALY_BY_ID.get(cardId)?.name.en ?? cardId;
}
