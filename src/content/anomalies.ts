/**
 * The anomaly deck: 20 cards (§C2).
 *
 * Pure content. Cards declare a difficulty and four outcome payloads and nothing
 * else — the §5 tier table does the work, so a new anomaly can never invent an
 * outcome ladder (§C2.1).
 *
 * **Attribution debt (§C2.6).** Every card carries its wiki slug and licence, but
 * `author` is `PENDING` until the §3.1 pass. The validator that refuses to ship a
 * card without attribution is a release gate, not a dev gate: the debt is visible
 * here instead of hidden in a spreadsheet.
 */

import { deckCopies } from "../config/tuning";
import type { DeckId, Effect, Stat } from "../engine/types";
import type { Localized } from "./board";

export type Attribution = {
  readonly slug: string;
  readonly licence: "CC BY-SA 3.0";
  readonly author: string;
};

export type AnomalyCard = {
  readonly id: string;
  readonly name: Localized;
  readonly text: Localized;
  readonly tier: DeckId;
  readonly test: { readonly stat: Stat; readonly difficulty: number };
  readonly reward: { readonly records: number };
  /**
   * How likely this entry is, as a weight, projected from the deck composition
   * in `src/config/tuning.json` (D27). A physical deck expresses this as
   * *copies*; a digital one has no reason to — but the number a designer edits
   * is still "how many of this card exist".
   */
  readonly rarity: number;
  /** shift == 0 — contained, but the site takes something. */
  readonly collateral: readonly Effect[];
  /** shift -1..-2 — no containment, and it costs. */
  readonly failure: readonly Effect[];
  /** shift <= -3 — contained? no. It gets out. */
  readonly breach: readonly Effect[];
  readonly mayLeave: true;
  readonly declineCost: readonly Effect[];
  readonly attribution: Attribution;
};

// Shorthands: the deck is 20 rows of data, not 20 paragraphs of code.
const integrity = (delta: number): Effect => ({ kind: "modifyIntegrity", delta });
const records = (delta: number): Effect => ({ kind: "modifyRecords", delta });
const setRecords = (value: number): Effect => ({ kind: "setRecords", value });
const fate = (delta: number): Effect => ({ kind: "grantFate", delta });
const threat = (delta: number): Effect => ({ kind: "raiseThreat", delta });
const hunter = (count = 1): Effect => ({ kind: "spawnHunter", count });
const tag = (name: string): Effect => ({ kind: "addTag", tag: name });
const equipment = (count: number): Effect => ({ kind: "drawCard", deck: "equipment", count });
const loseGear = (count: number): Effect => ({ kind: "removeGear", count });

const card = (
  number: number,
  tier: DeckId,
  name: Localized,
  text: Localized,
  stat: Stat,
  difficulty: number,
  payloads: Pick<AnomalyCard, "collateral" | "failure" | "breach">,
): AnomalyCard => ({
  id: `scp-${String(number).padStart(3, "0")}`,
  name,
  text,
  tier,
  test: { stat, difficulty },
  reward: { records: tier === "safe" ? 1 : tier === "euclid" ? 2 : 3 },
  rarity: deckCopies(tier, `scp-${String(number).padStart(3, "0")}`),
  mayLeave: true,
  // Declining a real anomaly raises pressure; walking past a Safe one is free.
  // §C2.1 leaves `declineCost` to tuning, so this is a PROPOSED value (§14f).
  declineCost: tier === "safe" ? [] : [threat(1)],
  attribution: {
    slug: `scp-${String(number).padStart(3, "0")}`,
    licence: "CC BY-SA 3.0",
    author: "PENDING",
  },
  ...payloads,
});

export const ANOMALIES: readonly AnomalyCard[] = [
  card(
    5,
    "safe",
    { en: "Skeleton Key", es: "La Llave Maestra" },
    {
      en: "A key that opens any one lock in the facility — once.",
      es: "Una llave que abre cualquier cerradura de la instalación — una vez.",
    },
    "intellect",
    1,
    { collateral: [tag("key")], failure: [], breach: [threat(1)] },
  ),
  card(
    131,
    "safe",
    { en: "The Eye Pods", es: "Los Ojos" },
    {
      en: "Two friendly eyes that see what you cannot and follow you home.",
      es: "Dos ojos amistosos que ven lo que tú no ves y te siguen a casa.",
    },
    "combat",
    0,
    { collateral: [fate(1)], failure: [hunter()], breach: [hunter()] },
  ),
  card(
    294,
    "safe",
    { en: "The Coffee Machine", es: "La Cafetera" },
    {
      en: "It dispenses anything you can name. It also names you.",
      es: "Sirve cualquier cosa que nombres. También te nombra a ti.",
    },
    "intellect",
    1,
    { collateral: [equipment(1)], failure: [integrity(-1)], breach: [integrity(-2)] },
  ),
  card(
    500,
    "safe",
    { en: "Panacea", es: "Panacea" },
    {
      en: "One pill cures anything. There is no second pill.",
      es: "Una pastilla cura cualquier cosa. No hay una segunda pastilla.",
    },
    "intellect",
    1,
    { collateral: [integrity(2)], failure: [], breach: [integrity(-1)] },
  ),
  card(
    914,
    "safe",
    { en: "The Clockworks", es: "El Mecanismo de Relojería" },
    {
      en: "Put something in, get a better version out. Usually better.",
      es: "Pon algo dentro y saca una versión mejor. Normalmente mejor.",
    },
    "intellect",
    1,
    {
      collateral: [equipment(2), loseGear(1)],
      failure: [loseGear(1)],
      breach: [integrity(-2)],
    },
  ),
  card(
    1025,
    "safe",
    { en: "Encyclopedia of Common Diseases", es: "Enciclopedia de Enfermedades Comunes" },
    {
      en: "You read it. Now you have read it, and it has read you.",
      es: "Lo lees. Ahora lo has leído, y él te ha leído a ti.",
    },
    "intellect",
    1,
    { collateral: [integrity(-1)], failure: [integrity(-2)], breach: [integrity(-3)] },
  ),

  card(
    173,
    "euclid",
    { en: "The Sculpture", es: "La Escultura" },
    {
      en: "It only moves when you stop looking. Do not stop looking.",
      es: "Solo se mueve cuando dejas de mirar. No dejes de mirar.",
    },
    "combat",
    2,
    { collateral: [integrity(-1)], failure: [integrity(-2)], breach: [integrity(-3)] },
  ),
  card(
    96,
    "euclid",
    { en: "The Shy Guy", es: "El Tímido" },
    {
      en: "You saw its face. It will not stop until yours is gone.",
      es: "Viste su cara. No parará hasta que la tuya desaparezca.",
    },
    "intellect",
    2,
    { collateral: [hunter()], failure: [hunter()], breach: [hunter(), threat(1)] },
  ),
  card(
    49,
    "euclid",
    { en: "Plague Doctor", es: "El Doctor de la Peste" },
    {
      en: "He wants to cure you. He is very good at it, in his own way.",
      es: "Quiere curarte. Es muy bueno en eso, a su manera.",
    },
    "intellect",
    3,
    { collateral: [integrity(-1)], failure: [hunter()], breach: [integrity(-2), hunter()] },
  ),
  card(
    12,
    "euclid",
    { en: "A Bad Composition", es: "Una Composición Deficiente" },
    {
      en: "You cannot leave while you are still reading it.",
      es: "No puedes irte mientras sigas leyéndolo.",
    },
    "intellect",
    2,
    {
      collateral: [tag("bound")],
      failure: [tag("bound"), integrity(-1)],
      breach: [integrity(-2), tag("bound")],
    },
  ),
  card(
    426,
    "euclid",
    { en: "I Am a Toaster", es: "Soy una Tostadora" },
    {
      en: "It insists it is a toaster. Insisting costs you something.",
      es: "Insiste en que es una tostadora. Insistir te cuesta algo.",
    },
    "intellect",
    2,
    { collateral: [fate(-1)], failure: [fate(-2)], breach: [fate(-1), integrity(-1)] },
  ),
  card(
    513,
    "euclid",
    { en: "A Cowbell", es: "Un Cencerro" },
    {
      en: "Ring it once and something starts walking toward the sound.",
      es: "Hazlo sonar una vez y algo empieza a caminar hacia el sonido.",
    },
    "intellect",
    2,
    { collateral: [hunter()], failure: [hunter()], breach: [hunter(), threat(1)] },
  ),
  card(
    1471,
    "euclid",
    { en: "MalO ver1.0.0", es: "MalO ver1.0.0" },
    {
      en: "You installed it. It is in the mirror now, behind you.",
      es: "Lo instalaste. Ahora está en el espejo, detrás de ti.",
    },
    "intellect",
    2,
    { collateral: [integrity(-1)], failure: [hunter()], breach: [hunter(), integrity(-1)] },
  ),
  card(
    8,
    "euclid",
    { en: "Zombie Plague", es: "Plaga Zombi" },
    {
      en: "It spreads through the ventilation. It is already spreading.",
      es: "Se propaga por la ventilación. Ya se está propagando.",
    },
    "intellect",
    3,
    {
      collateral: [integrity(-1)],
      failure: [integrity(-2), threat(1)],
      breach: [integrity(-3), threat(1)],
    },
  ),

  card(
    106,
    "keter",
    { en: "The Old Man", es: "El Anciano" },
    {
      en: "He walks through walls and takes what he wants. He wants you.",
      es: "Atraviesa paredes y toma lo que quiere. Te quiere a ti.",
    },
    "combat",
    4,
    { collateral: [integrity(-2)], failure: [integrity(-3)], breach: [integrity(-3), loseGear(1)] },
  ),
  card(
    682,
    "keter",
    { en: "Hard-to-Destroy Reptile", es: "Reptil Difícil de Destruir" },
    {
      en: "Everything you do to it, it learns. Everything.",
      es: "Todo lo que le haces, lo aprende. Todo.",
    },
    "combat",
    5,
    { collateral: [integrity(-2)], failure: [integrity(-4)], breach: [integrity(-4), threat(2)] },
  ),
  card(
    35,
    "keter",
    { en: "Possessive Mask", es: "Máscara Posesiva" },
    {
      en: "Put it on and it will do the talking. It is very persuasive.",
      es: "Póntela y hablará por ti. Es muy persuasiva.",
    },
    "intellect",
    4,
    { collateral: [integrity(-2)], failure: [integrity(-3), fate(-1)], breach: [integrity(-4)] },
  ),
  card(
    610,
    "keter",
    { en: "The Flesh That Hates", es: "La Carne que Odia" },
    {
      en: "It grows toward whoever is closest. It is always growing.",
      es: "Crece hacia quien esté más cerca. Siempre está creciendo.",
    },
    "combat",
    4,
    { collateral: [integrity(-2)], failure: [integrity(-3), hunter()], breach: [integrity(-4), hunter()] },
  ),
  card(
    3000,
    "keter",
    { en: "Ananteshesha", es: "Ananteshesha" },
    {
      en: "It remembers everyone it has ever eaten. Now it remembers you.",
      es: "Recuerda a todos los que ha devorado. Ahora te recuerda a ti.",
    },
    "intellect",
    5,
    { collateral: [records(-1)], failure: [integrity(-1), records(-2)], breach: [integrity(-2), setRecords(0)] },
  ),
  card(
    2935,
    "keter",
    { en: "O, Death", es: "Oh, Muerte" },
    {
      en: "A door to a world where everything here is already dead.",
      es: "Una puerta a un mundo donde todo aquí ya está muerto.",
    },
    "intellect",
    5,
    { collateral: [threat(1)], failure: [threat(2), integrity(-2)], breach: [threat(3)] },
  ),
];

export const ANOMALY_BY_ID: ReadonlyMap<string, AnomalyCard> = new Map(
  ANOMALIES.map((anomaly) => [anomaly.id, anomaly]),
);

export function anomalyById(id: string): AnomalyCard {
  const found = ANOMALY_BY_ID.get(id);
  if (!found) throw new Error(`unknown anomaly: ${id}`);
  return found;
}
