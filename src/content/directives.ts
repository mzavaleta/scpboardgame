/**
 * Main Directives (§C4) — the hidden motive, and the only win condition.
 *
 * Twelve for the MVP: nine containment, three breach (§C4.6). A containment
 * directive wins when the site is recontained and its condition holds. A breach
 * directive wins when the site is lost **and** the seat left its own public
 * footprint — D18's "hidden motive, visible evidence", enforced by the reducer.
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
      en: "The site is recontained, and you completed the final protocol step.",
      es: "El sitio es recontendido y tú completaste el paso final del protocolo.",
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
      en: "The site is recontained, and every living player is in the Command Center.",
      es: "El sitio es recontendido y cada jugador vivo está en el Centro de Mando.",
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
      en: "The site is recontained, and you carry the sample's trace.",
      es: "El sitio es recontendido y llevas el rastro de la muestra.",
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
      en: "The site is recontained, you hold Clearance 4, and you never failed a gate test.",
      es: "El sitio es recontendido, tienes Acceso 4 y nunca fallaste una prueba de puerta.",
    },
    alignment: "containment",
    condition: {
      kind: "all",
      of: [{ kind: "clearanceAtLeast", n: 4 }, { kind: "noGateFailures" }],
    },
    publicFootprint: [],
    attribution: ours,
  },
  {
    id: "m-auditor",
    name: { en: "Auditor", es: "Auditor" },
    text: {
      en: "The site is recontained, and at least two other players carry intent evidence.",
      es: "El sitio es recontendido y al menos otros dos jugadores llevan evidencia de intención.",
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
      en: "The site is recontained, and you performed two rescues.",
      es: "El sitio es recontendido y realizaste dos rescates.",
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
      en: "The site is recontained, and you end at full Integrity.",
      es: "El sitio es recontendido y terminas con la Integridad completa.",
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
      en: "The site is recontained, and you contained two Keter anomalies.",
      es: "El sitio es recontendido y contuviste dos anomalías Keter.",
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
      en: "The site is recontained, and you carry no accident evidence.",
      es: "El sitio es recontendido y no llevas ninguna evidencia de accidente.",
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
      en: "The warhead detonates, and you tampered with the protocol at least once.",
      es: "La ojiva detona y sabotearon el protocolo al menos una vez.",
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
      en: "The warhead detonates, and you extracted the sample.",
      es: "La ojiva detona y tú extrajiste la muestra.",
    },
    alignment: "breach",
    condition: { kind: "all", of: [{ kind: "terminalIs", terminal: "detonated" }, { kind: "hasEvidence", evidence: "tookSample" }] },
    publicFootprint: ["tookSample"],
    attribution: ours,
  },
  {
    id: "b-denial",
    name: { en: "Denial", es: "Negación" },
    text: {
      en: "The warhead detonates, and you sealed two gates.",
      es: "La ojiva detona y tú sellaste dos puertas.",
    },
    alignment: "breach",
    condition: { kind: "all", of: [{ kind: "terminalIs", terminal: "detonated" }, { kind: "sealedGates", atLeast: 2 }] },
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
