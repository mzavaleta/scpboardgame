/**
 * The reducer: `(state, action) -> Result<state>`.
 *
 * Pure. No DOM, no I/O, no clock, no `Math.random()`. Movement follows the
 * owner's Talisman ruling (§D5): the die gives the distance, the player gives the
 * destination, and the move is a single irreversible decision.
 *
 * The MVP adds the political layer (§7b/§7c), the pressure layer's teeth (§C5),
 * hunters that move (§7), gear (§C5.4) and evidence with a class (§S6).
 */

import {
  CONFIG_FINGERPRINT,
  TUNING,
  clearancePrice,
  fateRule,
  protocolRule,
  stallRule,
  threatRule,
  voteRule,
} from "../config/tuning";
import { ANOMALIES } from "../content/anomalies";
import { ARRIVAL_NODE, BOARD } from "../content/board";
import { MAIN_DIRECTIVES, directiveById } from "../content/directives";
import { ESCALATION_BY_ID } from "../content/escalation";
import { gearById, gearHealBonus, gearMaxIntegrity, hasModifier } from "../content/gear";
import { ROLES, aspectById, roleById } from "../content/roles";
import { CONTENT_VERSION } from "../content/version";
import { distance, gatesAlong, getNode, ringDepth } from "./board";
import { evalCondition } from "./conditions";
import { dealDirectives, directivesSeed, resolveOutcome } from "./directives";
import { applyEffects, containmentRecords } from "./effects";
import { anomalyName, deckForNode, describeTest, drawAnomaly, rollTest } from "./encounter";
import { gateIsSealed, resolveVote } from "./escalation";
import { hunterContact, moveHunters } from "./hunters";
import { canLandOn } from "./movement";
import { nextInt, rollD6 } from "./rng";
import { ok, playerAt, playersIn, reject, SEAT_ORDER, emptyCounters } from "./types";
import type {
  Action,
  Alignment,
  Draft,
  Effect,
  GameState,
  Player,
  Result,
  SeatId,
  TurnEvent,
} from "./types";

const sign = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);
const fateCap = (): number => fateRule().cap;

export type CreateOptions = {
  /** §S2 Q26: true for the real setup screen; false for the simulator and tests. */
  readonly draft?: boolean;
};

/**
 * §S2 Q26: `min(maxOptions, floor(available / players))` options each, per the
 * document's formula. With six roles that is 3 options at two players, 2 at three.
 */
function optionCount(available: number, players: number): number {
  return Math.max(1, Math.min(TUNING.draft.maxOptions, Math.floor(available / Math.max(1, players))));
}

function usedRoles(state: GameState): string[] {
  return playersIn(state.players)
    .map((player) => player.roleId)
    .filter((id) => id.length > 0);
}

function drawOptions(
  rng: GameState["rng"],
  count: number,
  exclude: readonly string[],
): { options: string[]; rng: GameState["rng"] } {
  const pool = ROLES.map((role) => role.id).filter((id) => !exclude.includes(id));
  const options: string[] = [];
  let cursor = rng;
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const [index, next] = nextInt(cursor, 0, pool.length - 1);
    cursor = next;
    const [roleId] = pool.splice(index, 1);
    if (roleId) options.push(roleId);
  }
  return { options, rng: cursor };
}

function baseIntegrity(roleId: string): number {
  return roleId ? roleById(roleId).maxIntegrity : TUNING.start.maxIntegrity;
}

function playerFromRole(seat: SeatId, roleId: string, node: string, previousDirectiveId: string | null = null): Player {
  const role = roleById(roleId);
  return {
    seat,
    roleId,
    aspectId: role.aspectId,
    mainDirectiveId: "",
    previousDirectiveId,
    node,
    integrity: role.maxIntegrity,
    maxIntegrity: baseIntegrity(roleId),
    fate: TUNING.start.fate,
    stats: role.stats,
    records: 0,
    clearance: TUNING.start.clearance,
    tags: [],
    gear: [...role.startingGear],
    counters: emptyCounters(),
    visitedRings: [getNode(node).ring],
    stalledTurns: 0,
    downed: false,
  };
}

function blankPlayer(seat: SeatId): Player {
  return {
    seat,
    roleId: "",
    aspectId: "",
    mainDirectiveId: "",
    previousDirectiveId: null,
    node: ARRIVAL_NODE,
    integrity: TUNING.start.integrity,
    maxIntegrity: TUNING.start.maxIntegrity,
    fate: TUNING.start.fate,
    stats: TUNING.start.stats,
    records: 0,
    clearance: TUNING.start.clearance,
    tags: [],
    gear: [],
    counters: emptyCounters(),
    visitedRings: [getNode(ARRIVAL_NODE).ring],
    stalledTurns: 0,
    downed: false,
  };
}

export function createGame(
  seed: number,
  seats: readonly SeatId[] = SEAT_ORDER,
  options: CreateOptions = {},
): GameState {
  if (seats.length < 2) throw new Error("createGame: at least two seats are required");

  const players = Object.fromEntries(
    seats.map((seat) => [seat, blankPlayer(seat)]),
  ) as Partial<Record<SeatId, Player>>;

  let state: GameState = {
    rng: { seed: seed >>> 0, cursor: 0 },
    round: 1,
    seat: seats[0] as SeatId,
    phase: "roll",
    roll: 0,
    players,
    threat: 0,
    protocolSteps: 0,
    warhead: null,
    progressThisRound: [],
    turnProgress: false,
    turnEvents: [],
    outcome: null,
    hunters: [],
    config: CONFIG_FINGERPRINT,
    encounter: null,
    lastTest: null,
    evidence: [],
    pendingCompel: null,
    vote: null,
    draft: null,
    sealedGates: {},
    contentVersion: CONTENT_VERSION,
    log: [`Round 1 — ${seats[0]} to act.`],
  };

  if (options.draft) {
    const drawn = drawOptions(state.rng, optionCount(ROLES.length, seats.length), []);
    state = {
      ...state,
      rng: drawn.rng,
      draft: { seat: state.seat, options: drawn.options, purpose: "setup" },
      log: [...state.log, `Draft: ${state.seat} chooses a role.`],
    };
    return state;
  }

  return dealDirectives(state);
}

/** §D16: a progress *attempt*, not an outcome. One seat trying holds the track. */
function markProgress(state: GameState, seat: SeatId): GameState {
  const progressThisRound = state.progressThisRound.includes(seat)
    ? state.progressThisRound
    : [...state.progressThisRound, seat];
  return { ...state, progressThisRound, turnProgress: true };
}

function addTurnEvent(state: GameState, seat: SeatId, event: TurnEvent["event"]): GameState {
  return { ...state, turnEvents: [...state.turnEvents, { seat, event }] };
}

function replacePlayer(state: GameState, player: Player): GameState {
  return { ...state, players: { ...state.players, [player.seat]: player } };
}

function removeTags(state: GameState, tags: readonly string[]): GameState {
  const players = Object.fromEntries(
    playersIn(state.players).map((player) => [
      player.seat,
      { ...player, tags: player.tags.filter((tag) => !tags.includes(tag)) },
    ]),
  );
  return { ...state, players };
}

function withFate(player: Player, delta: number): Player {
  return { ...player, fate: Math.max(0, Math.min(fateCap(), player.fate + delta)) };
}

/** §S2 round boundary, in the order the document fixes. */
function endRound(state: GameState): GameState {
  const { max, countdown } = threatRule();
  const notes: string[] = [];
  let next = state;

  // 1–2. Hunters move, then contact.
  const moved = moveHunters(next);
  next = moved.state;
  notes.push(...moved.notes);
  const contact = hunterContact(next);
  next = contact.state;
  notes.push(...contact.notes);

  // 3. The track reads the round's attempts, not its outcomes.
  let threat = next.threat;
  let warhead = next.warhead;

  if (next.progressThisRound.length === 0) {
    threat = Math.min(max, threat + 1);
    notes.push(`no one advanced the site — threat ${next.threat} → ${threat}.`);
    if (threat >= max && warhead === null) {
      warhead = { remaining: countdown };
      notes.push(`the Alpha Warhead is armed — ${countdown} rounds to detonation.`);
    }
  }

  // 4–5. An already-armed warhead spends one round; arming never ticks itself.
  if (state.warhead !== null) {
    const remaining = state.warhead.remaining - 1;
    warhead = { remaining };
    if (remaining <= 0) {
      const armedState: GameState = { ...next, threat, warhead, progressThisRound: [], turnProgress: false, turnEvents: [] };
      const outcome = resolveOutcome(armedState, "detonated");
      notes.push(`the Alpha Warhead detonated. The site is lost.`);
      return {
        ...armedState,
        outcome,
        log: [...armedState.log, ...notes],
      };
    }
    notes.push(`the warhead counts down — ${remaining} round${remaining === 1 ? "" : "s"} left.`);
  }

  next = removeTags({ ...next, threat, warhead, progressThisRound: [], turnProgress: false, turnEvents: [] }, ["unseen"]);
  return { ...next, log: [...next.log, ...notes] };
}

/** Clearance level first, then the key tag, then the gate's Intellect test. */
function tryCrossGate(
  state: GameState,
  seat: SeatId,
  gate: ReturnType<typeof gatesAlong>[number],
): { readonly state: GameState; readonly passed: boolean; readonly notes: readonly string[] } {
  let player = playerAt(state.players, seat);
  const notes: string[] = [];
  // Touching a gate is an attempt whatever it costs (§7's progress list).
  state = markProgress(state, seat);

  if (player.clearance >= gate.clearance) {
    notes.push(`crossed ${gate.id} on clearance ${player.clearance}.`);
    return { state, passed: true, notes };
  }

  if (player.tags.includes("key")) {
    notes.push(`crossed ${gate.id} with the key (tag spent).`);
    return {
      state: replacePlayer(state, { ...player, tags: player.tags.filter((tag) => tag !== "key") }),
      passed: true,
      notes,
    };
  }

  const { state: rolled, result } = rollTest(state, seat, gate.test.stat, gate.test.difficulty, "gate");
  const verdict = result.shift >= 0 ? `crossed ${gate.id}.` : `the gate holds.`;
  notes.push(`  ${verdict}`, `clearance check at ${gate.id} — ${describeTest(result)}`);

  if (result.shift >= 0) return { state: rolled, passed: true, notes };

  // §C2.3: a failed gate is an *accident*, public noise that never satisfies a breach directive.
  player = playerAt(rolled.players, seat);
  const marked = applyEffects(rolled, seat, [{ kind: "placeEvidence", evidence: "breachAlarm" }]);
  let next = marked.state;
  next = replacePlayer(next, {
    ...playerAt(next.players, seat),
    counters: { ...player.counters, gateFailures: player.counters.gateFailures + 1 },
  });

  // The known debt, fixed: stop at the gate mouth on your own side, and never
  // announce an arrival that did not happen.
  const origin = getNode(player.node);
  const mouth = [gate.a, gate.b]
    .filter((id) => getNode(id).ring === origin.ring)
    .sort()[0];
  if (mouth) {
    next = replacePlayer(next, { ...playerAt(next.players, seat), node: mouth });
    notes.push(`  ${seat} is held at ${getNode(mouth).name.en}.`);
  }

  return { state: next, passed: false, notes: [...notes, ...marked.notes] };
}

/** §7: entering a deeper ring for the first time is the Fate economy's risk dividend. */
function rewardDepth(state: GameState, seat: SeatId, from: string, to: string): GameState {
  const player = playerAt(state.players, seat);
  const ring = getNode(to).ring;
  if (ringDepth(to) <= ringDepth(from) || player.visitedRings.includes(ring)) return state;
  return replacePlayer(state, {
    ...player,
    fate: Math.min(fateCap(), player.fate + fateRule().deepRing),
    visitedRings: [...player.visitedRings, ring],
  });
}

/** §C5.1: alarm nodes and stall hazards draw from one deck. */
function drawEscalation(state: GameState, seat: SeatId, cardId?: string): GameState {
  const card = cardId ? ESCALATION_BY_ID.get(cardId) : undefined;
  if (!card) return state;

  if (card.effects.some((effect) => effect.kind === "openVote")) {
    const applied = applyEffects(state, seat, card.effects);
    return { ...applied.state, log: [...state.log, `${card.name.en}: ${card.text.en}`, ...applied.notes] };
  }

  const applied = applyEffects(state, seat, card.effects);
  return {
    ...applied.state,
    log: [...state.log, `${card.name.en} (${card.target}): ${card.text.en}`, ...applied.notes],
  };
}

function drawFromAlarm(state: GameState, seat: SeatId): GameState {
  let cursor = state.rng;
  const index = nextInt(cursor, 0, ESCALATION_BY_ID.size - 1);
  cursor = index[1];
  const id = [...ESCALATION_BY_ID.keys()].sort()[index[0] as number];
  return drawEscalation({ ...state, rng: cursor }, seat, id);
}

function dealOneDirective(state: GameState, seat: SeatId, exclude: readonly string[]): GameState {
  const held = playersIn(state.players)
    .filter((player) => player.seat !== seat)
    .map((player) => player.mainDirectiveId);
  const cap = Math.floor(playersIn(state.players).length / 2);
  const breachHeld = playersIn(state.players).filter(
    (player) => player.seat !== seat && player.mainDirectiveId && directiveById(player.mainDirectiveId).alignment === "breach",
  ).length;
  const mayBreach = breachHeld < cap;

  const pool = MAIN_DIRECTIVES.filter(
    (directive) =>
      !held.includes(directive.id) &&
      !exclude.includes(directive.id) &&
      (mayBreach || directive.alignment === "containment"),
  );
  if (pool.length === 0) return state;

  const directive = pool[directivesSeed(state, seat, pool.length)] as (typeof MAIN_DIRECTIVES)[number];
  const player = playerAt(state.players, seat);
  return replacePlayer(state, { ...player, mainDirectiveId: directive.id });
}

function sealedGateBetween(state: GameState, from: string, to: string, steps: number): string | null {
  for (const gate of gatesAlong(from, to, steps)) {
    if (gateIsSealed(state, gate.id)) return gate.id;
  }
  return null;
}

function canAct(state: GameState): boolean {
  const player = playerAt(state.players, state.seat);
  return (
    state.phase === "action" &&
    !player.downed &&
    !player.tags.includes("held") &&
    !player.tags.includes("distracted")
  );
}

export function reduce(state: GameState, action: Action): Result<GameState> {
  if (state.outcome) {
    return reject(
      "game-over",
      state.outcome.terminal === "detonated"
        ? "The warhead already fired. Start a new game."
        : "The site was already recontained. Start a new game.",
    );
  }

  // §S2 Q26: the draft gates everything until the seat chooses.
  if (state.draft && action.type !== "chooseRole") {
    return reject("draft-pending", `${state.draft.seat} must choose a role first.`);
  }

  // §C3.5: an open compel must be answered before the turn continues.
  if (state.pendingCompel && action.type !== "respondCompel") {
    return reject("pending-compel", `${state.pendingCompel.target} must answer the compel.`);
  }

  // §C5.3: the Assembly pauses the table.
  if (state.vote && action.type !== "castVote") {
    return reject("vote-open", "The Emergency Assembly is voting.");
  }

  switch (action.type) {
    case "chooseRole": {
      const draft = state.draft;
      if (!draft) return reject("wrong-phase", "No role draft is open.");
      if (!draft.options.includes(action.roleId)) {
        return reject("invalid-value", `${action.roleId} is not one of the offered roles.`);
      }

      const role = roleById(action.roleId);
      const previous = draft.purpose === "respawn" ? playerAt(state.players, draft.seat).mainDirectiveId : null;
      let next = replacePlayer(state, playerFromRole(draft.seat, action.roleId, ARRIVAL_NODE, previous));

      if (draft.purpose === "setup") {
        const remaining = playersIn(next.players).filter((player) => player.roleId.length === 0);
        if (remaining.length > 0) {
          const seat = (remaining[0] as Player).seat;
          const drawn = drawOptions(next.rng, optionCount(ROLES.length - usedRoles(next).length, playersIn(next.players).length), usedRoles(next));
          next = {
            ...next,
            rng: drawn.rng,
            draft: { seat, options: drawn.options, purpose: "setup" },
            log: [...next.log, `${draft.seat} takes ${role.name.en}. ${seat} drafts next.`],
          };
          return ok(next);
        }

        next = dealDirectives({ ...next, draft: null, log: [...next.log, `${draft.seat} takes ${role.name.en}. The draft is complete.`] });
        return ok(next);
      }

      // Respawn: a new character, the old directive remembered, a new one dealt.
      next = dealOneDirective(next, draft.seat, [previous ?? ""]);
      return ok({
        ...next,
        draft: null,
        phase: "roll",
        log: [
          ...next.log,
          `${draft.seat} returns as ${role.name.en} with a new directive (the old one is remembered).`,
        ],
      });
    }

    case "rollMovement": {
      if (state.phase !== "roll") {
        return reject("wrong-phase", `Cannot roll during the ${state.phase} phase.`);
      }
      if (playerAt(state.players, state.seat).downed) {
        return reject("downed", `${state.seat} is down — respawn or skip the turn.`);
      }

      const forcedStill = playerAt(state.players, state.seat).tags.some((tag) => tag === "noMove" || tag === "bound");
      const [roll, rng] = rollD6(state.rng);
      const value = forcedStill ? 0 : roll;

      return ok({
        ...state,
        rng,
        phase: "move",
        roll: value,
        log: [...state.log, `${state.seat} rolled ${value}${forcedStill ? " (held in place)" : ""}.`],
      });
    }

    case "spendFateToReroll": {
      if (state.phase !== "move") {
        return reject("wrong-phase", "Re-roll the movement die after rolling, before choosing a landing.");
      }
      const player = playerAt(state.players, state.seat);
      const cost = fateRule().reroll;
      if (player.fate < cost) return reject("no-fate", `A re-roll costs ${cost} Fate; ${state.seat} has ${player.fate}.`);

      const [roll, rng] = rollD6(state.rng);
      return ok({
        ...replacePlayer(state, withFate(player, -cost)),
        rng,
        roll,
        log: [...state.log, `${state.seat} spends ${cost} Fate to re-roll ${state.roll} → ${roll}.`],
      });
    }

    case "moveTo": {
      if (state.phase !== "move") {
        return reject("wrong-phase", `Cannot move during the ${state.phase} phase.`);
      }

      const player = playerAt(state.players, state.seat);
      if (player.downed) {
        return reject("downed", `${state.seat} is down — respawn or skip the turn.`);
      }
      if (!canLandOn(player.node, action.node, state.roll)) {
        return reject("unreachable", `You cannot land on that space with a roll of ${state.roll}.`);
      }

      let destination;
      try {
        destination = getNode(action.node);
      } catch {
        return reject("unknown-node", "That space does not exist.");
      }

      const sealed = sealedGateBetween(state, player.node, action.node, state.roll);
      if (sealed) return reject("blocked-by-gate", `${sealed} is sealed until the round it reopens.`);

      const origin = getNode(player.node);
      const notes = [`${state.seat} moved from ${origin.name.en} to ${destination.name.en}.`];

      let next = state;
      for (const gate of gatesAlong(player.node, action.node, state.roll)) {
        const crossing = tryCrossGate(next, state.seat, gate);
        next = crossing.state;
        notes.push(...crossing.notes);
        if (!crossing.passed) {
          return ok({ ...next, phase: "action", log: [...next.log, ...notes] });
        }
      }

      // Entering a deeper ring is an attempt even without a gate (§7).
      if (ringDepth(action.node) > ringDepth(player.node)) next = markProgress(next, state.seat);
      next = rewardDepth(next, state.seat, player.node, action.node);
      const arrived = playerAt(next.players, state.seat);
      next = replacePlayer(next, { ...arrived, node: action.node });

      const kind = destination.kind;
      let drawn = next;

      if (kind === "lab" || kind === "cell") {
        const tier = deckForNode(action.node);
        if (tier) {
          const result = drawAnomaly(drawn, tier);
          drawn = result.state;
          if (!result.card) {
            return ok({ ...drawn, phase: "action", log: [...drawn.log, ...notes, `  the ${tier} pile is empty — nothing stirs here.`] });
          }
          return ok({
            ...drawn,
            phase: "space",
            encounter: { card: result.card, node: action.node },
            log: [...drawn.log, ...notes, `  ${anomalyName(result.card)} is here.`],
          });
        }
      }

      if (kind === "alarm") {
        drawn = drawFromAlarm(drawn, state.seat);
        return ok({ ...drawn, phase: "action", log: [...drawn.log, ...notes] });
      }

      if (kind === "supply" || kind === "terminal") {
        // §14b: side directives are cut from the MVP; terminal nodes draw equipment.
        const acquired = applyEffects(drawn, state.seat, [{ kind: "drawCard", deck: "equipment", count: 1 }]);
        return ok({ ...acquired.state, phase: "action", log: [...acquired.state.log, ...notes, ...acquired.notes] });
      }

      return ok({ ...drawn, phase: "action", log: [...drawn.log, ...notes] });
    }

    case "resolveAnomaly": {
      if (state.phase !== "space") {
        return reject("wrong-phase", `There is no encounter during the ${state.phase} phase.`);
      }
      if (!state.encounter) return reject("no-encounter", "No anomaly is waiting.");

      const cardId = state.encounter.card;
      const card = ANOMALIES.find((anomaly) => anomaly.id === cardId);
      if (!card) return reject("no-encounter", "That anomaly is not in the deck.");

      const seat = state.seat;
      const notes: string[] = [];
      const consequences: string[] = [];
      let next = state;

      if (action.choice === "decline") {
        if (card.declineCost.length > 0) {
          const cost = applyEffects(next, seat, card.declineCost);
          next = cost.state;
          notes.push(`${seat} walked away from ${card.name.en} — ${cost.notes.join(", ")}.`);
        } else {
          notes.push(`${seat} walked away from ${card.name.en}.`);
        }
        next = addTurnEvent(next, seat, "declined");
        return ok({ ...next, phase: "action", encounter: null, log: [...next.log, ...notes] });
      }

      // Taking the test is the attempt; the tier decides the consequence (§D16).
      next = markProgress(next, seat);
      next = addTurnEvent(next, seat, "startedContainment");
      const { state: rolled, result } = rollTest(next, seat, card.test.stat, card.test.difficulty, "anomaly");
      next = rolled;
      notes.push(`contain ${card.name.en} — ${describeTest(result)}`);

      const apply = (effects: readonly Effect[]): void => {
        if (effects.length === 0) return;
        const applied = applyEffects(next, seat, effects);
        next = applied.state;
        consequences.push(`  ${applied.notes.join(", ")}`);
      };

      const player = playerAt(next.players, seat);

      switch (result.outcome) {
        case "clean":
        case "success": {
          const tier = card.tier;
          apply([
            {
              kind: "modifyRecords",
              delta: containmentRecords(player, tier, card.reward.records),
            },
          ]);
          const counterKey = tier === "safe" ? "containmentsSafe" : tier === "euclid" ? "containmentsEuclid" : "containmentsKeter";
          const after = playerAt(next.players, seat);
          next = replacePlayer(next, {
            ...after,
            counters: { ...after.counters, containments: after.counters.containments + 1, [counterKey]: after.counters[counterKey] + 1 },
          });
          next = addTurnEvent(next, seat, "contained");
          break;
        }
        case "collateral": {
          apply([{ kind: "modifyRecords", delta: containmentRecords(player, card.tier, card.reward.records) }, ...card.collateral]);
          const counterKey = card.tier === "safe" ? "containmentsSafe" : card.tier === "euclid" ? "containmentsEuclid" : "containmentsKeter";
          const after = playerAt(next.players, seat);
          next = replacePlayer(next, {
            ...after,
            counters: { ...after.counters, containments: after.counters.containments + 1, [counterKey]: after.counters[counterKey] + 1 },
          });
          next = addTurnEvent(next, seat, "contained");
          break;
        }
        case "failure": {
          apply(card.failure);
          notes.push(`  no containment.`);
          break;
        }
        case "breach": {
          apply([...card.breach, { kind: "placeEvidence", evidence: "uncontained" }]);
          notes.push(`  it gets out.`);
          const after = playerAt(next.players, seat);
          next = replacePlayer(next, withFate(after, fateRule().breach));
          break;
        }
      }

      const after = playerAt(next.players, seat);
      if (after.downed) {
        consequences.push(`${seat} is down at ${getNode(after.node).name.en}.`);
      }

      return ok({
        ...next,
        phase: "action",
        encounter: null,
        log: [...next.log, ...consequences, ...notes],
      });
    }

    case "attemptClearance": {
      if (state.phase !== "action") {
        return reject("wrong-phase", `Cannot buy clearance during the ${state.phase} phase.`);
      }

      const buyer = playerAt(state.players, state.seat);
      if (buyer.downed) {
        return reject("downed", `${state.seat} is down — respawn before buying clearance.`);
      }
      if (buyer.tags.includes("held") || buyer.tags.includes("distracted")) {
        return reject("wrong-phase", `${state.seat} loses this action.`);
      }

      const here = getNode(buyer.node);
      if (here.kind !== "checkpoint") return reject("no-checkpoint", `${here.name.en} has no access desk.`);

      const level = action.level;
      if (level < 2 || level > 4 || level !== buyer.clearance + 1) {
        return reject("clearance-order", `Clearance ${level} is not the next level from ${buyer.clearance}.`);
      }

      const price = clearancePrice(level as 2 | 3 | 4);
      if (buyer.records < price) {
        return reject("not-enough-records", `Clearance ${level} costs ${price} Records; ${state.seat} has ${buyer.records}.`);
      }

      return ok({
        ...markProgress(state, state.seat),
        players: {
          ...state.players,
          [state.seat]: { ...buyer, clearance: level, records: buyer.records - price },
        },
        log: [
          ...state.log,
          `${state.seat} bought clearance ${buyer.clearance} → ${level} for ${price} Records at ${here.name.en}.`,
        ],
      });
    }

    case "advanceProtocol": {
      if (!canAct(state)) {
        return reject("wrong-phase", `Cannot advance the protocol during the ${state.phase} phase.`);
      }

      const engineer = playerAt(state.players, state.seat);
      if (getNode(engineer.node).kind !== "core") {
        return reject("no-core", "The protocol is worked from the Command Center.");
      }

      const attempted = markProgress(state, state.seat);
      const { steps: ceiling, difficulty } = protocolRule();
      const { state: rolled, result } = rollTest(attempted, state.seat, "intellect", difficulty, "protocol");

      if (result.shift < 0) {
        return ok({ ...rolled, log: [...rolled.log, `  protocol holds — ${describeTest(result)}`] });
      }

      const steps = Math.min(ceiling, rolled.protocolSteps + 1);
      const fired = steps >= ceiling;
      let next: GameState = { ...rolled, protocolSteps: steps };

      if (fired) {
        const finisher = playerAt(next.players, state.seat);
        next = replacePlayer(next, {
          ...finisher,
          counters: { ...finisher.counters, protocolFinishers: finisher.counters.protocolFinishers + 1 },
        });
        next = { ...next, outcome: resolveOutcome(next, "recontained"), phase: "end" };
      }

      const winners = next.outcome?.winners ?? [];
      return ok({
        ...next,
        log: [
          ...next.log,
          `  protocol ${rolled.protocolSteps} → ${steps} — ${describeTest(result)}`,
          ...(fired
            ? [`the site is recontained. ${winners.join(", ") || "nobody"} ${winners.length === 1 ? "wins" : "win"} by their directive.`]
            : []),
        ],
      });
    }

    case "sabotageProtocol": {
      if (!canAct(state)) {
        return reject("wrong-phase", `Cannot sabotage the protocol during the ${state.phase} phase.`);
      }

      const saboteur = playerAt(state.players, state.seat);
      if (getNode(saboteur.node).kind !== "core") {
        return reject("no-core", "The protocol is worked from the Command Center.");
      }

      const steps = Math.max(0, state.protocolSteps - 1);
      const marked = applyEffects({ ...state, protocolSteps: steps }, state.seat, [
        { kind: "placeEvidence", evidence: "tamperedProtocol" },
      ]);

      return ok({
        ...marked.state,
        log: [
          ...marked.state.log,
          `${state.seat} sabotaged the protocol ${state.protocolSteps} → ${steps}.`,
          ...marked.notes.map((note) => `  ${note}`),
        ],
      });
    }

    case "compel": {
      if (!canAct(state)) return reject("wrong-phase", "Compels happen on your own action phase.");
      if (action.target === state.seat) return reject("invalid-target", "You cannot compel yourself.");

      const target = state.players[action.target];
      if (!target) return reject("invalid-target", "That seat does not exist.");
      if (target.aspectId !== action.aspectId) return reject("compel-unavailable", "That aspect is not theirs.");

      const aspect = target.aspectId ? aspectById(target.aspectId) : null;
      const compel = aspect?.compels[action.compelIndex];
      if (!compel) return reject("compel-unavailable", "That compel does not exist.");

      const invoker = playerAt(state.players, state.seat);
      const cost = fateRule().invokeCompel;
      if (invoker.fate < cost) return reject("no-fate", `Invoking costs ${cost} Fate; ${state.seat} has ${invoker.fate}.`);

      if (state.turnEvents.some((event) => event.seat === state.seat && event.event === "compelled")) {
        return reject("compel-unavailable", "One compel per turn.");
      }

      if (!evalCondition(state, action.target, compel.condition)) {
        return reject("compel-unavailable", "The situation does not make that compel apply.");
      }

      const paid = replacePlayer(state, withFate(invoker, -cost));
      return ok({
        ...paid,
        pendingCompel: {
          invoker: state.seat,
          target: action.target,
          aspectId: action.aspectId,
          compelIndex: action.compelIndex,
        },
        turnEvents: [...paid.turnEvents, { seat: state.seat, event: "compelled" }],
        log: [...paid.log, `${state.seat} compels ${action.target}: "${compel.text.en}"`],
      });
    }

    case "respondCompel": {
      const pending = state.pendingCompel;
      if (!pending) return reject("wrong-phase", "No compel is waiting.");

      const aspect = aspectById(pending.aspectId);
      const compel = aspect?.compels[pending.compelIndex];
      if (!compel) return reject("compel-unavailable", "That compel is no longer valid.");

      const target = playerAt(state.players, pending.target);

      if (action.accept) {
        const applied = applyEffects(state, pending.target, compel.effect);
        const gained = replacePlayer(applied.state, withFate(playerAt(applied.state.players, pending.target), fateRule().acceptCompel));
        return ok({
          ...gained,
          pendingCompel: null,
          log: [...gained.log, `${pending.target} accepts. ${applied.notes.join(", ")}.`],
        });
      }

      const waiverIndex = target.gear.findIndex((id) => gearById(id).modifiers.some((modifier) => modifier.kind === "refuseFree"));
      const cost = waiverIndex >= 0 ? 0 : fateRule().refuseCompel;
      if (target.fate < cost) {
        return reject("no-fate", `${pending.target} has no Fate and cannot refuse.`);
      }

      const gear = waiverIndex >= 0 ? target.gear.filter((_, index) => index !== waiverIndex) : target.gear;
      let next = replacePlayer(state, withFate({ ...target, gear }, -cost));
      return ok({
        ...next,
        pendingCompel: null,
        log: [
          ...next.log,
          `${pending.target} refuses${waiverIndex >= 0 ? " with the Ethics Waiver" : ` (${cost} Fate)`}.`,
        ],
      });
    }

    case "useItem": {
      const player = playerAt(state.players, state.seat);
      const item = player.gear.includes(action.itemId) ? gearById(action.itemId) : null;
      if (!item) return reject("no-item", "You do not carry that.");

      // A movement item is usable in the move phase; everything else waits for the action.
      const movementItem = item.effects.some((effect) => effect.kind === "modifyRoll");
      if (state.phase === "move" && movementItem) {
        // allowed
      } else if (!canAct(state)) {
        return reject("wrong-phase", "Use gear on your own action phase.");
      }

      if (item.lifetime !== "consumed") {
        return reject("invalid-target", `${item.name.en} is a standing modifier, not a use.`);
      }

      const applied = applyEffects(state, state.seat, item.effects);
      const after = playerAt(applied.state.players, state.seat);
      const next = replacePlayer(applied.state, {
        ...after,
        gear: after.gear.filter((id) => id !== action.itemId),
        maxIntegrity: Math.max(1, (after.roleId ? roleById(after.roleId).maxIntegrity : TUNING.start.maxIntegrity) + gearMaxIntegrity(after.gear)),
      });

      return ok({
        ...next,
        log: [...next.log, `${state.seat} uses ${item.name.en}.`, ...applied.notes.map((note) => `  ${note}`)],
      });
    }

    case "rest": {
      if (!canAct(state)) return reject("wrong-phase", "Rest on your own action phase.");
      const player = playerAt(state.players, state.seat);
      if (player.tags.includes("rested")) return reject("invalid-target", "You already rested this turn.");

      const here = getNode(player.node);
      const heal = 1 + (here.kind === "medical" ? 1 : 0) + gearHealBonus(player.gear);
      const applied = applyEffects(state, state.seat, [{ kind: "modifyIntegrity", delta: heal }]);
      const next = replacePlayer(applied.state, {
        ...playerAt(applied.state.players, state.seat),
        tags: [...playerAt(applied.state.players, state.seat).tags, "rested"],
      });

      return ok({
        ...next,
        log: [...next.log, `${state.seat} rests at ${here.name.en} — +${heal} Integrity.`],
      });
    }

    case "rescue": {
      if (!canAct(state)) return reject("wrong-phase", "Rescue on your own action phase.");
      if (action.target === state.seat) return reject("invalid-target", "You cannot rescue yourself.");

      const rescuer = playerAt(state.players, state.seat);
      const target = state.players[action.target];
      if (!target || !target.downed) return reject("invalid-target", "That seat is not down.");

      const radio = hasModifier(rescuer.gear, "rescueAdjacent");
      const reachable = target.node === rescuer.node || (radio && distance(rescuer.node, target.node) <= 1);
      if (!reachable) return reject("not-adjacent", "You must be on their space (or adjacent with a Field Radio).");

      const revived = replacePlayer(state, {
        ...target,
        downed: false,
        integrity: 1,
      });
      const withCounter = replacePlayer(revived, {
        ...rescuer,
        counters: { ...rescuer.counters, rescues: rescuer.counters.rescues + 1 },
      });

      return ok({
        ...withCounter,
        log: [...withCounter.log, `${state.seat} rescues ${action.target} at ${getNode(target.node).name.en}.`],
      });
    }

    case "sealGate": {
      if (!canAct(state)) return reject("wrong-phase", "Seal a gate on your own action phase.");
      const gate = BOARD.gates.find((candidate) => candidate.id === action.gateId);
      if (!gate) return reject("no-gate", "That gate does not exist.");

      const player = playerAt(state.players, state.seat);
      if (player.node !== gate.a && player.node !== gate.b) {
        return reject("not-adjacent", "You must stand at one end of the gate.");
      }

      const reopen = state.round + voteRule().lockRounds;
      const applied = applyEffects(state, state.seat, [{ kind: "placeEvidence", evidence: "sealedGate" }]);
      const after = playerAt(applied.state.players, state.seat);
      const next = replacePlayer(applied.state, {
        ...after,
        counters: { ...after.counters, sealedGates: after.counters.sealedGates + 1 },
      });

      return ok({
        ...next,
        sealedGates: { ...next.sealedGates, [action.gateId]: reopen },
        log: [...next.log, `${state.seat} seals ${action.gateId} until round ${reopen}.`],
      });
    }

    case "castVote": {
      const vote = state.vote;
      if (!vote) return reject("no-vote", "No Assembly is voting.");
      if (vote.votes[state.seat]) return reject("invalid-value", `${state.seat} already voted.`);

      const votes = { ...vote.votes, [state.seat]: action.choice };
      let next: GameState = { ...state, vote: { ...vote, votes } };
      const seats = playersIn(next.players).map((player) => player.seat);

      if (seats.every((seat) => votes[seat])) {
        const resolved = resolveVote(next);
        next = resolved.state;
        next = { ...next, seat: vote.initiator, log: [...next.log, ...resolved.notes] };
      } else {
        const nextSeat = seats.find((seat) => !votes[seat]) as SeatId;
        next = { ...next, seat: nextSeat, log: [...next.log, `${state.seat} votes ${action.choice}.`] };
      }

      return ok(next);
    }

    case "respawn": {
      if (state.phase !== "roll") return reject("wrong-phase", `Cannot respawn during the ${state.phase} phase.`);
      const player = playerAt(state.players, state.seat);
      if (!player.downed) return reject("not-downed", `${state.seat} is not down.`);

      const exclude = usedRoles(state);
      const count = optionCount(ROLES.length - exclude.length, playersIn(state.players).length);
      const drawn = drawOptions(state.rng, count, exclude);

      return ok({
        ...state,
        rng: drawn.rng,
        draft: { seat: state.seat, options: drawn.options.length > 0 ? drawn.options : [player.roleId], purpose: "respawn" },
        log: [...state.log, `${state.seat} chooses a new character.`],
      });
    }

    case "endTurn": {
      const active = playerAt(state.players, state.seat);
      const canPass = state.phase === "action" || (state.phase === "roll" && active.downed);
      if (!canPass) return reject("wrong-phase", `Cannot end the turn during the ${state.phase} phase.`);

      let settled = state;

      // D16: a stall is a *choice*, so only a turn with no attempt counts.
      if (!state.turnProgress && !active.downed) {
        const stalled = active.stalledTurns + 1;
        settled = replacePlayer(settled, { ...active, stalledTurns: stalled });
        if (stalled >= stallRule().hazardAfter) {
          settled = drawFromAlarm(
            replacePlayer(settled, { ...playerAt(settled.players, state.seat), stalledTurns: 0 }),
            state.seat,
          );
          settled = { ...settled, log: [...settled.log, `${state.seat} stalled three turns running — a hazard.`] };
        }
      } else if (state.turnProgress) {
        settled = replacePlayer(settled, { ...active, stalledTurns: 0 });
      }

      settled = removeTags(settled, ["bound", "held", "distracted", "rested", "unseen", "hardTest"]);

      const order = playersIn(settled.players).map((player) => player.seat);
      const index = order.indexOf(state.seat);
      const wrapped = index === order.length - 1;
      if (wrapped) settled = endRound(settled);

      if (settled.outcome) {
        return ok({ ...settled, phase: "end", roll: 0, encounter: null, lastTest: null });
      }

      const nextSeat = order[(index + 1) % order.length] as SeatId;
      const round = wrapped ? settled.round + 1 : settled.round;
      const nextPlayer = playerAt(settled.players, nextSeat);

      return ok({
        ...settled,
        seat: nextSeat,
        round,
        phase: "roll",
        roll: 0,
        encounter: null,
        lastTest: null,
        turnProgress: false,
        turnEvents: [],
        log: [
          ...settled.log,
          ...(nextPlayer.downed ? [`— ${nextSeat} is down (respawn or skip).`] : []),
          `— ${nextSeat} to act (round ${round}).`,
        ],
      });
    }

    case "devRoll": {
      if (state.phase !== "roll") return reject("wrong-phase", `Cannot roll during the ${state.phase} phase.`);
      if (!Number.isInteger(action.value) || action.value < 1 || action.value > 6) {
        return reject("invalid-value", `A d6 shows 1 to 6, not ${action.value}.`);
      }

      const [, rng] = rollD6(state.rng);
      return ok({
        ...state,
        rng,
        phase: "move",
        roll: action.value,
        log: [...state.log, `${state.seat} forced a roll of ${action.value} (dev tool).`],
      });
    }

    case "devEncounter": {
      if (state.encounter) return reject("no-encounter", "An encounter is already open.");
      const card = ANOMALIES.find((anomaly) => anomaly.id === action.card);
      if (!card) return reject("invalid-value", `No such anomaly: ${action.card}`);

      return ok({
        ...state,
        phase: "space",
        encounter: { card: card.id, node: playerAt(state.players, state.seat).node },
        log: [...state.log, `${state.seat} forced an encounter with ${card.name.en} (dev tool).`],
      });
    }

    case "devHurt": {
      if (!Number.isInteger(action.amount) || action.amount < 1) {
        return reject("invalid-value", `Damage must be a positive integer, not ${action.amount}.`);
      }
      const hurt = applyEffects(state, state.seat, [{ kind: "modifyIntegrity", delta: -action.amount }]);
      const down = playerAt(hurt.state.players, state.seat).downed;

      return ok({
        ...hurt.state,
        log: [
          ...hurt.state.log,
          ...(down ? [`${state.seat} is down at ${getNode(playerAt(hurt.state.players, state.seat).node).name.en}.`] : []),
          `${state.seat} took ${action.amount} damage (dev tool).`,
        ],
      });
    }

    case "devEscalation": {
      const card = ESCALATION_BY_ID.get(action.card);
      if (!card) return reject("invalid-value", `No such escalation card: ${action.card}`);
      return ok(drawEscalation(state, state.seat, action.card));
    }

    case "devDirective": {
      const player = state.players[action.seat];
      if (!player) return reject("invalid-target", "No such seat.");
      if (!directiveById(action.directiveId)) return reject("invalid-value", "No such directive.");
      return ok(replacePlayer(state, { ...player, mainDirectiveId: action.directiveId }));
    }

    case "devOutcome": {
      return ok({
        ...state,
        outcome: resolveOutcome(state, action.terminal),
        phase: "end",
        roll: 0,
        encounter: null,
        lastTest: null,
        log: [
          ...state.log,
          action.terminal === "detonated"
            ? "the Alpha Warhead detonated (dev tool)."
            : "the site is recontained (dev tool).",
        ],
      });
    }

    default:
      return reject("unknown-action", "Unknown action.");
  }
}

/** Small local helpers kept out of the switch. */

export { sign as showSign };
export type { Alignment, Draft };
