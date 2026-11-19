/**
 * Core engine types.
 *
 * Shape follows `implementation.md` §S1 (state model) and §S3 (action vocabulary).
 * This file must stay free of DOM, I/O, `Date.now()` and `Math.random()`.
 */

export type SeatId = "p1" | "p2" | "p3";

export const SEAT_ORDER: readonly SeatId[] = ["p1", "p2", "p3"] as const;

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

export type Player = {
  readonly seat: SeatId;
  readonly node: NodeId;
  readonly integrity: number;
  readonly fate: number;
};

export type GameState = {
  readonly rng: RngState;
  readonly round: number;
  readonly seat: SeatId;
  readonly phase: Phase;
  /** The movement roll for this turn. Distance is fixed; the destination is yours to choose. */
  readonly roll: number;
  readonly players: Readonly<Record<SeatId, Player>>;
  /** Public narration. Every entry here is public by definition (§S5). */
  readonly log: readonly string[];
};

export type Action =
  | { readonly type: "rollMovement" }
  | { readonly type: "moveTo"; readonly node: NodeId }
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
    | "invalid-value";
  /** Shown to a human. Never asserted on. */
  readonly message: string;
};

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Rejection };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const reject = (code: Rejection["code"], message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
