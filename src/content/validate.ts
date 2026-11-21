/**
 * The content validator (§S8.3). Eleven checks, each a build failure when it
 * matters:
 *
 * 1. schema parse — TypeScript is the schema at build time;
 * 2. locale completeness; 3. unique IDs; 4. attribution;
 * 5. glossary (a list of forbidden ES synonyms);
 * 6. board graph integrity; 7. footprint satisfiability;
 * 8. role invariants; 9. deck sufficiency; 10. ES length ratio;
 * 11. content version.
 *
 * Attribution `author: "PENDING"` is a **warning** by default and an **error**
 * under `--release` (debt D2: the wiki pass is not done yet).
 */

import { ANOMALIES } from "./anomalies";
import { BOARD } from "./board";
import { BREACH_DIRECTIVES, MAIN_DIRECTIVES } from "./directives";
import { ESCALATION } from "./escalation";
import { EQUIPMENT, GEAR_BY_ID, ROLE_GEAR } from "./gear";
import { GLOSSARY } from "./glossary";
import { ASPECTS, ROLES } from "./roles";
import { CONTENT_VERSION } from "./version";
import { distance } from "../engine/board";

export type Issue = {
  readonly level: "error" | "warning";
  readonly check: string;
  readonly message: string;
};

export type ValidateOptions = {
  /** Attribution completeness becomes a failure. Used by the release gate. */
  readonly release?: boolean;
};

const PRODUCIBLE_INTENT = new Set(["tamperedProtocol", "tookSample", "sealedGate"]);

function localisedPairs(label: string, value: { en: string; es: string }): Issue[] {
  const issues: Issue[] = [];
  for (const [locale, text] of Object.entries(value)) {
    if (!text || text.trim().length === 0) {
      issues.push({ level: "error", check: "locale", message: `${label}.${locale} is empty` });
    }
    if (text !== text.trim()) {
      issues.push({ level: "warning", check: "locale", message: `${label}.${locale} has surrounding whitespace` });
    }
  }
  if (value.es.length > value.en.length * 1.4 + 6) {
    issues.push({
      level: "warning",
      check: "es-length",
      message: `${label} ES is ${(value.es.length / value.en.length).toFixed(2)}× EN (layout risk)`,
    });
  }
  return issues;
}

function attributionIssue(
  label: string,
  attribution: { slug?: string; author?: string; licence: string },
  release: boolean,
): Issue[] {
  const issues: Issue[] = [];
  if (attribution.licence === "CC BY-SA 3.0") {
    if (!attribution.slug) issues.push({ level: "error", check: "attribution", message: `${label} has no wiki slug` });
    if (!attribution.author) {
      issues.push({ level: "error", check: "attribution", message: `${label} has no author` });
    } else if (attribution.author === "PENDING") {
      issues.push({
        level: release ? "error" : "warning",
        check: "attribution",
        message: `${label} author is PENDING (debt D2)`,
      });
    }
  }
  return issues;
}

function uniqueIds(label: string, ids: readonly string[]): Issue[] {
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const id of ids) {
    if (seen.has(id)) issues.push({ level: "error", check: "unique-ids", message: `${label} has duplicate id ${id}` });
    seen.add(id);
  }
  return issues;
}

export function validateContent(options: ValidateOptions = {}): Issue[] {
  const release = options.release ?? false;
  const issues: Issue[] = [];

  // 11 — the version.
  if (!CONTENT_VERSION || CONTENT_VERSION.trim().length === 0) {
    issues.push({ level: "error", check: "content-version", message: "CONTENT_VERSION is empty" });
  }

  // 3 — unique ids across every namespace that can collide.
  issues.push(
    ...uniqueIds("board", BOARD.nodes.map((node) => node.id)),
    ...uniqueIds("gates", BOARD.gates.map((gate) => gate.id)),
    ...uniqueIds("anomalies", ANOMALIES.map((card) => card.id)),
    ...uniqueIds("directives", MAIN_DIRECTIVES.map((directive) => directive.id)),
    ...uniqueIds("escalation", ESCALATION.map((card) => card.id)),
    ...uniqueIds("gear", [...ROLE_GEAR, ...EQUIPMENT].map((item) => item.id)),
    ...uniqueIds("roles", ROLES.map((role) => role.id)),
    ...uniqueIds("aspects", ASPECTS.map((aspect) => aspect.id)),
  );

  // 2 + 10 — locales and length ratio.
  for (const node of BOARD.nodes) issues.push(...localisedPairs(`board.${node.id}.name`, node.name));
  for (const card of ANOMALIES) {
    issues.push(...localisedPairs(`anomaly.${card.id}.name`, card.name));
    issues.push(...localisedPairs(`anomaly.${card.id}.text`, card.text));
  }
  for (const role of ROLES) issues.push(...localisedPairs(`role.${role.id}.name`, role.name));
  for (const aspect of ASPECTS) {
    issues.push(...localisedPairs(`aspect.${aspect.id}.name`, aspect.name));
    aspect.compels.forEach((compel, index) =>
      issues.push(...localisedPairs(`aspect.${aspect.id}.compel${index}`, compel.text)),
    );
  }
  for (const directive of MAIN_DIRECTIVES) {
    issues.push(...localisedPairs(`directive.${directive.id}.name`, directive.name));
    issues.push(...localisedPairs(`directive.${directive.id}.text`, directive.text));
  }
  for (const card of ESCALATION) {
    issues.push(...localisedPairs(`escalation.${card.id}.name`, card.name));
    issues.push(...localisedPairs(`escalation.${card.id}.text`, card.text));
  }
  for (const item of [...ROLE_GEAR, ...EQUIPMENT]) {
    issues.push(...localisedPairs(`gear.${item.id}.name`, item.name));
    issues.push(...localisedPairs(`gear.${item.id}.text`, item.text));
  }

  // 4 — attribution.
  for (const card of ANOMALIES) {
    issues.push(...attributionIssue(`anomaly.${card.id}`, { ...card.attribution, licence: card.attribution.licence }, release));
  }
  for (const item of EQUIPMENT) {
    issues.push(...attributionIssue(`gear.${item.id}`, item.attribution, release));
  }
  for (const directive of MAIN_DIRECTIVES) {
    issues.push(...attributionIssue(`directive.${directive.id}`, directive.attribution, release));
  }

  // 5 — glossary: banned synonyms in ES content.
  const esTexts: { label: string; text: string }[] = [
    ...BOARD.nodes.map((node) => ({ label: `board.${node.id}`, text: node.name.es })),
    ...ANOMALIES.flatMap((card) => [
      { label: `anomaly.${card.id}.name`, text: card.name.es },
      { label: `anomaly.${card.id}.text`, text: card.text.es },
    ]),
    ...MAIN_DIRECTIVES.flatMap((directive) => [
      { label: `directive.${directive.id}.name`, text: directive.name.es },
      { label: `directive.${directive.id}.text`, text: directive.text.es },
    ]),
  ];
  for (const entry of esTexts) {
    for (const glossary of GLOSSARY) {
      for (const banned of glossary.banned) {
        const pattern = new RegExp(`\\b${banned}\\b`, "i");
        if (pattern.test(entry.text)) {
          issues.push({
            level: "warning",
            check: "glossary",
            message: `${entry.label} uses "${banned}" instead of "${glossary.canonical}" (B5 vocabulary)`,
          });
        }
      }
    }
  }

  // 6 — board graph integrity.
  const nodeIds = new Set(BOARD.nodes.map((node) => node.id));
  for (const gate of BOARD.gates) {
    if (!nodeIds.has(gate.a) || !nodeIds.has(gate.b)) {
      issues.push({ level: "error", check: "board", message: `gate ${gate.id} joins a missing node` });
    }
  }
  for (const ring of Object.keys(BOARD.rings) as (keyof typeof BOARD.rings)[]) {
    const slots = BOARD.nodes.filter((node) => node.ring === ring).map((node) => node.slot).sort((a, b) => a - b);
    if (slots.length !== BOARD.rings[ring].slots) {
      issues.push({ level: "error", check: "board", message: `${ring} has ${slots.length} nodes for ${BOARD.rings[ring].slots} slots` });
    }
    slots.forEach((slot, index) => {
      if (slot !== index) {
        issues.push({ level: "error", check: "board", message: `${ring} slot ${index} is missing` });
      }
    });
  }
  if (!Number.isFinite(distance("outer-02", "core-00"))) {
    issues.push({ level: "error", check: "board", message: "the Command Center is unreachable" });
  }

  // 7 — footprint satisfiability (D18).
  for (const directive of BREACH_DIRECTIVES) {
    if (directive.publicFootprint.length === 0) {
      issues.push({ level: "error", check: "footprint", message: `${directive.id} is breach-aligned with no footprint` });
    }
    for (const kind of directive.publicFootprint) {
      if (!PRODUCIBLE_INTENT.has(kind)) {
        issues.push({ level: "error", check: "footprint", message: `${directive.id} needs unproducible ${kind}` });
      }
    }
  }
  for (const directive of MAIN_DIRECTIVES) {
    if (directive.alignment === "containment" && directive.publicFootprint.length > 0) {
      issues.push({ level: "error", check: "footprint", message: `${directive.id} is containment but demands evidence` });
    }
  }

  // 8 — role invariants.
  const aspectIds = ASPECTS.map((aspect) => aspect.id);
  if (ROLES.length !== 6) {
    issues.push({ level: "error", check: "roles", message: `expected 6 roles, found ${ROLES.length}` });
  }
  for (const role of ROLES) {
    const total = role.stats.combat + role.stats.intellect;
    if (total < 5 || total > 6) {
      issues.push({ level: "error", check: "roles", message: `${role.id} breaks the balance band (${total})` });
    }
    if (role.maxIntegrity < 5 || role.maxIntegrity > 7) {
      issues.push({ level: "error", check: "roles", message: `${role.id} Integrity ${role.maxIntegrity} is outside 5–7` });
    }
    if (!aspectIds.includes(role.aspectId)) {
      issues.push({ level: "error", check: "roles", message: `${role.id} names a missing aspect` });
    }
    for (const itemId of role.startingGear) {
      if (!GEAR_BY_ID.has(itemId)) {
        issues.push({ level: "error", check: "roles", message: `${role.id} starts with unknown gear ${itemId}` });
      }
    }
  }
  if (new Set(ROLES.map((role) => role.aspectId)).size !== ROLES.length) {
    issues.push({ level: "error", check: "roles", message: "two roles share an aspect" });
  }
  for (const aspect of ASPECTS) {
    if (aspect.compels.length !== 3) {
      issues.push({ level: "error", check: "compels", message: `${aspect.id} has ${aspect.compels.length} compels, expected 3` });
    }
    const hasCost = aspect.compels.some((compel) =>
      compel.effect.some(
        (effect) =>
          (effect.kind === "modifyIntegrity" && effect.delta < 0) ||
          (effect.kind === "modifyRecords" && effect.delta < 0) ||
          effect.kind === "removeGear" ||
          effect.kind === "addTag",
      ),
    );
    if (!hasCost) {
      issues.push({ level: "error", check: "compels", message: `${aspect.id} is pure upside` });
    }
  }

  // 9 — deck sufficiency.
  if (ANOMALIES.length < 18) issues.push({ level: "error", check: "decks", message: "fewer than 18 anomalies" });
  if (MAIN_DIRECTIVES.length !== 12) issues.push({ level: "error", check: "decks", message: "expected 12 main directives" });
  if (ESCALATION.length < 14) issues.push({ level: "error", check: "decks", message: "fewer than 14 escalation cards" });
  if (EQUIPMENT.length < 10) issues.push({ level: "error", check: "decks", message: "fewer than 10 equipment items" });
  if (ESCALATION.filter((card) => card.id.startsWith("e-assembly")).length !== 2) {
    issues.push({ level: "error", check: "decks", message: "expected exactly 2 Emergency Assembly cards" });
  }
  const facility = ESCALATION.filter((card) => card.target === "facility").length;
  if (facility / ESCALATION.length < 0.4) {
    issues.push({ level: "error", check: "decks", message: "fewer than 40% facility escalation cards" });
  }

  return issues;
}

export function summarize(issues: readonly Issue[]): { errors: number; warnings: number } {
  return {
    errors: issues.filter((issue) => issue.level === "error").length,
    warnings: issues.filter((issue) => issue.level === "warning").length,
  };
}
