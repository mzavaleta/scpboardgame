/**
 * Encounter machinery (§S2 `space` phase, §C2, §5).
 *
 * Three small pure pieces: which pile a landing node draws from, how a 4dF test
 * becomes an outcome tier, and how a card is drawn without breaking the
 * seed-addressable RNG.
 */

import { ANOMALIES, ANOMALY_BY_ID } from "../content/anomalies";
import { getNode } from "./board";
import { nextInt, roll4dF } from "./rng";
import { playerAt } from "./types";
import type { DeckId, GameState, Outcome, RngState, SeatId, Stat, TestResult } from "./types";

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
 * Weighted sampling from a list (D27).
 *
 * `weightOf` is the card's rarity: what a physical deck would express as *copies*.
 * The draw consumes exactly one cursor position, like any other die, and it
 * **mutates nothing** — there is no pile to deplete, so the same 20 cards serve an
 * unlimited number of draws and the state stays smaller.
 *
 * Deterministic and uniform: one integer in `[0, totalWeight)` walks the
 * cumulative weights. No floats, so no floating-point drift between machines.
 */
export function pickWeighted<T>(
  rng: RngState,
  items: readonly T[],
  weightOf: (item: T) => number,
): { readonly picked: T | null; readonly rng: RngState } {
  const total = items.reduce((sum, item) => sum + Math.max(0, Math.floor(weightOf(item))), 0);
  if (items.length === 0 || total <= 0) return { picked: null, rng };

  const [roll, next] = nextInt(rng, 0, total - 1);
  let cursor = roll;
  for (const item of items) {
    cursor -= Math.max(0, Math.floor(weightOf(item)));
    if (cursor < 0) return { picked: item, rng: next };
  }
  // Unreachable while the weights are non-negative; keeps the type honest.
  return { picked: items[items.length - 1] as T, rng: next };
}

/**
 * Draw the anomaly for a landing node (D27).
 *
 * The **tier** is decided by the node (§C2.2 draw bands); rarity only decides
 * which entry inside that tier. At equal rarity this is the same distribution the
 * depleting pile had, minus the pile.
 */
export function drawAnomaly(
  state: GameState,
  deck: DeckId,
): { readonly state: GameState; readonly card: string | null } {
  const candidates = ANOMALIES.filter((anomaly) => anomaly.tier === deck);
  const { picked, rng } = pickWeighted(state.rng, candidates, (anomaly) => anomaly.rarity);
  if (!picked) return { state, card: null };

  return { state: { ...state, rng }, card: picked.id };
}

/** `4dF + stat - difficulty`, recorded on the state so the table can see it. */
export function rollTest(
  state: GameState,
  seat: SeatId,
  stat: Stat,
  difficulty: number,
  kind: "gate" | "anomaly" | "protocol",
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

/**
 * Human-readable arithmetic, with **every term labelled**.
 *
 * The first version printed `4dF -1 + 3 − 1 = +1`, and the playtester read
 * "4dF −1" as "four dice minus one" — which it is not: −1 is what the four dice
 * *summed to*. The numbers were right and the line was unreadable, so each term
 * now carries its name (§14j T4).
 */
export function showTest(result: TestResult): string {
  const sign = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);
  return (
    `4dF sum [${sign(result.dice)}] + ${result.stat} [${result.statValue}] ` +
    `− difficulty [${result.difficulty}] = ${sign(result.shift)}`
  );
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
