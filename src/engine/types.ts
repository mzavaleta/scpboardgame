/**
 * Core engine types.
 *
 * Shape follows `implementation.md` §S1 (state model), §S3 (action vocabulary),
 * §S4 (the closed effect vocabulary), §C3 (aspects and compels), §C4 (directives)
 * and §S6 (evidence). This file must stay free of DOM, I/O, `Date.now()` and
 * `Math.random()` — it is the whole game's vocabulary.
 *
 * **The MVP rule this file encodes:** every player-facing mechanic must be
 * expressible as data here. A card, aspect or directive that needs something this
 * file cannot name is a design gap, not a content problem.
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
export type RoleId = string;
export type AspectId = string;
export type MainDirectiveId = string;
export type ItemId = string;
export type GateId = string;

/** Turn phases, in order (§S2). `draft` gates everything while a role is chosen. */
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

export type RingId = "outer" | "middle" | "inner" | "core";

/** The anomaly piles (§C2.2). */
export type DeckId = "safe" | "euclid" | "keter";

/** Every pile a `drawCard` effect may name. `anomaly` resolves to the local tier. */
export type DrawDeck = DeckId | "anomaly" | "equipment" | "escalation";

/** §C2.3/§S6: accidents are what the site does to you; intent is what a person chose. */
export type EvidenceClass = "accident" | "intent";

export type EvidenceKind =
  | "uncontained" // accident
  | "breachAlarm" // accident
  | "sealedGate" // intent
  | "tookSample" // intent
  | "tamperedProtocol"; // intent

export function evidenceClassOf(kind: EvidenceKind): EvidenceClass {
  return kind === "uncontained" || kind === "breachAlarm" ? "accident" : "intent";
}

/** §S6: public and permanent. A breach victory is invalid without its own tokens. */
export type EvidenceToken = {
  readonly class: EvidenceClass;
  readonly kind: EvidenceKind;
  readonly sourceSeat: SeatId;
  readonly nodeId: NodeId;
  readonly round: number;
};

export type CardId = string;

/** §C3.7: a forced move resolves a *target*, never a raw node, and never crosses a gate. */
export type ForceTarget = "hunter" | "anomalyNode" | "woundedAlly" | "downedAlly";

/**
 * §S4, the closed effect set. A card cannot invent an effect: the type refuses
 * it, which is how the "canon must fit the mechanics" rule is enforced by code
 * instead of by taste.
 *
 * The vocabulary grows by design (one deliberate addition at a time, declared in
 * the implementation document), never by per-card exception.
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
  | { readonly kind: "spawnHunterAtRing"; readonly ring: RingId; readonly count: number }
  | { readonly kind: "moveHunter"; readonly count: number }
  | { readonly kind: "modifyRoll"; readonly delta: number }
  | { readonly kind: "hitMarkedNodes"; readonly delta: number }
  | { readonly kind: "openVote" }
  | { readonly kind: "drawCard"; readonly deck: DrawDeck; readonly count: number }
  | { readonly kind: "removeGear"; readonly count: number }
  | { readonly kind: "placeEvidence"; readonly evidence: EvidenceKind }
  | { readonly kind: "forceMove"; readonly toward: ForceTarget }
  | { readonly kind: "lockGate"; readonly gateId: GateId | "nearest"; readonly rounds: number }
  | { readonly kind: "grantAspect"; readonly aspectId: AspectId }
  | { readonly kind: "armWarhead" };

/**
 * §S4 + §C4.7, the closed condition set. Every condition reads state the engine
 * already tracks; a condition that would need a new tracked value is a structural
 * finding, not a wording problem (§C4.5).
 */
export type Condition =
  | { readonly kind: "always" }
  | { readonly kind: "all"; readonly of: readonly Condition[] }
  | { readonly kind: "any"; readonly of: readonly Condition[] }
  | { readonly kind: "not"; readonly of: Condition }
  | { readonly kind: "atNode"; readonly node: NodeId }
  | { readonly kind: "atNodeKind"; readonly nodeKind: string }
  | { readonly kind: "inRing"; readonly ring: RingId }
  | { readonly kind: "atMarkedNode" }
  | { readonly kind: "atCheckpoint" }
  | { readonly kind: "clearanceAtLeast"; readonly n: number }
  | { readonly kind: "fateAtLeast"; readonly n: number }
  | { readonly kind: "recordsAtLeast"; readonly n: number }
  | { readonly kind: "gearAtLeast"; readonly n: number }
  | { readonly kind: "holdsGear" }
  | { readonly kind: "integrityBelow"; readonly n: number }
  | { readonly kind: "fullIntegrity" }
  | { readonly kind: "hasTag"; readonly tag: string }
  | { readonly kind: "hasAspect"; readonly aspectId: AspectId }
  | { readonly kind: "hasEvidence"; readonly evidence: EvidenceKind }
  | { readonly kind: "evidenceCount"; readonly evidenceClass: EvidenceClass; readonly atLeast: number }
  | { readonly kind: "othersWithIntentEvidence"; readonly atLeast: number }
  | { readonly kind: "anyoneHoldsIntent" }
  | { readonly kind: "containments"; readonly atLeast: number }
  | { readonly kind: "containmentsByTier"; readonly tier: DeckId; readonly atLeast: number }
  | { readonly kind: "rescues"; readonly atLeast: number }
  | { readonly kind: "sealedGates"; readonly atLeast: number }
  | { readonly kind: "noGateFailures" }
  | { readonly kind: "visitedRings"; readonly atLeast: number }
  | { readonly kind: "protocolSteps"; readonly atLeast: number }
  | { readonly kind: "completedFinalProtocolStep" }
  | { readonly kind: "allLivingAtCore" }
  | { readonly kind: "anySeatDowned" }
  | { readonly kind: "warheadArmed" }
  | { readonly kind: "terminalIs"; readonly terminal: "recontained" | "detonated" }
  | { readonly kind: "threatAtLeast"; readonly n: number }
  | { readonly kind: "hunterWithin"; readonly steps: number }
  | { readonly kind: "hunterInRing"; readonly ring: RingId }
  | { readonly kind: "hunterSharesRing" }
  | { readonly kind: "allyWounded" }
  | { readonly kind: "allyDownedOnNode" }
  | { readonly kind: "adjacentAllyWounded" }
  | { readonly kind: "declinedThisTurn" }
  | { readonly kind: "containedThisTurn" }
  | { readonly kind: "gainedGearThisTurn" }
  | { readonly kind: "startedContainmentThisTurn" }
  | { readonly kind: "inEncounter" }
  | { readonly kind: "activeSeat" };

/**
 * §5, the tier table. This is the law: content declares a difficulty and four
 * payloads, and can never invent its own outcome ladder.
 */
export type Outcome = "clean" | "success" | "collateral" | "failure" | "breach";

export type TestResult = {
  /** Gates only ask "does it open"; encounters ask "which tier". */
  readonly kind: "gate" | "anomaly" | "protocol";
  readonly seat: SeatId;
  readonly stat: Stat;
  readonly difficulty: number;
  readonly statValue: number;
  /** The raw 4dF sum, -4..+4. */
  readonly dice: number;
  /** `dice + statValue − difficulty`. */
  readonly shift: number;
  readonly outcome: Outcome;
};

/** An anomaly that has been drawn and is waiting for the active seat to decide. */
export type Encounter = {
  readonly card: CardId;
  readonly node: NodeId;
};

export type CounterId =
  | "containments"
  | "containmentsSafe"
  | "containmentsEuclid"
  | "containmentsKeter"
  | "rescues"
  | "gateFailures"
  | "sealedGates"
  | "protocolFinishers";

export type Counters = Readonly<Record<CounterId, number>>;

export function emptyCounters(): Counters {
  return {
    containments: 0,
    containmentsSafe: 0,
    containmentsEuclid: 0,
    containmentsKeter: 0,
    rescues: 0,
    gateFailures: 0,
    sealedGates: 0,
    protocolFinishers: 0,
  };
}

export type TurnEvent = {
  readonly seat: SeatId;
  readonly event: "declined" | "contained" | "gainedGear" | "startedContainment" | "compelled";
};

export type Alignment = "containment" | "breach";

export type Hunter = {
  readonly id: string;
  readonly node: NodeId;
};

export type Player = {
  readonly seat: SeatId;
  readonly roleId: RoleId;
  /** §C3: one public aspect per role. The table may compel it at any time. */
  readonly aspectId: AspectId;
  /** §7c.1: private until the reveal, and the thing that defines winning. */
  readonly mainDirectiveId: MainDirectiveId;
  /** Q22: a respawned character keeps the memory of what it was. Null if never died. */
  readonly previousDirectiveId: MainDirectiveId | null;
  readonly node: NodeId;
  readonly integrity: number;
  readonly maxIntegrity: number;
  /** 0..`TUNING.fate.cap` (§7b.3). */
  readonly fate: number;
  readonly stats: Stats;
  readonly records: number;
  /** Clearance level 1-4 (§C1.6). Level ≥ a gate's requirement crosses freely. */
  readonly clearance: number;
  /** Public tags a card can grant ("key", "bound", "sample", "hardTest"). */
  readonly tags: readonly string[];
  /** §C5.4: three slots, item ids from `src/content/gear.ts`. */
  readonly gear: readonly ItemId[];
  /** §C4.5: win conditions are counts, so the state has to carry them. */
  readonly counters: Counters;
  /** §C4.2 `m-long-way`: which rings this seat has stood in. */
  readonly visitedRings: readonly RingId[];
  /** D16: consecutive turns ended without a progress attempt. */
  readonly stalledTurns: number;
  /** At 0 Integrity you stop acting until you respawn or are rescued (Q22). */
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

/** §7c.3: the endgame reveal needs the final directive and, after a death, the old one. */
export type RevealedDirective = {
  readonly roleId: RoleId;
  readonly aspectId: AspectId;
  readonly mainDirectiveId: MainDirectiveId;
  readonly previousDirectiveId: MainDirectiveId | null;
  readonly alignment: Alignment;
};

/**
 * §S1/§7c.3: how the game ended. `winners` is resolved from alignment and the
 * directive's own condition — never from who happened to be standing where.
 */
export type Ending = {
  readonly terminal: "recontained" | "detonated";
  readonly winners: readonly SeatId[];
  readonly revealed: Readonly<Record<string, RevealedDirective>>;
};

/** §S2 Q26: setup and respawn use the same draft. Options are role ids. */
export type Draft = {
  readonly seat: SeatId;
  readonly options: readonly RoleId[];
  readonly purpose: "setup" | "respawn";
};

/** §C3.5: an open compel pauses the table until the target answers. */
export type PendingCompel = {
  readonly invoker: SeatId;
  readonly target: SeatId;
  readonly aspectId: AspectId;
  readonly compelIndex: number;
};

/** §C5.3: Emergency Assembly votes on how the loss is allocated, never on who is blamed. */
export type Vote = {
  readonly id: string;
  readonly initiator: SeatId;
  /** The gate nearest the initiator, locked if the table seals. */
  readonly gateId: GateId;
  readonly votes: Readonly<Partial<Record<SeatId, "seal" | "hold">>>;
};

export type GameState = {
  readonly rng: RngState;
  readonly round: number;
  readonly seat: SeatId;
  readonly phase: Phase;
  /** The movement roll for this turn. Distance is fixed; the destination is yours to choose. */
  readonly roll: number;
  readonly players: Players;
  /** §D13: pressure, driven by stagnation and by breach outcomes. 0..`threat.max`. */
  readonly threat: number;
  /** §C4.4: 0..`protocol.steps`. At the ceiling the site is recontained. */
  readonly protocolSteps: number;
  /**
   * §7: the armed warhead and its fuse. `null` until the track reaches the top.
   * Arming does not tick it; each later round end spends one round.
   */
  readonly warhead: { readonly remaining: number } | null;
  /**
   * §D16: seats that produced a progress *attempt* this round. The track reads
   * this at the round boundary — one seat trying is enough to hold it.
   */
  readonly progressThisRound: readonly SeatId[];
  /** D16: did the active seat attempt anything on its own turn? */
  readonly turnProgress: boolean;
  /** §C3.3: "this turn" conditions need a memory that dies at the turn boundary. */
  readonly turnEvents: readonly TurnEvent[];
  /** §S1: set once, never overwritten. */
  readonly outcome: Ending | null;
  /** §7: not tokens any more — a scent rule needs a position. */
  readonly hunters: readonly Hunter[];
  /**
   * Fingerprint of the tuning file this game was created with. A changed number
   * is a different game, and the state says so instead of silently breaking
   * `?seed=` reproduction.
   */
  readonly config: string;
  readonly encounter: Encounter | null;
  /** The last test anyone rolled, so the table can see the arithmetic. */
  readonly lastTest: TestResult | null;
  /** §S6: public and permanent, in insertion order. */
  readonly evidence: readonly EvidenceToken[];
  /** §C3.5: while set, only `respondCompel` is accepted. */
  readonly pendingCompel: PendingCompel | null;
  /** §C5.3: while set, only `castVote` is accepted. */
  readonly vote: Vote | null;
  /** §S2 Q26: while set, only `chooseRole` is accepted. */
  readonly draft: Draft | null;
  /** Gates sealed by `sealGate` / Lockdown: gate id → round it reopens. */
  readonly sealedGates: Readonly<Record<string, number>>;
  /** §S8.3 check 11: a replay can refuse content it was not recorded with. */
  readonly contentVersion: string;
  /** Public narration. Every entry here is public by definition (§S5). */
  readonly log: readonly string[];
};

export type Action =
  | { readonly type: "rollMovement" }
  | { readonly type: "moveTo"; readonly node: NodeId }
  | { readonly type: "resolveAnomaly"; readonly choice: "contain" | "decline" }
  /**
   * §C1.4: spend Records at a checkpoint to buy the *next* clearance level.
   */
  | { readonly type: "attemptClearance"; readonly level: number }
  /** §C4.4: one step up the recontainment protocol, at the Command Center. */
  | { readonly type: "advanceProtocol" }
  /** §C4.4: push the protocol down one step and leave `tamperedProtocol` evidence. */
  | { readonly type: "sabotageProtocol" }
  /** §S2 Q26: one role from the draft's options (setup or respawn). */
  | { readonly type: "chooseRole"; readonly roleId: RoleId }
  | { readonly type: "respawn" }
  | { readonly type: "endTurn" }
  /** §7b.3: pay Fate for a second movement die (§S2 allows exactly one). */
  | { readonly type: "spendFateToReroll" }
  /** §C3.5: spend 1 Fate to compel a public aspect. */
  | {
      readonly type: "compel";
      readonly target: SeatId;
      readonly aspectId: AspectId;
      readonly compelIndex: number;
    }
  /** §C3.5: the one off-turn action. Accept gains 2 Fate; refuse spends 1. */
  | { readonly type: "respondCompel"; readonly accept: boolean }
  /** §C5.4: a consumed item, or a permanent one with a target. */
  | { readonly type: "useItem"; readonly itemId: ItemId; readonly target?: SeatId }
  /** §S3: recover Integrity instead of pressing on. */
  | { readonly type: "rest" }
  /** Q22: revive a downed ally on your node, gear intact at 1 Integrity. */
  | { readonly type: "rescue"; readonly target: SeatId }
  /** §C4.5/D25: block a gate for two rounds and leave `sealedGate` evidence. */
  | { readonly type: "sealGate"; readonly gateId: GateId }
  /** §C5.3: answer the Emergency Assembly. */
  | { readonly type: "castVote"; readonly choice: "seal" | "hold" }
  | { readonly type: "devRoll"; readonly value: number }
  | { readonly type: "devEncounter"; readonly card: string }
  | { readonly type: "devHurt"; readonly amount: number }
  /** Dev tool only: open a chosen escalation card, so the 14 can be exercised. */
  | { readonly type: "devEscalation"; readonly card: string }
  /** Dev tool only: deal a chosen directive, to test the victory matrix. */
  | { readonly type: "devDirective"; readonly seat: SeatId; readonly directiveId: MainDirectiveId }
  /** Dev tool only: end the game now, so the reveal screen is reachable in seconds. */
  | { readonly type: "devOutcome"; readonly terminal: "recontained" | "detonated" };

export type RejectionCode =
  | "wrong-phase"
  | "unknown-action"
  | "unreachable"
  | "unknown-node"
  | "invalid-value"
  | "no-encounter"
  | "no-checkpoint"
  | "not-enough-records"
  | "clearance-order"
  | "no-core"
  | "game-over"
  | "downed"
  | "not-downed"
  | "blocked-by-gate"
  | "draft-pending"
  | "pending-compel"
  | "vote-open"
  | "no-fate"
  | "compel-unavailable"
  | "no-item"
  | "no-vote"
  | "no-gate"
  | "not-adjacent"
  | "invalid-target";

export type Rejection = {
  /** Machine-readable, stable. Tests assert on this, never on the message. */
  readonly code: RejectionCode;
  /** Shown to a human. Never asserted on. */
  readonly message: string;
};

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: Rejection };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const reject = (code: RejectionCode, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
