/**
 * The doom deck (§14k.5 R2).
 *
 * The Threat track used to be a stall detector: a table that kept attempting
 * things could hold it at zero forever, and after L15 that also held off the only
 * ending. These cards are the other half: drawn by chance at the end of a round,
 * they advance the track no matter how well the table plays, so the site is
 * doomed on a schedule rather than on a mistake.
 *
 * They are facility events, so they use the existing `raiseThreat` effect and
 * cost no new rule. Content is ours.
 */

import type { Localized } from "./board";

export type DoomCard = {
  readonly id: string;
  readonly name: Localized;
  readonly text: Localized;
};

export const DOOM: readonly DoomCard[] = [
  {
    id: "d-breach-spreads",
    name: { en: "The breach spreads", es: "La brecha se extiende" },
    text: {
      en: "Another bulkhead fails somewhere below. The threat track rises.",
      es: "Otro mamparo cede en algún lugar abajo. La amenaza sube.",
    },
  },
  {
    id: "d-pressure",
    name: { en: "Pressure loss", es: "Pérdida de presión" },
    text: {
      en: "A seal gives with a sound like a held breath. The threat track rises.",
      es: "Un sello cede con un sonido como un suspiro contenido. La amenaza sube.",
    },
  },
  {
    id: "d-structure",
    name: { en: "Structural fatigue", es: "Fatiga estructural" },
    text: {
      en: "The floor shifts under the rings. The threat track rises.",
      es: "El suelo se mueve bajo los anillos. La amenaza sube.",
    },
  },
  {
    id: "d-lights",
    name: { en: "The lights go out", es: "Se apagan las luces" },
    text: {
      en: "Emergency power takes a section with it. The threat track rises.",
      es: "La energía de emergencia se lleva una sección. La amenaza sube.",
    },
  },
];
