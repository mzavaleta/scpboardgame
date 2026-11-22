/**
 * The escalation deck and the Emergency Assembly (§C5).
 *
 * Selection is pure and deterministic; application lives in `effects.ts` because
 * a card is just a list of closed-set effects. The vote is here because it is the
 * one piece of card behaviour that is not an effect: it pauses the table.
 */

import { ESCALATION } from "../content/escalation";
import { BOARD } from "../content/board";
import { gateBetween, distance } from "./board";
import { pickWeighted } from "./encounter";
import { voteRule } from "../config/tuning";
import type { EscalationCard } from "../content/escalation";
import type { GameState, SeatId, Vote } from "./types";

/** Draw one card, uniform (the 14 are equally likely). Consumes one cursor. */
export function pickEscalation(state: GameState): { readonly state: GameState; readonly card: EscalationCard | null } {
  const { picked, rng } = pickWeighted(state.rng, ESCALATION, () => 1);
  if (!picked) return { state, card: null };
  return { state: { ...state, rng }, card: picked };
}

/** The gate nearest a node, used by Lockdown and the Assembly. */
export function nearestGate(nodeId: string): string {
  let best = BOARD.gates[0]?.id ?? "G1";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const gate of BOARD.gates) {
    const steps = Math.min(distance(nodeId, gate.a), distance(nodeId, gate.b));
    if (steps < bestDistance) {
      bestDistance = steps;
      best = gate.id;
    }
  }
  return best;
}

export function createVote(state: GameState, initiator: SeatId): { state: GameState; notes: readonly string[] } {
  const gateId = nearestGate(state.players[initiator]?.node ?? "core-00");
  const vote: Vote = { id: `vote-${state.round}`, initiator, gateId, votes: {} };
  return {
    state: { ...state, vote },
    notes: [`Emergency Assembly — ${initiator} calls the vote on ${gateId}. Seal it, or hold it open?`],
  };
}

/**
 * §C5.3: seal keeps the track still and locks the gate; hold advances it. A tie
 * advances it by one, because a table that cannot decide deserves the worse
 * outcome. Nobody is named, and somebody always loses.
 */
export function resolveVote(state: GameState): { state: GameState; notes: readonly string[] } {
  const vote = state.vote;
  if (!vote) return { state, notes: [] };

  const seats = Object.keys(state.players).length;
  const votes = Object.values(vote.votes);
  if (votes.length < seats) return { state, notes: [] };

  const seal = votes.filter((choice) => choice === "seal").length;
  const hold = votes.filter((choice) => choice === "hold").length;
  const rules = voteRule();

  if (seal > hold) {
    const reopen = state.round + rules.lockRounds;
    return {
      state: {
        ...state,
        vote: null,
        gates: { ...state.gates, [vote.gateId]: { ...state.gates[vote.gateId]!, reopen } },
      },
      notes: [`the table seals ${vote.gateId} until round ${reopen} — the track holds.`],
    };
  }

  const delta = hold > seal ? rules.holdThreat : rules.tieThreat;
  return {
    state: { ...state, vote: null, threat: state.threat + delta },
    notes: [
      seal === hold
        ? `the vote ties — the track advances ${delta}.`
        : `the table holds it open — the track advances ${delta}.`,
    ],
  };
}

export function gateIsSealed(state: GameState, gateId: string): boolean {
  const reopen = state.gates[gateId]?.reopen;
  return reopen !== undefined && reopen > state.round;
}

export { gateBetween };
