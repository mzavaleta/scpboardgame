/**
 * The escalation deck (§C5).
 *
 * Fourteen cards serve two masters, and `target` is why: a **facility** card
 * makes the board worse for everyone (an alarm landing), a **drawer** card makes
 * one person pay (a Stall Hazard, D16). The punishment is the deck itself, never
 * a bespoke fine — which is what keeps D16 honest.
 */

import type { Effect, EvidenceKind } from "../engine/types";
import type { Localized } from "./board";
import type { ItemAttribution } from "./gear";

export type EscalationCard = {
  readonly id: string;
  readonly name: Localized;
  readonly text: Localized;
  readonly target: "facility" | "drawer";
  readonly effects: readonly Effect[];
  /**
   * For the validator: which evidence a card may place. Empty for most; declared
   * so check 7 (footprint satisfiability) can see the whole ledger.
   */
  readonly placesEvidence: readonly EvidenceKind[];
  readonly attribution: ItemAttribution;
};

const ours: ItemAttribution = { licence: "original" };

export const ESCALATION: readonly EscalationCard[] = [
  {
    id: "e-containment-failure",
    name: { en: "Containment Failure", es: "Fallo de Contención" },
    text: { en: "A cell gives way. The threat track rises.", es: "Una celda cede. La amenaza sube." },
    target: "facility",
    effects: [{ kind: "raiseThreat", delta: 1 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "e-alarm-cascade",
    name: { en: "Alarm Cascade", es: "Cascada de Alarmas" },
    text: { en: "Every siren at once, and something answers.", es: "Todas las sirenas a la vez, y algo responde." },
    target: "facility",
    effects: [{ kind: "raiseThreat", delta: 1 }, { kind: "spawnHunter", count: 1 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "e-lockdown",
    name: { en: "Lockdown", es: "Confinamiento" },
    text: { en: "The nearest gate seals for two rounds.", es: "La puerta más cercana se sella durante dos rondas." },
    target: "facility",
    effects: [{ kind: "lockGate", gateId: "nearest", rounds: 2 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "e-power-surge",
    name: { en: "Power Surge", es: "Pico de Tensión" },
    text: { en: "Everyone on a marked space takes 1 damage.", es: "Todos en un espacio marcado reciben 1 de daño." },
    target: "facility",
    effects: [{ kind: "hitMarkedNodes", delta: -1 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "e-hunter-release",
    name: { en: "Hunter Release", es: "Liberación de Cazadores" },
    text: { en: "Something is loose in the inner ring.", es: "Algo anda suelto en el anillo interior." },
    target: "facility",
    effects: [{ kind: "spawnHunterAtRing", ring: "inner", count: 1 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "e-assembly-1",
    name: { en: "Emergency Assembly", es: "Asamblea de Emergencia" },
    text: { en: "The table votes: seal the bulkhead, or hold it open.", es: "La mesa vota: sellar el mamparo o mantenerlo abierto." },
    target: "facility",
    effects: [{ kind: "openVote" }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "e-assembly-2",
    name: { en: "Emergency Assembly", es: "Asamblea de Emergencia" },
    text: { en: "The table votes: seal the bulkhead, or hold it open.", es: "La mesa vota: sellar el mamparo o mantenerlo abierto." },
    target: "facility",
    effects: [{ kind: "openVote" }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "h-collapse",
    name: { en: "Structural Collapse", es: "Colapso Estructural" },
    text: { en: "The ceiling comes down on you.", es: "El techo se te viene encima." },
    target: "drawer",
    effects: [{ kind: "modifyIntegrity", delta: -2 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "h-gas",
    name: { en: "Gas Leak", es: "Fuga de Gas" },
    text: { en: "You choke and stumble toward the nearest danger.", es: "Te ahogas y tropiezas hacia el peligro más cercano." },
    target: "drawer",
    effects: [{ kind: "modifyIntegrity", delta: -1 }, { kind: "forceMove", toward: "anomalyNode" }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "h-requisition",
    name: { en: "Requisition Denied", es: "Requisa Denegada" },
    text: { en: "Your request is refused and your kit is seized.", es: "Tu solicitud es rechazada y confiscan tu equipo." },
    target: "drawer",
    effects: [{ kind: "removeGear", count: 1 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "h-blackout",
    name: { en: "Comm Blackout", es: "Apagón de Comunicaciones" },
    text: { en: "Nobody can hear you. Lose 1 Fate.", es: "Nadie puede oírte. Pierdes 1 de Destino." },
    target: "drawer",
    effects: [{ kind: "grantFate", delta: -1 }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "h-exposure",
    name: { en: "Exposure", es: "Exposición" },
    text: { en: "You are exposed, and the site notices.", es: "Quedas expuesto y el sitio lo nota." },
    target: "drawer",
    effects: [{ kind: "raiseThreat", delta: 1 }, { kind: "placeEvidence", evidence: "breachAlarm" }],
    placesEvidence: ["breachAlarm"],
    attribution: ours,
  },
  {
    id: "h-panic",
    name: { en: "Panic", es: "Pánico" },
    text: { en: "You freeze where you stand.", es: "Te quedas paralizado donde estás." },
    target: "drawer",
    effects: [{ kind: "addTag", tag: "bound" }],
    placesEvidence: [],
    attribution: ours,
  },
  {
    id: "h-duty",
    name: { en: "Containment Duty", es: "Deber de Contención" },
    text: { en: "The nearest anomaly finds you.", es: "La anomalía más cercana te encuentra." },
    target: "drawer",
    effects: [{ kind: "drawCard", deck: "anomaly", count: 1 }],
    placesEvidence: [],
    attribution: ours,
  },
];

export const ESCALATION_BY_ID: ReadonlyMap<string, EscalationCard> = new Map(
  ESCALATION.map((card) => [card.id, card]),
);

export function escalationById(id: string): EscalationCard {
  const card = ESCALATION_BY_ID.get(id);
  if (!card) throw new Error(`unknown escalation card: ${id}`);
  return card;
}
