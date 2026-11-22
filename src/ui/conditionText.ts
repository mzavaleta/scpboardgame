/**
 * A3 — how a directive step reads on the private sheet.
 *
 * The win rule still evaluates the directive's `condition`; this module only turns
 * the same kinds into a legible line with a live count, so a player can see what
 * advances the motive instead of reverse-engineering a sentence.
 */

import { evalCondition } from "../engine/conditions";
import { playerAt, playersIn } from "../engine/types";
import type { Condition, GameState, SeatId } from "../engine/types";
import { t, type Lang } from "../i18n";

const TIER_KEY = { safe: "tierSafe", euclid: "tierEuclid", keter: "tierKeter" } as const;

export function stepText(
  state: GameState,
  seat: SeatId,
  condition: Condition,
  lang: Lang,
): { readonly text: string; readonly done: boolean } {
  const done = evalCondition(state, seat, condition);
  const player = playerAt(state.players, seat);
  const counters = player.counters;

  switch (condition.kind) {
    case "containments":
      return { text: t(lang, "stepContainments", { current: counters.containments, target: condition.atLeast }), done };
    case "containmentsByTier": {
      const current =
        condition.tier === "safe"
          ? counters.containmentsSafe
          : condition.tier === "euclid"
            ? counters.containmentsEuclid
            : counters.containmentsKeter;
      return {
        text: t(lang, "stepTierContainments", {
          tier: t(lang, TIER_KEY[condition.tier]),
          current,
          target: condition.atLeast,
        }),
        done,
      };
    }
    case "rescues":
      return { text: t(lang, "stepRescues", { current: counters.rescues, target: condition.atLeast }), done };
    case "sealedGates":
      return { text: t(lang, "stepSealedGates", { current: counters.sealedGates, target: condition.atLeast }), done };
    case "noGateFailures":
      return { text: t(lang, "stepNoGateFailures"), done };
    case "fullIntegrity":
      return { text: t(lang, "stepFullIntegrity"), done };
    case "completedFinalProtocolStep":
      return { text: t(lang, "stepFinalProtocol"), done };
    case "allLivingAtCore":
      return { text: t(lang, "stepAllAtCore"), done };
    case "hasEvidence":
      return {
        text: t(lang, "stepEvidence", {
          evidence: t(lang, condition.evidence === "tookSample" ? "evidenceSample" : "evidenceTampered"),
        }),
        done,
      };
    case "not":
      return { text: t(lang, "stepNoAccident"), done };
    case "othersWithIntentEvidence": {
      const current = playersIn(state.players).filter(
        (other) =>
          other.seat !== seat &&
          state.evidence.some((token) => token.sourceSeat === other.seat && token.class === "intent"),
      ).length;
      return { text: t(lang, "stepOthersIntent", { current, target: condition.atLeast }), done };
    }
    default:
      return { text: done ? "✓" : "○", done };
  }
}
