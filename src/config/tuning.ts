/**
 * The tuning surface (§S1, owner's request 2026-11-21).
 *
 * Everything a designer might want to change while playing lives in
 * `tuning.json`; nothing here contains a rule. The split is deliberate:
 *
 * - **Config** is a number: a price, a difficulty, a start value, a likelihood.
 * - **Content** is an identity: which gate connects which nodes, which card
 *   exists, what it is called.
 * - **Code** is the contract: the five-tier ladder, the phase machine, the
 *   effect meanings. A config that could invert the outcome ladder would produce
 *   a game nobody can reason about, so those are not dials.
 *
 * Two properties make this safe rather than fragile:
 *
 * 1. **Validation at load.** A bad value fails immediately with the path to it,
 *    instead of becoming a silent `NaN` three turns later.
 * 2. **A fingerprint.** The file is hashed into `GameState.config`, so a changed
 *    number cannot silently break `?seed=` reproduction — the game itself says
 *    which tuning produced it.
 */

import { z } from "zod";
import raw from "./tuning.json";
import { fnv1a, stableStringify } from "../engine/hash";
import type { DeckId } from "../engine/types";

const statValue = z.number().int().min(0).max(6);

const statsSchema = z.object({
  combat: statValue,
  intellect: statValue,
});

/**
 * §C3.2: a role is `{ combat, intellect, maxIntegrity, startingGear, aspect }`
 * and nothing else. The balance band is enforced here, because the draft only
 * works if the options are genuinely comparable.
 */
const roleSchema = z
  .object({
    id: z.string().min(1),
    name: z.object({ en: z.string().min(1), es: z.string().min(1) }),
    combat: statValue,
    intellect: statValue,
    maxIntegrity: z.number().int().min(1).max(12),
    startingGear: z.array(z.string()),
    aspect: z.string().min(1),
  })
  .refine((role) => {
    const total = role.combat + role.intellect;
    return total >= 5 && total <= 6;
  }, "role balance band: combat + intellect must be 5 or 6 (§C3.2)");

const gateSchema = z.object({
  /**
   * §14k.4: the door's starting condition. `open` crosses free, `locked` opens by
   * key/gear/skill once, `guarded` draws an anomaly at the mouth.
   */
  condition: z.enum(["open", "locked", "guarded"]),
  /** Intellect difficulty of the lock, for a `locked` gate. */
  difficulty: z.number().int().min(0).max(6),
});

/** How many of each card exist. `copies` is the physical metaphor (D27). */
const deckSchema = z.record(z.string(), z.number().int().min(0));

export const tuningSchema = z.object({
  _comment: z.string().optional(),
  /** Bumped when the shape changes, so an old file can be told apart from a bad one. */
  version: z.number().int().min(1),
  start: z.object({
    integrity: z.number().int().min(1),
    maxIntegrity: z.number().int().min(1),
    fate: z.number().int().min(0),
    clearance: z.number().int().min(1).max(4),
    stats: statsSchema,
  }),
  roles: z.array(roleSchema).min(1),
  /**
   * §7: the track that punishes a table which stops trying, and the countdown
   * that turns the top of the track into an ending. Both are dials — the *rule*
   * (attempts, not outcomes) stays in code.
   */
  threat: z.object({
    /** Top of the track. Reaching it arms the warhead. */
    max: z.number().int().min(1),
    /** Rounds between arming and detonation. */
    warheadCountdown: z.number().int().min(1),
  }),
  /**
   * §C4.4: the recontainment protocol at the Command Center — how many steps to
   * fire it, and the Intellect difficulty of one step.
   */
  protocol: z.object({
    steps: z.number().int().min(1),
    difficulty: z.number().int().min(0).max(6),
  }),
  /**
   * §7b.3: the political economy. Every number here is a dial; the *rule* that
   * the invoker always pays and the target chooses stays in code.
   */
  fate: z.object({
    cap: z.number().int().min(1),
    acceptCompel: z.number().int().min(0),
    refuseCompel: z.number().int().min(0),
    invokeCompel: z.number().int().min(0),
    reroll: z.number().int().min(0),
    deepRing: z.number().int().min(0),
    breach: z.number().int().min(0),
    escalation: z.number().int().min(0),
    invokeBonus: z.number().int().min(0),
  }),
  /** §7: hunters exist to make standing still dangerous. */
  hunters: z.object({
    max: z.number().int().min(0),
    contactDamage: z.number().int().min(0),
  }),
  /** D16: the third consecutive stalled turn draws a hazard. */
  stall: z.object({
    hazardAfter: z.number().int().min(1),
  }),
  /** §C5.4: three slots, a rule rather than content. */
  equipment: z.object({
    slots: z.number().int().min(1),
  }),
  /** §C5.3: Emergency Assembly numbers. */
  vote: z.object({
    holdThreat: z.number().int().min(0),
    tieThreat: z.number().int().min(0),
    lockRounds: z.number().int().min(1),
  }),
  /** §S2 Q26: how many role options the draft offers, capped. */
  draft: z.object({
    maxOptions: z.number().int().min(1),
  }),
  /** Records paid for containing an anomaly of each tier (§C1.4). */
  rewards: z.object({
    safe: z.number().int().min(0),
    euclid: z.number().int().min(0),
    keter: z.number().int().min(0),
  }),
  /** Threat a reader pays for walking away, per tier (§14f.3, D30 territory). */
  declineThreat: z.object({
    safe: z.number().int().min(0),
    euclid: z.number().int().min(0),
    keter: z.number().int().min(0),
  }),
  gates: z.record(z.string(), gateSchema),
  clearancePrices: z.record(z.string(), z.number().int().min(0)),
  decks: z.object({
    safe: deckSchema,
    euclid: deckSchema,
    keter: deckSchema,
  }),
});

export type Tuning = z.infer<typeof tuningSchema>;

/** Parse once, at module load: a bad file must not reach a game. */
export const TUNING: Tuning = tuningSchema.parse(raw);

/** Changes whenever a number changes, and travels inside the game state. */
export const CONFIG_FINGERPRINT = fnv1a(stableStringify(raw));

/** How many copies of `cardId` are in `deck`. Zero means disabled, not missing. */
export function deckCopies(deck: DeckId, cardId: string): number {
  const pool: Record<string, number> = TUNING.decks[deck];
  return pool[cardId] ?? 0;
}

/** The numbers behind a gate: topology stays in content, values stay here. */
export function gateRule(gateId: string): {
  readonly condition: "open" | "locked" | "guarded";
  readonly test: { readonly stat: "intellect"; readonly difficulty: number };
} {
  const rule: { condition: "open" | "locked" | "guarded"; difficulty: number } | undefined = TUNING.gates[gateId];
  if (!rule) throw new Error(`tuning: no entry for gate "${gateId}"`);
  return {
    condition: rule.condition,
    test: { stat: "intellect", difficulty: rule.difficulty },
  };
}

/** §7: the track's ceiling and the warhead's fuse. */
export function threatRule(): { readonly max: number; readonly countdown: number } {
  return { max: TUNING.threat.max, countdown: TUNING.threat.warheadCountdown };
}

/** §C4.4: the protocol's length and the difficulty of one step. */
export function protocolRule(): {
  readonly steps: number;
  readonly difficulty: number;
} {
  return { steps: TUNING.protocol.steps, difficulty: TUNING.protocol.difficulty };
}

/** Records a containment pays, by tier. Content projects this onto each card. */
export function tierReward(deck: DeckId): number {
  return TUNING.rewards[deck];
}

/** §7b.3: the Fate economy's numbers. Rules (who pays, who chooses) stay in code. */
export function fateRule(): Tuning["fate"] {
  return TUNING.fate;
}

export function hunterRule(): Tuning["hunters"] {
  return TUNING.hunters;
}

export function stallRule(): Tuning["stall"] {
  return TUNING.stall;
}

export function equipmentRule(): Tuning["equipment"] {
  return TUNING.equipment;
}

export function voteRule(): Tuning["vote"] {
  return TUNING.vote;
}

export function draftRule(): Tuning["draft"] {
  return TUNING.draft;
}

/** Threat paid for declining, by tier. Zero means walking away is free. */
export function declineThreat(deck: DeckId): number {
  return TUNING.declineThreat[deck];
}

/** Records needed to raise clearance to `level` (§C1.4; M3a spends these). */
export function clearancePrice(level: 2 | 3 | 4): number {
  const price: number | undefined = TUNING.clearancePrices[String(level)];
  if (price === undefined) throw new Error(`tuning: no clearance price for level ${level}`);
  return price;
}

export function roleSheet(roleId: string): Tuning["roles"][number] {
  const role = TUNING.roles.find((candidate) => candidate.id === roleId);
  if (!role) throw new Error(`tuning: no role "${roleId}"`);
  return role;
}
