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

import { ANOMALIES } from "../content/anomalies";
import { ARRIVAL_NODE } from "../content/board";
import { gatesAlong, getNode } from "./board";
import { anomalyName, deckForNode, describeTest, drawAnomaly, rollTest } from "./encounter";
import { applyEffects } from "./effects";
import { canLandOn } from "./movement";
import { rollD6 } from "./rng";
import { ok, playerAt, playersIn, reject, SEAT_ORDER } from "./types";
import type { Action, Effect, GameState, Player, Result, SeatId } from "./types";

/** M2 placeholder until the role draft (M3) deals real character sheets. */
const PLACEHOLDER_STATS = { combat: 3, intellect: 3 } as const;
const STARTING_INTEGRITY = 6;

const sign = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

export function createGame(seed: number, seats: readonly SeatId[] = SEAT_ORDER): GameState {
  if (seats.length < 2) throw new Error("createGame: at least two seats are required");

  const players = Object.fromEntries(
    seats.map((seat) => [
      seat,
      {
        seat,
        node: ARRIVAL_NODE,
        integrity: STARTING_INTEGRITY,
        maxIntegrity: STARTING_INTEGRITY,
        fate: 0,
        stats: PLACEHOLDER_STATS,
        records: 0,
        clearance: 1,
        evidence: { accident: 0, intent: 0 },
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
    hunters: 0,
    encounter: null,
    lastTest: null,
    log: [`Round 1 — ${seats[0]} to act.`],
  };
}

/** Clearance level first, then the key tag, then the gate's Intellect test. */
function tryCrossGate(
  state: GameState,
  seat: SeatId,
  gate: ReturnType<typeof gatesAlong>[number],
): { readonly state: GameState; readonly passed: boolean; readonly notes: readonly string[] } {
  const player = playerAt(state.players, seat);
  const notes: string[] = [];

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
  notes.push(`clearance check at ${gate.id} — ${describeTest(result)}`);

  if (result.shift >= 0) {
    notes.push(`  the gate opens.`);
    return { state: rolled, passed: true, notes };
  }

  notes.push(`  the gate holds.`);
  // §C2.3: a failed gate is an *accident*, public noise that can never satisfy a
  // breach directive on its own.
  const marked = applyEffects(rolled, seat, [{ kind: "placeEvidence", evidence: "accident" }]);
  return { state: marked.state, passed: false, notes: [...notes, ...marked.notes] };
}

export function reduce(state: GameState, action: Action): Result<GameState> {
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

      const { state: rolled, result } = rollTest(next, seat, card.test.stat, card.test.difficulty, "anomaly");
      next = rolled;
      notes.push(`contain ${card.name.en} — ${describeTest(result)}`);

      const apply = (effects: readonly Effect[]): void => {
        if (effects.length === 0) return;
        const applied = applyEffects(next, seat, effects);
        next = applied.state;
        notes.push(`  ${applied.notes.join(", ")}`);
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
        notes.push(`${seat} is down at ${getNode(after.node).name.en}.`);
      }

      return ok({ ...next, phase: "action", encounter: null, log: [...next.log, ...notes] });
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
      const nextSeat = order[(index + 1) % order.length] as SeatId;
      const round = wrapped ? state.round + 1 : state.round;
      const nextPlayer = playerAt(state.players, nextSeat);

      return ok({
        ...state,
        seat: nextSeat,
        round,
        phase: "roll",
        roll: 0,
        encounter: null,
        lastTest: null,
        log: [
          ...state.log,
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

    default:
      return reject("unknown-action", "Unknown action.");
  }
}

export { sign as showSign };
