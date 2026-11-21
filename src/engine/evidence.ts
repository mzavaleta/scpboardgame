/**
 * Evidence (§S6, §C2.3, D18).
 *
 * Public, permanent, and classed. The class is load-bearing: an `accident` is
 * what the site does to you, an `intent` token is what a person chose. Only
 * `intent` can satisfy a breach directive, which is what stops a saboteur from
 * winning on somebody else's bad roll.
 */

import { playerAt, evidenceClassOf } from "./types";
import type { EvidenceClass, EvidenceKind, EvidenceToken, GameState, SeatId } from "./types";

export function addEvidence(
  state: GameState,
  seat: SeatId,
  kind: EvidenceKind,
): GameState {
  const player = playerAt(state.players, seat);
  const token: EvidenceToken = {
    class: evidenceClassOf(kind),
    kind,
    sourceSeat: seat,
    nodeId: player.node,
    round: state.round,
  };
  return { ...state, evidence: [...state.evidence, token] };
}

export function tokensFor(state: GameState, seat: SeatId): readonly EvidenceToken[] {
  return state.evidence.filter((token) => token.sourceSeat === seat);
}

export function evidenceCount(state: GameState, seat: SeatId, kind: EvidenceKind): number {
  return state.evidence.filter((token) => token.sourceSeat === seat && token.kind === kind).length;
}

export function evidenceClassCount(state: GameState, seat: SeatId, cls: EvidenceClass): number {
  return state.evidence.filter((token) => token.sourceSeat === seat && token.class === cls).length;
}

export function hasEvidence(state: GameState, seat: SeatId, kind: EvidenceKind): boolean {
  return evidenceCount(state, seat, kind) > 0;
}

/** §C4.2 `m-auditor`: how many *other* seats carry intent evidence. */
export function othersWithIntentEvidence(state: GameState, seat: SeatId): number {
  const seats = new Set(
    state.evidence
      .filter((token) => token.class === "intent" && token.sourceSeat !== seat)
      .map((token) => token.sourceSeat),
  );
  return seats.size;
}

export function anyoneHoldsIntent(state: GameState, kinds: readonly EvidenceKind[]): boolean {
  return state.evidence.some((token) => token.class === "intent" && kinds.includes(token.kind));
}
