/**
 * Public character objectives (L14, A3).
 *
 * Every role has exactly one, fixed by the character — not dealt at random — and
 * it is **public**: the table can see what each person is here to do. That is the
 * opposite of the Main Directive, which is hidden.
 *
 * The trade: complete it during play and take a real reward; be caught with it
 * undone when the warhead arms and take a mild penalty. It is the character's
 * reason to be in the building, and the second source of visible intent.
 */

import type { Condition, Effect, RoleId } from "../engine/types";
import type { Localized } from "./board";
import type { ItemAttribution } from "./gear";

export type RoleObjective = {
  readonly roleId: RoleId;
  readonly text: Localized;
  readonly condition: Condition;
  readonly reward: readonly Effect[];
  readonly penalty: readonly Effect[];
  readonly attribution: ItemAttribution;
};

const ours: ItemAttribution = { licence: "original" };
const records = (delta: number): Effect => ({ kind: "modifyRecords", delta });
const integrity = (delta: number): Effect => ({ kind: "modifyIntegrity", delta });

export const OBJECTIVES: readonly RoleObjective[] = [
  {
    roleId: "mtf-field-agent",
    text: { en: "Clear the corridor: contain two anomalies.", es: "Despeja el corredor: contiene dos anomalías." },
    condition: { kind: "containments", atLeast: 2 },
    reward: [records(2)],
    penalty: [integrity(-1)],
    attribution: ours,
  },
  {
    roleId: "senior-researcher",
    text: { en: "Bring back data: contain a Keter anomaly.", es: "Trae datos: contiene una anomalía Keter." },
    condition: { kind: "containmentsByTier", tier: "keter", atLeast: 1 },
    reward: [records(3)],
    penalty: [integrity(-1)],
    attribution: ours,
  },
  {
    roleId: "d-class",
    text: { en: "Get out alive: reach the inner ring.", es: "Sal vivo: llega al anillo interior." },
    condition: { kind: "inRing", ring: "inner" },
    reward: [records(2)],
    penalty: [integrity(-1)],
    attribution: ours,
  },
  {
    roleId: "containment-specialist",
    text: { en: "Hold the line: contain two Euclid or harder anomalies.", es: "Aguanta: contiene dos anomalías Euclides o peores." },
    condition: { kind: "containmentsByTier", tier: "euclid", atLeast: 2 },
    reward: [records(3)],
    penalty: [integrity(-1)],
    attribution: ours,
  },
  {
    roleId: "medical-officer",
    text: { en: "Keep them breathing: perform a rescue.", es: "Mantenlos respirando: realiza un rescate." },
    condition: { kind: "rescues", atLeast: 1 },
    reward: [records(2)],
    penalty: [integrity(-1)],
    attribution: ours,
  },
  {
    roleId: "ethics-aide",
    text: {
      en: "Audit the room: another player leaves intent evidence.",
      es: "Audita la sala: otro jugador deja evidencia de intención.",
    },
    condition: { kind: "othersWithIntentEvidence", atLeast: 1 },
    reward: [records(2)],
    penalty: [integrity(-1)],
    attribution: ours,
  },
];

export const OBJECTIVE_BY_ROLE: ReadonlyMap<RoleId, RoleObjective> = new Map(
  OBJECTIVES.map((objective) => [objective.roleId, objective]),
);

export function objectiveFor(roleId: RoleId): RoleObjective {
  const objective = OBJECTIVE_BY_ROLE.get(roleId);
  if (!objective) throw new Error(`no objective for role ${roleId}`);
  return objective;
}
