/**
 * Projection (§S5, §S7.3): what one viewer is allowed to receive.
 *
 * The table screen never renders a hidden value. Private UI is a separate
 * subtree fed by this function, so a UI bug can leak layout but never content
 * from a component that was never given it.
 */

import type { GameState, Player, SeatId } from "./types";

export type PlayerView = Omit<Player, "mainDirectiveId" | "previousDirectiveId"> & {
  /** Own only. Another seat's motive is `null`, not a string the UI could print. */
  readonly mainDirectiveId: string | null;
  readonly previousDirectiveId: string | null;
  readonly hidden: boolean;
};

export type GameView = Omit<GameState, "players"> & {
  readonly players: Readonly<Partial<Record<SeatId, PlayerView>>>;
};

export function project(state: GameState, viewer: SeatId): GameView {
  const players = Object.fromEntries(
    Object.entries(state.players).map(([seat, player]) => {
      if (!player) return [seat, player];
      const own = seat === viewer;
      return [
        seat,
        {
          ...player,
          mainDirectiveId: own ? player.mainDirectiveId : null,
          previousDirectiveId: own ? player.previousDirectiveId : null,
          hidden: !own,
        } satisfies PlayerView,
      ];
    }),
  );

  return { ...state, players };
}
