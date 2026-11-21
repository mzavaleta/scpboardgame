/**
 * Main Directives at work: dealing, the D19 safety valve, and victory (§7c).
 *
 * Two rules here are load-bearing:
 * - **D19** caps breach seats at ⌊n/2⌋ after dealing, by swapping the excess for
 *   containment directives. The table never adjudicates it.
 * - **D18** refuses a breach victory whose own public footprint never occurred.
 *   That is what makes hidden motive a deduction game instead of a coin flip.
 */

import { MAIN_DIRECTIVES, CONTAINMENT_DIRECTIVES, directiveById } from "../content/directives";
import type { MainDirective } from "../content/directives";
import { fnv1a } from "./hash";
import { evalCondition } from "./conditions";
import { hasEvidence } from "./evidence";
import { playerAt, playersIn } from "./types";
import type { GameState, Player, SeatId } from "./types";

/**
 * Directives are dealt from the seed, not from the die stream.
 *
 * That is deliberate: setup consumes no dice, so a replay's cursor starts where
 * the first roll will leave it, and adding a seat cannot shift every later roll.
 */
export function directivesSeed(state: GameState, seat: SeatId, poolSize: number): number {
  if (poolSize <= 0) return 0;
  const digest = fnv1a(`${state.rng.seed}:${state.round}:${seat}:${poolSize}`);
  return Number.parseInt(digest.slice(0, 6), 16) % poolSize;
}

/**
 * Deal one private directive per seat, then apply the valve.
 *
 * Deterministic: seat order, one seed-derived draw per seat, and no RNG cursor.
 */
export function dealDirectives(
  state: GameState,
): GameState {
  const seats = playersIn(state.players).map((player) => player.seat);
  const pool = [...MAIN_DIRECTIVES];
  const dealt = new Map<SeatId, string>();

  for (const seat of seats) {
    const index = directivesSeed(state, seat, pool.length);
    const [directive] = pool.splice(index, 1);
    dealt.set(seat, (directive as MainDirective).id);
  }

  // D19: at most ⌊n/2⌋ breach seats. Replace the excess from the highest seat
  // down, using an undealt containment directive, so the swap is deterministic.
  const cap = Math.floor(seats.length / 2);
  const breachSeats = seats.filter((seat) => directiveById(dealt.get(seat) as string).alignment === "breach");
  const surplus = breachSeats.slice(cap);
  const unused = CONTAINMENT_DIRECTIVES.filter((directive) => ![...dealt.values()].includes(directive.id));
  const notes: string[] = [];

  for (const seat of surplus.reverse()) {
    const replacement = unused.shift();
    if (!replacement) break;
    dealt.set(seat, replacement.id);
    notes.push(`the safety valve reassigns ${seat}'s directive.`);
  }

  const players = Object.fromEntries(
    playersIn(state.players).map((player) => [
      player.seat,
      { ...player, mainDirectiveId: dealt.get(player.seat) ?? player.mainDirectiveId },
    ]),
  );

  return {
    ...state,
    players,
    log: [...state.log, ...notes],
  };
}

export function alignmentOf(player: Player): "containment" | "breach" {
  return directiveById(player.mainDirectiveId).alignment;
}

/** D18: every declared intent kind must exist, placed by this seat. */
export function footprintSatisfied(state: GameState, seat: SeatId): boolean {
  const player = playerAt(state.players, seat);
  const directive = directiveById(player.mainDirectiveId);
  if (directive.publicFootprint.length === 0) return true;
  return directive.publicFootprint.every((kind) => hasEvidence(state, seat, kind));
}

/**
 * §7c.3, the matrix, in one function. Recontained: a containment-aligned seat at
 * the centre whose condition holds. Detonated: a breach-aligned seat whose
 * condition holds and whose footprint is public. Everyone else loses.
 */
export function resolveOutcome(
  state: GameState,
  terminal: "recontained" | "detonated",
): GameState["outcome"] {
  const winners: SeatId[] = [];
  const revealed: Record<string, {
    roleId: string;
    aspectId: string;
    mainDirectiveId: string;
    previousDirectiveId: string | null;
    alignment: "containment" | "breach";
  }> = {};

  for (const player of playersIn(state.players)) {
    const directive = directiveById(player.mainDirectiveId);
    revealed[player.seat] = {
      roleId: player.roleId,
      aspectId: player.aspectId,
      mainDirectiveId: player.mainDirectiveId,
      previousDirectiveId: player.previousDirectiveId,
      alignment: directive.alignment,
    };

    const conditionMet = evalCondition(state, player.seat, directive.condition, terminal);
    const wins =
      terminal === "recontained"
        ? directive.alignment === "containment" && player.node === "core-00" && !player.downed && conditionMet
        : directive.alignment === "breach" && conditionMet && footprintSatisfied(state, player.seat);

    if (wins) winners.push(player.seat);
  }

  return { terminal, winners, revealed };
}

/** The endgame needs a verdict per seat, not just the winner list (§S7.5). */
export function verdictFor(
  state: GameState,
  seat: SeatId,
): { readonly won: boolean; readonly why: "absent" | "condition" | "alignment" | "footprint" | "won" } {
  const outcome = state.outcome;
  if (!outcome) return { won: false, why: "absent" };
  if (outcome.winners.includes(seat)) return { won: true, why: "won" };

  const player = playerAt(state.players, seat);
  const directive = directiveById(player.mainDirectiveId);

  if (outcome.terminal === "recontained") {
    if (directive.alignment !== "containment") return { won: false, why: "alignment" };
    if (player.node !== "core-00" || player.downed) return { won: false, why: "condition" };
    return { won: false, why: "condition" };
  }

  if (directive.alignment !== "breach") return { won: false, why: "alignment" };
  if (!footprintSatisfied(state, seat)) return { won: false, why: "footprint" };
  return { won: false, why: "condition" };
}
