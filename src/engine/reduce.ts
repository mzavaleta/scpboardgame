/**
 * The reducer: `(state, action) -> Result<state>`.
 *
 * Pure. No DOM, no I/O, no clock, no `Math.random()`. The M1 slice implements
 * movement: roll `1d6`, then walk one edge at a time, then hand over. Card
 * resolution (`space`) and the action phase arrive in M2, and the declared
 * `Phase` values already reserve their slots so the shape does not change.
 */

import { ARRIVAL_NODE } from "../content/board";
import { gateBetween, getNode, neighborsOf } from "./board";
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
    moveRemaining: 0,
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
        moveRemaining: roll,
        log: [...state.log, `${state.seat} rolled ${roll}.`],
      });
    }

    case "moveTo": {
      if (state.phase !== "move") {
        return reject("wrong-phase", `Cannot move during the ${state.phase} phase.`);
      }
      if (state.moveRemaining <= 0) {
        return reject("no-moves-left", "No movement remaining this turn.");
      }

      const player = state.players[state.seat];
      if (!neighborsOf(player.node).includes(action.node)) {
        return reject("not-adjacent", "That space is not adjacent.");
      }

      let destination;
      try {
        destination = getNode(action.node);
      } catch {
        return reject("unknown-node", "That space does not exist.");
      }

      const gate = gateBetween(player.node, action.node);
      const moveRemaining = state.moveRemaining - 1;
      const arrived = moveRemaining === 0;

      const notes = [`${state.seat} moved to ${destination.name.en}.`];
      if (gate) {
        // M1 does not enforce clearance yet (M3); the crossing is logged so the
        // missing check is visible in every playtest rather than silently absent.
        notes.push(`  crossed ${gate.id} without a clearance check (not implemented yet).`);
      }

      return ok({
        ...state,
        rng: state.rng,
        phase: arrived ? "action" : "move",
        moveRemaining,
        players: {
          ...state.players,
          [state.seat]: { ...player, node: action.node },
        },
        log: [...state.log, ...notes],
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
        moveRemaining: 0,
        log: [...state.log, `— ${nextSeat} to act (round ${round}).`],
      });
    }

    default:
      return reject("unknown-action", "Unknown action.");
  }
}
