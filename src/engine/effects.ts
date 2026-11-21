/**
 * The effect interpreter (§S4).
 *
 * Cards are data; this is the only code that changes the world on their behalf.
 * Two rules keep it honest:
 *
 * 1. **Every effect is a member of the closed union.** A card cannot invent one,
 *    because the type would not compile — the "canon must fit the mechanics"
 *    filter enforced by the compiler instead of by taste (§2.3).
 * 2. **A substitution is never silent.** Effects whose subsystem is not built yet
 *    still resolve into real state (a hunter is counted, a tag is stored) and
 *    write a note into the public log, so an inert mechanic is visible debt
 *    rather than an invisible lie (§14b).
 */

import { playerAt } from "./types";
import type { Effect, GameState, Player, SeatId } from "./types";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export type EffectsResult = {
  readonly state: GameState;
  readonly notes: readonly string[];
};

/** Apply a list of effects to `seat`, returning new state and the lines to log. */
export function applyEffects(
  state: GameState,
  seat: SeatId,
  effects: readonly Effect[],
): EffectsResult {
  let next = state;
  let player: Player = playerAt(state.players, seat);
  const notes: string[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "modifyIntegrity": {
        const integrity = clamp(player.integrity + effect.delta, 0, player.maxIntegrity);
        const downed = player.downed || integrity === 0;
        player = { ...player, integrity, downed };
        notes.push(`${sign(effect.delta)} Integrity`);
        break;
      }

      case "modifyMaxIntegrity": {
        const maxIntegrity = Math.max(1, player.maxIntegrity + effect.delta);
        const integrity = Math.min(player.integrity, maxIntegrity);
        player = { ...player, maxIntegrity, integrity, downed: integrity === 0 };
        notes.push(`${sign(effect.delta)} max Integrity`);
        break;
      }

      case "modifyRecords": {
        player = { ...player, records: Math.max(0, player.records + effect.delta) };
        notes.push(`${sign(effect.delta)} Record${Math.abs(effect.delta) === 1 ? "" : "s"}`);
        break;
      }

      case "setRecords": {
        player = { ...player, records: Math.max(0, effect.value) };
        notes.push(`Records set to ${Math.max(0, effect.value)}`);
        break;
      }

      case "grantFate": {
        player = { ...player, fate: Math.max(0, player.fate + effect.delta) };
        notes.push(`${sign(effect.delta)} Fate`);
        break;
      }

      case "raiseThreat": {
        // Compute once: deriving the note from `next.threat` *plus* the delta again
        // printed one more than the counter actually showed (caught in a playtest).
        const threat = Math.max(0, next.threat + effect.delta);
        next = { ...next, threat };
        notes.push(`Threat ${sign(effect.delta)} → ${threat}`);
        break;
      }

      case "setClearance": {
        player = { ...player, clearance: clamp(effect.level, 1, 4) };
        notes.push(`Clearance ${player.clearance}`);
        break;
      }

      case "addTag": {
        if (!player.tags.includes(effect.tag)) {
          player = { ...player, tags: [...player.tags, effect.tag] };
          notes.push(`gain tag "${effect.tag}"`);
        }
        break;
      }

      case "spawnHunter": {
        next = { ...next, hunters: next.hunters + effect.count };
        notes.push(
          `${effect.count} hunter${effect.count === 1 ? "" : "s"} spawned (inert — hunters move in M3)`,
        );
        break;
      }

      case "drawCard": {
        // The equipment deck is not built yet, so this is a recorded substitution.
        notes.push(
          `would draw ${effect.count} ${effect.deck} card${effect.count === 1 ? "" : "s"} (equipment deck lands in M4)`,
        );
        break;
      }

      case "removeGear": {
        notes.push(`would lose ${effect.count} gear (gear is not tracked yet — M3)`);
        break;
      }

      case "placeEvidence": {
        player = {
          ...player,
          evidence: { ...player.evidence, [effect.evidence]: player.evidence[effect.evidence] + 1 },
        };
        notes.push(`evidence: ${effect.evidence}`);
        break;
      }

      default: {
        // Exhaustiveness guard: a new Effect member without a case fails here.
        const never: never = effect;
        throw new Error(`unhandled effect ${JSON.stringify(never)}`);
      }
    }
  }

  return {
    state: { ...next, players: { ...next.players, [seat]: player } },
    notes,
  };
}

const sign = (delta: number): string => (delta >= 0 ? `+${delta}` : `${delta}`);
