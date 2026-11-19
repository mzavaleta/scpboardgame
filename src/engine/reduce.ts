/**
 * The reducer: `(state, action) -> Result<state>`.
 *
 * Pure. No DOM, no I/O, no clock, no `Math.random()`. Movement follows the
 * owner's Talisman ruling (§D5): the die gives the distance, the player gives
 * the destination, and the move is a single irreversible decision.
 *
 * Card resolution (`space`) and the action phase arrive in M2; the phase values
 * already reserve their slots so the shape does not change.
 */

import { ARRIVAL_NODE } from "../content/board";
import { gateBetween, getNode } from "./board";
import { canLandOn } from "./movement";
import { rollD6 } from "./rng";
import { ok, reject, SEAT_ORDER } from "./types";
import type { Action, GameState, Player, Result, SeatId } from "./types";

export function createGame(seed: number, seats: readonly SeatId[] = SEAT_ORDER): GameState {
  if (seats.length < 2) throw new Error("createGame: at least two seats are required");

  const players = Object.fromEntries(
    seats.map((seat) => [
      seat,
      { seat, node: ARRIVAL_NODE, integrity: 6, fate: 0 } satisfies Player,
    ]),
  ) as Record<SeatId, Player>;

  return {
    rng: { seed: seed >>> 0, cursor: 0 },
    round: 1,
    seat: seats[0] as SeatId,
    phase: "roll",
    roll: 0,
    players,
    log: [`Round 1 — ${seats[0]} to act.`],
  };
}

export function reduce(state: GameState, action: Action): Result<GameState> {
  switch (action.type) {
    case "rollMovement": {
      if (state.phase !== "roll") {
        return reject("wrong-phase", `Cannot roll during the ${state.phase} phase.`);
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

      const player = state.players[state.seat];
      if (!canLandOn(player.node, action.node, state.roll)) {
        return reject("unreachable", `You cannot land on that space with a roll of ${state.roll}.`);
      }

      let destination;
      try {
        destination = getNode(action.node);
      } catch {
        return reject("unknown-node", "That space does not exist.");
      }

      const gate = gateBetween(player.node, action.node);
      const notes = [`${state.seat} moved to ${destination.name.en}.`];
      if (gate) {
        // M1 does not enforce clearance yet (M3); the crossing is logged so the
        // missing check stays visible in playtests instead of silently absent.
        notes.push(`  crossed ${gate.id} without a clearance check (not implemented yet).`);
      }
      // M2 fills this in: the landing space resolves its card or facility here.
      notes.push(`  ${destination.name.en} has no encounter yet (M2).`);

      return ok({
        ...state,
        phase: "action",
        players: {
          ...state.players,
          [state.seat]: { ...player, node: action.node },
        },
        log: [...state.log, ...notes],
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

    case "endTurn": {
      if (state.phase !== "action") {
        return reject("wrong-phase", `Cannot end the turn during the ${state.phase} phase.`);
      }

      const order = SEAT_ORDER.filter((seat) => seat in state.players);
      const index = order.indexOf(state.seat);
      const wrapped = index === order.length - 1;
      const nextSeat = order[(index + 1) % order.length] as SeatId;
      const round = wrapped ? state.round + 1 : state.round;

      return ok({
        ...state,
        seat: nextSeat,
        round,
        phase: "roll",
        roll: 0,
        log: [...state.log, `— ${nextSeat} to act (round ${round}).`],
      });
    }

    default:
      return reject("unknown-action", "Unknown action.");
  }
}
