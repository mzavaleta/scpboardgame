/**
 * Core engine types.
 *
 * Shape follows `implementation.md` §S1 (state model), §S3 (action vocabulary)
 * and §S4 (the closed effect vocabulary). This file must stay free of DOM, I/O,
 * `Date.now()` and `Math.random()` — it is the whole game's vocabulary.
 */

export type SeatId = "p1" | "p2" | "p3";

export const SEAT_ORDER: readonly SeatId[] = ["p1", "p2", "p3"] as const;

/**
 * The seats of a table of `count` players (§D10: MVP is 2-3).
 *
 * Seats are always a prefix of `SEAT_ORDER`, so a two-seat game is the same game
 * three-seat one would be, minus the third seat — never a different order.
 */
export function seatsFor(count: 2 | 3): readonly SeatId[] {
  return SEAT_ORDER.slice(0, count);
}

export type NodeId = string;

/** Turn phases, in order (§S2). */
export type Phase = "turnStart" | "roll" | "move" | "space" | "action" | "end";

/**
 * The only source of randomness in the game.
 *
 * `cursor` is advanced exactly once per die rolled, and the die value is a pure
 * function of `(seed, cursor)`. Nothing is hidden in a mutable generator: the
 * whole random stream is addressable from state, which is what makes replays and
 * golden tests exact.
 */
export type RngState = {
  readonly seed: number;
  readonly cursor: number;
};

export type Stat = "combat" | "intellect";

export type Stats = { readonly combat: number; readonly intellect: number };

export type DeckId = "safe" | "euclid" | "keter";

/** §C2.3: accidents are what the site does to you; intent is what a person chose. */
export type EvidenceClass = "accident" | "intent";

export type CardId = string;

/**
 * §S4, the closed effect set. A card cannot invent an effect: the type refuses
 * it, which is how the "canon must fit the mechanics" rule is enforced by code
 * instead of by taste.
 *
 * Only the members M2 can execute are declared here. The vocabulary grows by
 * design (one deliberate addition at a time), never by per-card exception.
 */
export type Effect =
  | { readonly kind: "modifyIntegrity"; readonly delta: number }
  | { readonly kind: "modifyMaxIntegrity"; readonly delta: number }
  | { readonly kind: "modifyRecords"; readonly delta: number }
  | { readonly kind: "setRecords"; readonly value: number }
  | { readonly kind: "grantFate"; readonly delta: number }
  | { readonly kind: "raiseThreat"; readonly delta: number }
  | { readonly kind: "setClearance"; readonly level: number }
  | { readonly kind: "addTag"; readonly tag: string }
  | { readonly kind: "spawnHunter"; readonly count: number }
  | { readonly kind: "drawCard"; readonly deck: DeckId | "equipment"; readonly count: number }
  | { readonly kind: "removeGear"; readonly count: number }
  | { readonly kind: "placeEvidence"; readonly evidence: EvidenceClass };

/**
 * §5, the tier table. This is the law: content declares a difficulty and four
 * payloads, and can never invent its own outcome ladder.
 */
export type Outcome = "clean" | "success" | "collateral" | "failure" | "breach";

export type TestResult = {
  /** Gates only ask "does it open"; encounters ask "which tier". */
  readonly kind: "gate" | "anomaly";
  readonly seat: SeatId;
  readonly stat: Stat;
  readonly difficulty: number;
  readonly statValue: number;
  /** The raw 4dF sum, -4..+4. */
  readonly dice: number;
  /** `dice + statValue - difficulty`. */
  readonly shift: number;
  readonly outcome: Outcome;
};

/** An anomaly that has been drawn and is waiting for the active seat to decide. */
export type Encounter = {
  readonly card: CardId;
  readonly node: NodeId;
};

export type Player = {
  readonly seat: SeatId;
  readonly node: NodeId;
  readonly integrity: number;
  readonly maxIntegrity: number;
  readonly fate: number;
  readonly stats: Stats;
  readonly records: number;
  /** Clearance level 1-4 (§C1.6). Level ≥ a gate's requirement crosses freely. */
  readonly clearance: number;
  readonly evidence: Readonly<Record<EvidenceClass, number>>;
  /** Public tags a card can grant ("key", "bound"). */
  readonly tags: readonly string[];
  /** At 0 Integrity you stop acting until you respawn (M2 placeholder for Q22). */
  readonly downed: boolean;
};

/**
 * A table can be 2 or 3 seats, so `players` is partial on purpose: a missing seat
 * is genuinely absent, and the type says so instead of pretending every seat
 * exists. Use `playerAt` / `playersIn` rather than indexing directly.
 */
export type Players = Readonly<Partial<Record<SeatId, Player>>>;

export function playerAt(players: Players, seat: SeatId): Player {
  const player = players[seat];
  if (!player) throw new Error(`no player in seat ${seat}`);
  return player;
}

export function playersIn(players: Players): readonly Player[] {
  return SEAT_ORDER.map((seat) => players[seat]).filter((player): player is Player => player !== undefined);
}

export type GameState = {
  readonly rng: RngState;
  readonly round: number;
  readonly seat: SeatId;
  readonly phase: Phase;
  /** The movement roll for this turn. Distance is fixed; the destination is yours to choose. */
  readonly roll: number;
  readonly players: Players;
  /** §D13: pressure, driven by stagnation and by breach outcomes. */
  readonly threat: number;
  /** Hunters that exist but do not act yet (M3). Counted, not simulated. */
  readonly hunters: number;
  /** The three anomaly piles, as remaining card ids (§C2.2: piles, never a filter). */
  readonly decks: Readonly<Record<DeckId, readonly CardId[]>>;
  readonly encounter: Encounter | null;
  /** The last test anyone rolled, so the table can see the arithmetic. */
  readonly lastTest: TestResult | null;
  /** Public narration. Every entry here is public by definition (§S5). */
  readonly log: readonly string[];
};

export type Action =
  | { readonly type: "rollMovement" }
  | { readonly type: "moveTo"; readonly node: NodeId }
  | { readonly type: "resolveAnomaly"; readonly choice: "contain" | "decline" }
  | { readonly type: "respawn" }
  | { readonly type: "endTurn" }
  /**
   * Dev tool only (§14e): force the movement roll to a chosen face so a landing
   * table can be tested without hunting seeds. Consumes one die like a real
   * roll, so it never desyncs the stream, and it announces itself in the log.
   * Never dispatched by production UI.
   */
  | { readonly type: "devRoll"; readonly value: number };

export type Rejection = {
  /** Machine-readable, stable. Tests assert on this, never on the message. */
  readonly code:
    | "wrong-phase"
    | "unknown-action"
    | "unreachable"
    | "unknown-node"
    | "invalid-value"
    | "no-encounter"
    | "downed"
    | "not-downed"
    | "blocked-by-gate";
  /** Shown to a human. Never asserted on. */
  readonly message: string;
};

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Rejection };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const reject = (code: Rejection["code"], message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
