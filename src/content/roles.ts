/**
 * Roles, aspects and their coded compels (§C3).
 *
 * A role is `{ combat, intellect, maxIntegrity, startingGear, aspect }` and
 * nothing else. An aspect is a **public weakness**: three compels the table can
 * invoke, each with an engine-checked condition and a closed-set effect. That is
 * the whole trade the design made for a digital FATE — no free prose, so no GM,
 * so the simulator can balance it.
 */

import type { AspectId, Condition, Effect, RoleId, Stats } from "../engine/types";
import type { Localized } from "./board";
import type { ItemAttribution } from "./gear";

export type Role = {
  readonly id: RoleId;
  readonly name: Localized;
  readonly stats: Stats;
  readonly maxIntegrity: number;
  readonly startingGear: readonly string[];
  readonly aspectId: AspectId;
  readonly attribution: ItemAttribution;
};

export type Compel = {
  readonly text: Localized;
  readonly condition: Condition;
  /** Applied to the **target** on accept. */
  readonly effect: readonly Effect[];
};

export type Aspect = {
  readonly id: AspectId;
  readonly name: Localized;
  readonly compels: readonly Compel[];
  readonly attribution: ItemAttribution;
};

const ours: ItemAttribution = { licence: "original" };

/** §C3.2. The balance band (`combat + intellect ∈ {5,6}`) is a test and a validator check. */
export const ROLES: readonly Role[] = [
  {
    id: "mtf-field-agent",
    name: { en: "MTF Field Agent", es: "Agente de la FTM" },
    stats: { combat: 4, intellect: 2 },
    maxIntegrity: 7,
    startingGear: ["sidearm"],
    aspectId: "reckless",
    attribution: ours,
  },
  {
    id: "senior-researcher",
    name: { en: "Senior Researcher", es: "Investigador Sénior" },
    stats: { combat: 2, intellect: 4 },
    maxIntegrity: 5,
    startingGear: ["clearance-badge"],
    aspectId: "curious",
    attribution: ours,
  },
  {
    id: "d-class",
    name: { en: "D-Class Personnel", es: "Personal de Clase D" },
    stats: { combat: 3, intellect: 2 },
    maxIntegrity: 6,
    startingGear: [],
    aspectId: "nothing-to-lose",
    attribution: ours,
  },
  {
    id: "containment-specialist",
    name: { en: "Containment Specialist", es: "Especialista en Contención" },
    stats: { combat: 2, intellect: 4 },
    maxIntegrity: 7,
    startingGear: ["containment-kit"],
    aspectId: "methodical",
    attribution: ours,
  },
  {
    id: "medical-officer",
    name: { en: "Medical Officer", es: "Oficial Médico" },
    stats: { combat: 2, intellect: 3 },
    maxIntegrity: 6,
    startingGear: ["medkit-role"],
    aspectId: "sworn-to-heal",
    attribution: ours,
  },
  {
    id: "ethics-aide",
    name: { en: "Ethics Aide", es: "Auxiliar del Comité de Ética" },
    stats: { combat: 2, intellect: 4 },
    maxIntegrity: 5,
    startingGear: ["ethics-waiver"],
    aspectId: "by-the-book",
    attribution: ours,
  },
];

export const ASPECTS: readonly Aspect[] = [
  {
    id: "reckless",
    name: { en: "Reckless", es: "Temerario" },
    attribution: ours,
    compels: [
      {
        text: { en: "There is a fight here, and you cannot walk past it.", es: "Hay una pelea aquí y no puedes ignorarla." },
        condition: { kind: "any", of: [{ kind: "hunterWithin", steps: 2 }, { kind: "threatAtLeast", n: 3 }] },
        effect: [{ kind: "forceMove", toward: "hunter" }],
      },
      {
        text: { en: "You take the hard way.", es: "Eliges el camino difícil." },
        condition: { kind: "inEncounter" },
        effect: [{ kind: "addTag", tag: "hardTest" }],
      },
      {
        text: { en: "You go first.", es: "Vas primero." },
        condition: { kind: "hunterSharesRing" },
        effect: [
          { kind: "modifyIntegrity", delta: -1 },
          { kind: "grantFate", delta: 1 },
        ],
      },
    ],
  },
  {
    id: "curious",
    name: { en: "Curious", es: "Curioso" },
    attribution: ours,
    compels: [
      {
        text: { en: "You cannot leave a sealed file unopened.", es: "No puedes dejar un expediente cerrado sin abrir." },
        condition: { kind: "declinedThisTurn" },
        effect: [{ kind: "drawCard", deck: "anomaly", count: 1 }],
      },
      {
        text: { en: "You have to write it down.", es: "Tienes que anotarlo." },
        condition: { kind: "containedThisTurn" },
        effect: [{ kind: "addTag", tag: "distracted" }],
      },
      {
        text: { en: "You publish, immediately.", es: "Publicas, de inmediato." },
        condition: { kind: "recordsAtLeast", n: 2 },
        effect: [
          { kind: "modifyRecords", delta: 1 },
          { kind: "raiseThreat", delta: 1 },
        ],
      },
    ],
  },
  {
    id: "nothing-to-lose",
    name: { en: "Nothing to Lose", es: "Nada que Perder" },
    attribution: ours,
    compels: [
      {
        text: { en: "You are the one who goes in first.", es: "Tú eres quien entra primero." },
        condition: { kind: "allyWounded" },
        effect: [{ kind: "forceMove", toward: "woundedAlly" }],
      },
      {
        text: { en: "Nothing here is yours anyway.", es: "De todos modos, nada de aquí es tuyo." },
        condition: { kind: "holdsGear" },
        effect: [{ kind: "removeGear", count: 1 }],
      },
      {
        text: { en: "Somebody has to be blamed.", es: "Alguien tiene que cargar con la culpa." },
        condition: { kind: "threatAtLeast", n: 3 },
        effect: [
          { kind: "modifyRecords", delta: -1 },
          { kind: "raiseThreat", delta: 1 },
        ],
      },
    ],
  },
  {
    id: "methodical",
    name: { en: "Methodical", es: "Metódico" },
    attribution: ours,
    compels: [
      {
        text: { en: "Finish the procedure before you move.", es: "Termina el procedimiento antes de moverte." },
        condition: { kind: "startedContainmentThisTurn" },
        effect: [{ kind: "addTag", tag: "noMove" }],
      },
      {
        text: { en: "Check it twice.", es: "Compruébalo dos veces." },
        condition: { kind: "atMarkedNode" },
        effect: [{ kind: "drawCard", deck: "escalation", count: 1 }],
      },
      {
        text: { en: "Sign the form.", es: "Firma el formulario." },
        condition: { kind: "atCheckpoint" },
        effect: [{ kind: "placeEvidence", evidence: "tookSample" }],
      },
    ],
  },
  {
    id: "sworn-to-heal",
    name: { en: "Sworn to Heal", es: "Juramento de Sanar" },
    attribution: ours,
    compels: [
      {
        text: { en: "Someone is bleeding.", es: "Alguien está sangrando." },
        condition: { kind: "allyWounded" },
        effect: [{ kind: "forceMove", toward: "woundedAlly" }],
      },
      {
        text: { en: "You cannot leave them.", es: "No puedes dejarlo atrás." },
        condition: { kind: "allyDownedOnNode" },
        effect: [{ kind: "addTag", tag: "bound" }],
      },
      {
        text: { en: "You take their pain.", es: "Cargas con su dolor." },
        condition: { kind: "adjacentAllyWounded" },
        effect: [{ kind: "modifyIntegrity", delta: -2 }],
      },
    ],
  },
  {
    id: "by-the-book",
    name: { en: "By the Book", es: "Según el Reglamento" },
    attribution: ours,
    compels: [
      {
        text: { en: "Report it.", es: "Denúncialo." },
        condition: { kind: "anyoneHoldsIntent" },
        effect: [{ kind: "placeEvidence", evidence: "tamperedProtocol" }],
      },
      {
        text: { en: "You cannot take that.", es: "No puedes llevarte eso." },
        condition: { kind: "gainedGearThisTurn" },
        effect: [{ kind: "removeGear", count: 1 }],
      },
      {
        text: { en: "Read them their rights.", es: "Léeles sus derechos." },
        condition: { kind: "activeSeat" },
        effect: [{ kind: "addTag", tag: "held" }],
      },
    ],
  },
];

export const ROLE_BY_ID: ReadonlyMap<RoleId, Role> = new Map(ROLES.map((role) => [role.id, role]));

export const ASPECT_BY_ID: ReadonlyMap<AspectId, Aspect> = new Map(
  ASPECTS.map((aspect) => [aspect.id, aspect]),
);

export function roleById(id: RoleId): Role {
  const role = ROLE_BY_ID.get(id);
  if (!role) throw new Error(`unknown role: ${id}`);
  return role;
}

export function aspectById(id: AspectId): Aspect {
  const aspect = ASPECT_BY_ID.get(id);
  if (!aspect) throw new Error(`unknown aspect: ${id}`);
  return aspect;
}
