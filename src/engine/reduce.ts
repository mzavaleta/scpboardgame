/**
 * The reducer: `(state, action) -> Result<state>`.
 *
 * Pure. No DOM, no I/O, no clock, no `Math.random()`. Movement follows the
 * owner's Talisman ruling (§D5): the die gives the distance, the player gives the
 * destination, and the move is a single irreversible decision.
 *
 * M2 adds the `space` phase: a landing on a `lab` or `cell` draws an anomaly, the
 * active seat chooses contain or decline, and the §5 tier table resolves it. It
 * also enforces clearance at gates, which used to be undetectable (§14f).
 */

import { CONFIG_FINGERPRINT, TUNING, clearancePrice, protocolRule, threatRule } from "../config/tuning";
import { ANOMALIES } from "../content/anomalies";
import { ARRIVAL_NODE } from "../content/board";
import { gatesAlong, getNode, ringDepth } from "./board";
import { anomalyName, deckForNode, describeTest, drawAnomaly, rollTest } from "./encounter";
import { applyEffects } from "./effects";
import { canLandOn } from "./movement";
import { rollD6 } from "./rng";
import { ok, playerAt, playersIn, reject, SEAT_ORDER } from "./types";
import type { Action, Effect, GameState, Player, Result, SeatId } from "./types";

// Start values live in `src/config/tuning.json` (see `start`), so a designer can
// change them without touching code. The role draft (M3c) will replace the flat
// stats with a chosen sheet; until then both seats are identical on purpose.


const sign = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

export function createGame(seed: number, seats: readonly SeatId[] = SEAT_ORDER): GameState {
  if (seats.length < 2) throw new Error("createGame: at least two seats are required");

  const players = Object.fromEntries(
    seats.map((seat) => [
      seat,
      {
        seat,
        node: ARRIVAL_NODE,
        integrity: TUNING.start.integrity,
        maxIntegrity: TUNING.start.maxIntegrity,
        fate: TUNING.start.fate,
        stats: TUNING.start.stats,
        records: 0,
        clearance: TUNING.start.clearance,
        evidence: { accident: 0, intent: 0, tamperedProtocol: 0 },
        tags: [],
        downed: false,
      } satisfies Player,
    ]),
  ) as Partial<Record<SeatId, Player>>;

  return {
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
    outcome: null,
    hunters: 0,
    config: CONFIG_FINGERPRINT,
    encounter: null,
    lastTest: null,
    log: [`Round 1 — ${seats[0]} to act.`],
  };
}

/**
 * §D16: a progress *attempt*, not an outcome. One seat trying is enough to hold
 * the track, which is the whole point — a bad roll is not camping.
 */
function markProgress(state: GameState, seat: SeatId): GameState {
  if (state.progressThisRound.includes(seat)) return state;
  return { ...state, progressThisRound: [...state.progressThisRound, seat] };
}

/**
 * §S2 round boundary, in the order the document fixes: the track reads the
 * round's attempts, the top arms the warhead, and an already-armed warhead spends
 * one round. Arming never ticks the same round.
 */
function endRound(state: GameState): GameState {
  const { max, countdown } = threatRule();
  const notes: string[] = [];
  let threat = state.threat;
  let warhead = state.warhead;
  let outcome = state.outcome;

  if (state.progressThisRound.length === 0) {
    threat = Math.min(max, threat + 1);
    notes.push(`no one advanced the site — threat ${state.threat} → ${threat}.`);
    if (threat >= max && warhead === null) {
      warhead = { remaining: countdown };
      notes.push(`the Alpha Warhead is armed — ${countdown} rounds to detonation.`);
    }
  }

  if (state.warhead !== null) {
    const remaining = state.warhead.remaining - 1;
    warhead = { remaining };
    if (remaining <= 0) {
      outcome = { terminal: "detonated", winners: [] };
      notes.push("the Alpha Warhead detonated. The site is lost, and nobody wins.");
    } else {
      notes.push(`the warhead counts down — ${remaining} round${remaining === 1 ? "" : "s"} left.`);
    }
  }

  return { ...state, threat, warhead, outcome, progressThisRound: [], log: [...state.log, ...notes] };
}

/** Clearance level first, then the key tag, then the gate's Intellect test. */
function tryCrossGate(
  state: GameState,
  seat: SeatId,
  gate: ReturnType<typeof gatesAlong>[number],
): { readonly state: GameState; readonly passed: boolean; readonly notes: readonly string[] } {
  const player = playerAt(state.players, seat);
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
      state: { ...state, players: { ...state.players, [seat]: { ...player, tags: player.tags.filter((t) => t !== "key") } } },
      passed: true,
      notes,
    };
  }

  const { state: rolled, result } = rollTest(state, seat, gate.test.stat, gate.test.difficulty, "gate");
  // Newest-first display: the detail is pushed before its own summary line.
  const verdict = result.shift >= 0 ? `crossed ${gate.id}.` : `the gate holds.`;
  notes.push(`  ${verdict}`, `clearance check at ${gate.id} — ${describeTest(result)}`);

  if (result.shift >= 0) {
    return { state: rolled, passed: true, notes };
  }

  // §C2.3: a failed gate is an *accident*, public noise that can never satisfy a
  // breach directive on its own.
  const marked = applyEffects(rolled, seat, [{ kind: "placeEvidence", evidence: "accident" }]);
  return { state: marked.state, passed: false, notes: [...notes, ...marked.notes] };
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

  switch (action.type) {
    case "rollMovement": {
      if (state.phase !== "roll") {
        return reject("wrong-phase", `Cannot roll during the ${state.phase} phase.`);
      }
      if (playerAt(state.players, state.seat).downed) {
        return reject("downed", `${state.seat} is down — respawn or skip the turn.`);
      }

      const [roll, rng] = rollD6(state.rng);

      return ok({
        ...state,
        rng,
        phase: "move",
        roll,
        log: [...state.log, `${state.seat} rolled ${roll}.`],
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

      const origin = getNode(player.node);
      const notes = [`${state.seat} moved from ${origin.name.en} to ${destination.name.en}.`];

      // Gates are edges crossed *mid-path*, and movement is one destination, so
      // the engine has to work out which gates the route cannot avoid (§14f).
      let next = state;
      for (const gate of gatesAlong(player.node, action.node, state.roll)) {
        const crossing = tryCrossGate(next, state.seat, gate);
        next = crossing.state;
        notes.push(...crossing.notes);
        if (!crossing.passed) {
          return ok({ ...next, phase: "action", log: [...next.log, ...notes] });
        }
      }

      const mover = playerAt(next.players, state.seat);
      // Entering a deeper ring is an attempt even without a gate (§7).
      if (ringDepth(action.node) > ringDepth(player.node)) next = markProgress(next, state.seat);
      next = {
        ...next,
        players: { ...next.players, [state.seat]: { ...mover, node: action.node } },
        log: [...next.log, ...notes],
      };

      const deck = deckForNode(action.node);
      if (!deck) {
        return ok({ ...next, phase: "action" });
      }

      const drawn = drawAnomaly(next, deck);
      next = drawn.state;
      if (!drawn.card) {
        return ok({
          ...next,
          phase: "action",
          log: [...next.log, `  the ${deck} pile is empty — nothing stirs here.`],
        });
      }

      return ok({
        ...next,
        phase: "space",
        encounter: { card: drawn.card, node: action.node },
        log: [...next.log, `  ${anomalyName(drawn.card)} is here.`],
      });
    }

    case "resolveAnomaly": {
      if (state.phase !== "space") {
        return reject("wrong-phase", `There is no encounter during the ${state.phase} phase.`);
      }
      if (!state.encounter) {
        return reject("no-encounter", "No anomaly is waiting.");
      }

      const cardId = state.encounter.card;
      const card = ANOMALIES.find((anomaly) => anomaly.id === cardId);
      if (!card) return reject("no-encounter", "That anomaly is not in the deck.");

      const seat = state.seat;
      const notes: string[] = [];
      // Consequences are collected separately and the outcome summary is pushed
      // LAST, because the log is read newest-first: the headline must sit on top
      // of its own detail, not underneath it (§14j J2).
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
        return ok({ ...next, phase: "action", encounter: null, log: [...next.log, ...notes] });
      }

      // Taking the test is the attempt; the tier decides the consequence (§D16).
      next = markProgress(next, seat);
      const { state: rolled, result } = rollTest(next, seat, card.test.stat, card.test.difficulty, "anomaly");
      next = rolled;
      notes.push(`contain ${card.name.en} — ${describeTest(result)}`);

      const apply = (effects: readonly Effect[]): void => {
        if (effects.length === 0) return;
        const applied = applyEffects(next, seat, effects);
        next = applied.state;
        consequences.push(`  ${applied.notes.join(", ")}`);
      };

      switch (result.outcome) {
        case "clean":
        case "success": {
          apply([{ kind: "modifyRecords", delta: card.reward.records }]);
          break;
        }
        case "collateral": {
          apply([{ kind: "modifyRecords", delta: card.reward.records }, ...card.collateral]);
          // No editorial line here: for a few Safe cards the collateral column is a
          // reward (§14f.6), so "not for free" would be a lie. The effects say it.
          break;
        }
        case "failure": {
          apply(card.failure);
          notes.push(`  no containment.`);
          break;
        }
        case "breach": {
          apply([...card.breach, { kind: "placeEvidence", evidence: "accident" }]);
          notes.push(`  it gets out.`);
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
      // §C1.4, M3a. The access economy's only sink: Records become clearance,
      // and clearance is what turns the gates from a coin flip into a wall you
      // paid to walk through. One level at a time — the ladder is the price.
      if (state.phase !== "action") {
        return reject("wrong-phase", `Cannot buy clearance during the ${state.phase} phase.`);
      }

      const buyer = playerAt(state.players, state.seat);
      if (buyer.downed) {
        return reject("downed", `${state.seat} is down — respawn before buying clearance.`);
      }

      const here = getNode(buyer.node);
      if (here.kind !== "checkpoint") {
        return reject("no-checkpoint", `${here.name.en} has no access desk.`);
      }

      const level = action.level;
      if (level < 2 || level > 4 || level !== buyer.clearance + 1) {
        return reject(
          "clearance-order",
          `Clearance ${level} is not the next level from ${buyer.clearance}.`,
        );
      }

      const price = clearancePrice(level as 2 | 3 | 4);
      if (buyer.records < price) {
        return reject(
          "not-enough-records",
          `Clearance ${level} costs ${price} Records; ${state.seat} has ${buyer.records}.`,
        );
      }

      return ok({
        ...markProgress(state, state.seat),
        players: {
          ...state.players,
          [state.seat]: {
            ...buyer,
            clearance: level,
            records: buyer.records - price,
          },
        },
        log: [
          ...state.log,
          `${state.seat} bought clearance ${buyer.clearance} → ${level} for ${price} Records ` +
            `at ${here.name.en}.`,
        ],
      });
    }

    case "advanceProtocol": {
      // §C4.4. The last act of the game is a contested counter, not a finish
      // line: three steps up recontain the site, and everyone can watch it move.
      if (state.phase !== "action") {
        return reject("wrong-phase", `Cannot advance the protocol during the ${state.phase} phase.`);
      }

      const engineer = playerAt(state.players, state.seat);
      if (engineer.downed) return reject("downed", `${state.seat} is down.`);
      if (getNode(engineer.node).kind !== "core") {
        return reject("no-core", "The protocol is worked from the Command Center.");
      }

      // The attempt counts whether or not the test lands (§D16, §7).
      const attempted = markProgress(state, state.seat);
      const { steps: ceiling, difficulty } = protocolRule();
      const { state: rolled, result } = rollTest(attempted, state.seat, "intellect", difficulty, "protocol");

      if (result.shift < 0) {
        return ok({
          ...rolled,
          log: [...rolled.log, `  protocol holds — ${describeTest(result)}`],
        });
      }

      const steps = Math.min(ceiling, rolled.protocolSteps + 1);
      const fired = steps >= ceiling;
      const winners = fired
        ? playersIn(rolled.players)
            .filter((player) => player.node === "core-00" && !player.downed)
            .map((player) => player.seat)
        : [];

      return ok({
        ...rolled,
        protocolSteps: steps,
        ...(fired
          ? { outcome: { terminal: "recontained" as const, winners }, phase: "end" as const }
          : {}),
        log: [
          ...rolled.log,
          `  protocol ${rolled.protocolSteps} → ${steps} — ${describeTest(result)}`,
          ...(fired
            ? [`the site is recontained. ${winners.join(", ") || "nobody"} ${winners.length === 1 ? "wins" : "win"} at the centre.`]
            : []),
        ],
      });
    }

    case "sabotageProtocol": {
      if (state.phase !== "action") {
        return reject("wrong-phase", `Cannot sabotage the protocol during the ${state.phase} phase.`);
      }

      const saboteur = playerAt(state.players, state.seat);
      if (saboteur.downed) return reject("downed", `${state.seat} is down.`);
      if (getNode(saboteur.node).kind !== "core") {
        return reject("no-core", "The protocol is worked from the Command Center.");
      }

      const steps = Math.max(0, state.protocolSteps - 1);
      // D18: hidden motive, visible evidence — the counter moves down and the
      // token appears on the actor. No test, by design.
      const marked = applyEffects(
        { ...state, protocolSteps: steps },
        state.seat,
        [{ kind: "placeEvidence", evidence: "tamperedProtocol" }],
      );

      return ok({
        ...marked.state,
        log: [
          ...marked.state.log,
          `${state.seat} sabotaged the protocol ${state.protocolSteps} → ${steps}.`,
          ...marked.notes.map((note) => `  ${note}`),
        ],
      });
    }

    case "respawn": {
      if (state.phase !== "roll") {
        return reject("wrong-phase", `Cannot respawn during the ${state.phase} phase.`);
      }
      const player = playerAt(state.players, state.seat);
      if (!player.downed) {
        return reject("not-downed", `${state.seat} is not down.`);
      }

      // Q22 simplified: no new character sheet until the role draft exists (M3).
      return ok({
        ...state,
        phase: "action",
        players: {
          ...state.players,
          [state.seat]: {
            ...player,
            node: ARRIVAL_NODE,
            integrity: player.maxIntegrity,
            downed: false,
          },
        },
        log: [
          ...state.log,
          `${state.seat} respawned at the arrival gate with ${player.maxIntegrity} Integrity ` +
            `(same character — the draft lands in M3).`,
        ],
      });
    }

    case "endTurn": {
      const active = playerAt(state.players, state.seat);
      const canPass = state.phase === "action" || (state.phase === "roll" && active.downed);
      if (!canPass) {
        return reject("wrong-phase", `Cannot end the turn during the ${state.phase} phase.`);
      }

      const order = playersIn(state.players).map((player) => player.seat);
      const index = order.indexOf(state.seat);
      const wrapped = index === order.length - 1;
      // The round boundary resolves before the next round starts (§S2).
      const settled = wrapped ? endRound(state) : state;

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
        log: [
          ...settled.log,
          ...(nextPlayer.downed ? [`— ${nextSeat} is down (respawn or skip).`] : []),
          `— ${nextSeat} to act (round ${round}).`,
        ],
      });
    }

    case "devRoll": {
      // §14e. A dev tool, not a rule: it exists so a test can see any landing
      // table on demand. It consumes the die anyway, so the stream position
      // stays identical to a real roll and toggling it cannot desync a replay.
      if (state.phase !== "roll") {
        return reject("wrong-phase", `Cannot roll during the ${state.phase} phase.`);
      }
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
      // §14j T7: a playtest must be able to see any card on demand, not hunt for
      // it. Same rule as devRoll — it announces itself and touches nothing else.
      if (state.encounter) {
        return reject("no-encounter", "An encounter is already open.");
      }
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
      // §14j T9: reaching 0 Integrity must be testable in seconds, not luck.
      if (!Number.isInteger(action.amount) || action.amount < 1) {
        return reject("invalid-value", `Damage must be a positive integer, not ${action.amount}.`);
      }
      const hurt = applyEffects(state, state.seat, [
        { kind: "modifyIntegrity", delta: -action.amount },
      ]);
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

    default:
      return reject("unknown-action", "Unknown action.");
  }
}

export { sign as showSign };
