/**
 * Main Directives (§C4) — the hidden motive, and the only win condition.
 *
 * Twelve for the MVP: nine containment, three breach (§C4.6). After L15 the
 * directive is the **secondary** win condition: it wins when its own condition
 * holds at the ending, and a directive that names a `publicFootprint` also needs
 * that evidence. The board's centre and the alignment no longer decide.
 *
 * `attribution` is `original` for every line here: the directives are ours, even
 * where they borrow the fiction.
 */

import type { Alignment, Condition, EvidenceKind, MainDirectiveId } from "../engine/types";
import type { Localized } from "./board";
import type { ItemAttribution } from "./gear";

export type MainDirective = {
  readonly id: MainDirectiveId;
  readonly name: Localized;
  readonly text: Localized;
  readonly alignment: Alignment;
  readonly condition: Condition;
  /** Breach directives only: the intent evidence a valid victory requires (§C4.1). */
  readonly publicFootprint: readonly EvidenceKind[];
  readonly attribution: ItemAttribution;
};

const ours: ItemAttribution = { licence: "original" };

export const MAIN_DIRECTIVES: readonly MainDirective[] = [
  // ---- containment-aligned (9 of §C4.2's ten; m-quota and m-long-way held back, §C4.6) ----
  {
    id: "m-custodian",
    name: { en: "Protocol Custodian", es: "Custodio del Protocolo" },
    text: {
      en: "You completed the final protocol step before the site was lost.",
      es: "Completaste el paso final del protocolo antes de que se perdiera el sitio.",
    },
    alignment: "containment",
    condition: { kind: "completedFinalProtocolStep" },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-nobody-left",
    name: { en: "No One Left Behind", es: "Nadie se Queda Atrás" },
    text: {
      en: "Every living player is in the Command Center when the capsule leaves.",
      es: "Cada jugador vivo está en el Centro de Mando cuando parte la cápsula.",
    },
    alignment: "containment",
    condition: { kind: "allLivingAtCore" },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-chain",
    name: { en: "Chain of Custody", es: "Cadena de Custodia" },
    text: {
      en: "You carry the sample's trace when the site is lost.",
      es: "Llevas el rastro de la muestra cuando se pierde el sitio.",
    },
    alignment: "containment",
    condition: { kind: "hasEvidence", evidence: "tookSample" },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-merit",
    name: { en: "By Merit", es: "Por Mérito" },
    text: {
      en: "You contained three anomalies and never failed a gate test.",
      es: "Contuviste tres anomalías y nunca fallaste una prueba de puerta.",
    },
    alignment: "containment",
    condition: {
      kind: "all",
      of: [{ kind: "containments", atLeast: 3 }, { kind: "noGateFailures" }],
    },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-auditor",
    name: { en: "Auditor", es: "Auditor" },
    text: {
      en: "At least two other players carry intent evidence when the site is lost.",
      es: "Al menos otros dos jugadores llevan evidencia de intención cuando se pierde el sitio.",
    },
    alignment: "containment",
    condition: { kind: "othersWithIntentEvidence", atLeast: 2 },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-medic",
    name: { en: "Field Medic", es: "Médico de Campo" },
    text: {
      en: "You performed two rescues before the end.",
      es: "Realizaste dos rescates antes del final.",
    },
    alignment: "containment",
    condition: { kind: "rescues", atLeast: 2 },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-untouched",
    name: { en: "Untouched", es: "Intacto" },
    text: {
      en: "You end at full Integrity.",
      es: "Terminas con la Integridad completa.",
    },
    alignment: "containment",
    condition: { kind: "fullIntegrity" },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-keter",
    name: { en: "Keter Hunter", es: "Cazador de Keter" },
    text: {
      en: "You contained two Keter anomalies before the end.",
      es: "Contuviste dos anomalías Keter antes del final.",
    },
    alignment: "containment",
    condition: { kind: "containmentsByTier", tier: "keter", atLeast: 2 },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-clean",
    name: { en: "Clean Record", es: "Expediente Limpio" },
    text: {
      en: "You carry no accident evidence when the site is lost.",
      es: "No llevas ninguna evidencia de accidente cuando se pierde el sitio.",
    },
    alignment: "containment",
    condition: { kind: "not", of: { kind: "evidenceCount", evidenceClass: "accident", atLeast: 1 } },
    publicFootprint: [],
    attribution: ours,
  },

  // ---- breach-aligned (3 of §C4.3) ----
  {
    id: "b-saboteur",
    name: { en: "Saboteur", es: "Saboteador" },
    text: {
      en: "You tampered with the protocol at least once, and the site was lost.",
      es: "Saboteaste el protocolo al menos una vez y el sitio se perdió.",
    },
    alignment: "breach",
    condition: { kind: "terminalIs", terminal: "detonated" },
    publicFootprint: ["tamperedProtocol"],
    attribution: ours,
  },
  {
    id: "b-extraction",
    name: { en: "Extraction", es: "Extracción" },
    text: {
      en: "You extracted the sample, and the site was lost.",
      es: "Extrajiste la muestra y el sitio se perdió.",
    },
    alignment: "breach",
    condition: { kind: "hasEvidence", evidence: "tookSample" },
    publicFootprint: ["tookSample"],
    attribution: ours,
  },
  {
    id: "b-denial",
    name: { en: "Denial", es: "Negación" },
    text: {
      en: "You sealed two gates, and the site was lost.",
      es: "Sellaste dos puertas y el sitio se perdió.",
    },
    alignment: "breach",
    condition: { kind: "sealedGates", atLeast: 2 },
    publicFootprint: ["sealedGate"],
    attribution: ours,
  },
];

export const DIRECTIVE_BY_ID: ReadonlyMap<MainDirectiveId, MainDirective> = new Map(
  MAIN_DIRECTIVES.map((directive) => [directive.id, directive]),
);

export function directiveById(id: MainDirectiveId): MainDirective {
  const directive = DIRECTIVE_BY_ID.get(id);
  if (!directive) throw new Error(`unknown main directive: ${id}`);
  return directive;
}

export const CONTAINMENT_DIRECTIVES: readonly MainDirective[] = MAIN_DIRECTIVES.filter(
  (directive) => directive.alignment === "containment",
);

export const BREACH_DIRECTIVES: readonly MainDirective[] = MAIN_DIRECTIVES.filter(
  (directive) => directive.alignment === "breach",
);
