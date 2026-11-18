/**
 * The reducer: `(state, action) -> Result<state>`.
 *
 * Pure. No DOM, no I/O, no clock, no `Math.random()`. The M0 slice implements
 * only movement rolling and turn handover — enough to prove the determinism
 * guarantee end to end before any rules exist.
 *
 * Later phases (move, space, action) are declared in `Phase` already so the
 * shape does not change when they arrive; they simply reject for now.
 */

import { rollD6 } from "./rng";
import { reject, ok, SEAT_ORDER } from "./types";
import type { Action, GameState, Player, Result, SeatId } from "./types";

export function createGame(seed: number, seats: readonly SeatId[] = SEAT_ORDER): GameState {
  if (seats.length < 2) throw new Error("createGame: at least two seats are required");

  const players = Object.fromEntries(
    seats.map((seat) => [
      seat,
      { seat, node: "outer-02", integrity: 6, fate: 0 } satisfies Player,
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

    case "endTurn": {
      if (state.phase !== "move") {
        return reject("wrong-phase", `Cannot end the turn during the ${state.phase} phase.`);
      }

      const order = SEAT_ORDER.filter((seat) => seat in state.players);
      const index = order.indexOf(state.seat);
      const wrapped = index === order.length - 1;
      const nextSeat = order[(index + 1) % order.length] as SeatId;
      const round = wrapped ? state.round + 1 : state.round;

      return ok({
        ...state,
        rng: state.rng,
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
