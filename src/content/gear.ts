/**
 * Gear (§C3.2, §C5.4, §C5.5).
 *
 * Two populations in one file because they share a shape:
 * - **role starting gear** — the five items §C3.2 grants at the draft;
 * - **the equipment deck** — ten items, three slots, two lifetimes.
 *
 * A `modifier` is a standing rule the engine reads (a bonus, a slot, a stain).
 * `effects` fire once, on acquisition or use. That split is what lets the vest be
 * a ceiling and the medkit be a verb.
 */

import type { Effect, EvidenceKind, ItemId, Stat } from "../engine/types";
import type { Localized } from "./board";

export type ItemAttribution = {
  readonly slug?: string;
  readonly author?: string;
  readonly translator?: string;
  readonly licence: "CC BY-SA 3.0" | "original";
};

export type ItemModifier =
  | { readonly kind: "statBonus"; readonly stat: Stat; readonly bonus: number }
  | { readonly kind: "testBonus"; readonly test: "anomaly" | "gate" | "protocol"; readonly bonus: number }
  | { readonly kind: "maxIntegrity"; readonly bonus: number }
  | { readonly kind: "healBonus"; readonly bonus: number }
  | { readonly kind: "rescueAdjacent" }
  | { readonly kind: "refuseFree" }
  | { readonly kind: "extraRecord"; readonly delta: number }
  | { readonly kind: "stain"; readonly evidence: EvidenceKind };

export type Item = {
  readonly id: ItemId;
  readonly name: Localized;
  readonly text: Localized;
  readonly lifetime: "permanent" | "consumed";
  /** Fires once, on acquisition (permanent) or use (consumed). */
  readonly effects: readonly Effect[];
  readonly modifiers: readonly ItemModifier[];
  readonly attribution: ItemAttribution;
};

const ours: ItemAttribution = { licence: "original" };

export const ROLE_GEAR: readonly Item[] = [
  {
    id: "sidearm",
    name: { en: "Sidearm", es: "Arma Reglamentaria" },
    text: { en: "+1 on Combat tests.", es: "+1 en pruebas de Combate." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "statBonus", stat: "combat", bonus: 1 }],
    attribution: ours,
  },
  {
    id: "clearance-badge",
    name: { en: "Clearance Badge", es: "Credencial de Acceso" },
    text: { en: "+1 on gate tests.", es: "+1 en pruebas de puerta." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "testBonus", test: "gate", bonus: 1 }],
    attribution: ours,
  },
  {
    id: "containment-kit",
    name: { en: "Containment Kit", es: "Kit de Contención" },
    text: { en: "+1 on anomaly tests.", es: "+1 en pruebas de anomalía." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "testBonus", test: "anomaly", bonus: 1 }],
    attribution: ours,
  },
  {
    id: "medkit-role",
    name: { en: "Medkit", es: "Botiquín" },
    text: { en: "Resting restores one more Integrity.", es: "Descansar recupera un punto más de Integridad." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "healBonus", bonus: 1 }],
    attribution: ours,
  },
  {
    id: "ethics-waiver",
    name: { en: "Ethics Waiver", es: "Exención de Ética" },
    text: { en: "Refuse one compel for free, then it is spent.", es: "Rechaza un apremio sin coste; luego se agota." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "refuseFree" }],
    attribution: ours,
  },
];

export const EQUIPMENT: readonly Item[] = [
  {
    id: "i-telekill",
    name: { en: "Telekill Alloy", es: "Aleación Antitelequinesia" },
    text: { en: "+1 on anomaly tests.", es: "+1 en pruebas de anomalía." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "testBonus", test: "anomaly", bonus: 1 }],
    attribution: { slug: "scp-148", author: "PENDING", licence: "CC BY-SA 3.0" },
  },
  {
    id: "i-vest",
    name: { en: "Reinforced Vest", es: "Chaleco Reforzado" },
    text: { en: "+1 maximum Integrity, and heal 1.", es: "+1 Integridad máxima y cura 1." },
    lifetime: "permanent",
    effects: [
      { kind: "modifyMaxIntegrity", delta: 1 },
      { kind: "modifyIntegrity", delta: 1 },
    ],
    modifiers: [],
    attribution: ours,
  },
  {
    id: "i-dosimeter",
    name: { en: "Dosimeter", es: "Dosímetro" },
    text: { en: "+1 on gate tests.", es: "+1 en pruebas de puerta." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "testBonus", test: "gate", bonus: 1 }],
    attribution: ours,
  },
  {
    id: "i-radio",
    name: { en: "Field Radio", es: "Radio de Campo" },
    text: { en: "You may rescue a downed ally on an adjacent space.", es: "Puedes rescatar a un aliado caído en un espacio adyacente." },
    lifetime: "permanent",
    effects: [],
    modifiers: [{ kind: "rescueAdjacent" }],
    attribution: ours,
  },
  {
    id: "i-idol",
    name: { en: "Anomalous Idol", es: "Ídolo Anómalo" },
    text: { en: "+1 Record per containment, but you always carry accident evidence.", es: "+1 Registro por contención, pero siempre llevas evidencia de accidente." },
    lifetime: "permanent",
    effects: [{ kind: "placeEvidence", evidence: "uncontained" }],
    modifiers: [
      { kind: "extraRecord", delta: 1 },
      { kind: "stain", evidence: "uncontained" },
    ],
    attribution: ours,
  },
  {
    id: "i-key",
    name: { en: "Skeleton Key", es: "Llave Maestra" },
    text: { en: "Cross one gate with no check.", es: "Cruza una puerta sin control." },
    lifetime: "consumed",
    effects: [{ kind: "addTag", tag: "key" }],
    modifiers: [],
    attribution: { slug: "scp-005", author: "PENDING", licence: "CC BY-SA 3.0" },
  },
  {
    id: "i-cola",
    name: { en: "Cola", es: "Refresco" },
    text: { en: "+2 movement this turn.", es: "+2 de movimiento este turno." },
    lifetime: "consumed",
    effects: [{ kind: "modifyRoll", delta: 2 }],
    modifiers: [],
    attribution: { slug: "scp-294", author: "PENDING", licence: "CC BY-SA 3.0" },
  },
  {
    id: "i-cap",
    name: { en: "Cap of Neglect", es: "Gorro de la Desatención" },
    text: { en: "Hunters ignore you this round.", es: "Los cazadores te ignoran este turno." },
    lifetime: "consumed",
    effects: [{ kind: "addTag", tag: "unseen" }],
    modifiers: [],
    attribution: { slug: "scp-268", author: "PENDING", licence: "CC BY-SA 3.0" },
  },
  {
    id: "i-medkit",
    name: { en: "Field Medkit", es: "Botiquín de Campaña" },
    text: { en: "Restore 2 Integrity.", es: "Recupera 2 de Integridad." },
    lifetime: "consumed",
    effects: [{ kind: "modifyIntegrity", delta: 2 }],
    modifiers: [],
    attribution: ours,
  },
  {
    id: "i-charge",
    name: { en: "Breaching Charge", es: "Carga de Ruptura" },
    text: { en: "Open the nearest sealed gate.", es: "Abre la puerta sellada más cercana." },
    lifetime: "consumed",
    effects: [{ kind: "lockGate", gateId: "nearest", rounds: 0 }],
    modifiers: [],
    attribution: ours,
  },
];

export const GEAR_BY_ID: ReadonlyMap<ItemId, Item> = new Map(
  [...ROLE_GEAR, ...EQUIPMENT].map((item) => [item.id, item]),
);

export function gearById(id: ItemId): Item {
  const item = GEAR_BY_ID.get(id);
  if (!item) throw new Error(`unknown item: ${id}`);
  return item;
}

export function modifiersOf(gear: readonly ItemId[]): readonly ItemModifier[] {
  return gear.flatMap((id) => gearById(id).modifiers);
}

/** The sum of every `statBonus`/`testBonus` that applies to a test. */
export function gearTestBonus(
  gear: readonly ItemId[],
  test: "anomaly" | "gate" | "protocol",
  stat: Stat,
): number {
  return modifiersOf(gear).reduce((sum, modifier) => {
    if (modifier.kind === "statBonus" && modifier.stat === stat) return sum + modifier.bonus;
    if (modifier.kind === "testBonus" && modifier.test === test) return sum + modifier.bonus;
    return sum;
  }, 0);
}

export function gearMaxIntegrity(gear: readonly ItemId[]): number {
  return modifiersOf(gear).reduce(
    (sum, modifier) => sum + (modifier.kind === "maxIntegrity" ? modifier.bonus : 0),
    0,
  );
}

export function gearHealBonus(gear: readonly ItemId[]): number {
  return modifiersOf(gear).reduce(
    (sum, modifier) => sum + (modifier.kind === "healBonus" ? modifier.bonus : 0),
    0,
  );
}

export function hasModifier(gear: readonly ItemId[], kind: ItemModifier["kind"]): boolean {
  return modifiersOf(gear).some((modifier) => modifier.kind === kind);
}

export function gearExtraRecords(gear: readonly ItemId[]): number {
  return modifiersOf(gear).reduce(
    (sum, modifier) => sum + (modifier.kind === "extraRecord" ? modifier.delta : 0),
    0,
  );
}
