/**
 * UI chrome dictionary (§S12).
 *
 * Typed, hand-rolled, dependency-free. `en` is the source of truth for the key
 * set; `es` must satisfy it, so a missing translation is a compile error. Content
 * (`{ en, es }`) stays in `src/content` and is read with `localized()`.
 *
 * Debt D1: the implementation document names i18next. This module provides the
 * same outcome without a dependency; swapping later is mechanical.
 */

import type { Localized } from "../content/board";

export type Lang = "en" | "es" | "pseudo";

const EN = {
  appTitle: "PROTOCOL BREACH",
  round: "round",
  phase: "phase",
  phaseRoll: "roll",
  phaseMove: "move",
  phaseSpace: "space",
  phaseAction: "action",
  phaseEnd: "end",
  phaseTurnStart: "start",
  threat: "threat",
  protocol: "protocol",
  warhead: "warhead",
  seed: "seed",
  hash: "hash",
  newGame: "New game",
  language: "Language",
  english: "English",
  spanish: "Español",
  players: "Players",
  legend: "Legend",
  log: "Log",

  setupTitle: "A facility is failing. Four people have to survive it.",
  setupLead: "Two or three players, one device, ninety minutes.",
  tableSize: "Table size",
  twoPlayers: "2 players",
  threePlayers: "3 players",
  start: "Start",
  draftTitle: "Role draft",
  draftLead: "Pick the character you will play. The others are retired for this match.",
  chooseRole: "Choose",
  combat: "Combat",
  intellect: "Intellect",
  integrity: "Integrity",
  gear: "Gear",
  aspect: "Aspect",
  none: "none",

  handoffTitle: "Pass the device",
  handoffLead: "Hold to reveal, then release. Nobody else should be looking.",
  passTo: "Pass to {seat}",
  reveal: "Hold to reveal",
  conceal: "Release to hide",
  directive: "Main Directive",
  beginTable: "Begin",
  seatDone: "Done",

  you: "You",
  atSpace: "at",
  actions: "Actions",
  rollMovement: "Roll movement",
  endTurn: "End turn",
  chooseLanding: "Choose where to land ({count} options)",
  buyClearance: "Buy clearance {level} · {price} Rec",
  raiseStat: "{stat} +1 · {cost} Rec",
  pickUp: "Pick up {item}",
  confront: "Confront {hunter}",
  capsule: "Capsule",
  claimCapsule: "Claim the escape capsule",
  capsuleHeld: "Capsule: {seat}",
  advanceProtocol: "Advance protocol · I{difficulty}",
  sabotageProtocol: "Sabotage protocol",
  respawn: "Choose a new character",
  rest: "Rest",
  rescue: "Rescue {seat}",
  sealGate: "Seal {gate}",
  useItem: "Use",
  compel: "Compel",
  fate: "Fate",
  records: "Records",
  clearance: "Clearance",
  downed: "DOWN",
  evidence: "Evidence",
  accident: "accident",
  intent: "intent",
  tags: "Tags",
  yourSheet: "Your sheet",
  holdToReveal: "Hold to reveal",
  releaseToHide: "Release to hide",
  yourAspect: "Public aspect",
  privatePanel: "Private panel",
  claimSeat: "I am…",
  notYourSeat: "Nothing here for that seat.",
  motive: "Motive",

  tierSafe: "safe",
  tierEuclid: "euclid",
  tierKeter: "keter",
  kindEntry: "entry",
  kindMedical: "medical",
  kindCheckpoint: "checkpoint",
  kindSupply: "supply",
  kindTerminal: "terminal",
  kindLab: "lab",
  kindCell: "cell",
  kindAlarm: "alarm",
  kindCore: "core",
  gateTip: "{gate} — {condition} / Intellect {difficulty}",
  gateTipSealed: "{gate} — {condition} / Intellect {difficulty} · sealed until round {round}",
  gateOpen: "open",
  gateLocked: "locked",
  gateGuarded: "guarded",
  hunterCount: "Hunters: {count}",

  encounterTitle: "Anomaly",
  testLine: "{stat} {value} vs difficulty {difficulty}",
  contain: "Contain · {records} Rec",
  walkAway: "Walk away",
  walkAwayCost: "Walk away · +{threat} Threat",
  walkAwayFree: "Walk away · free",

  assemblyTitle: "Emergency Assembly",
  assemblyLead: "Seal the bulkhead, or hold it open. Nobody is named; somebody loses.",
  sealBulkhead: "Seal the bulkhead",
  holdItOpen: "Hold it open",
  votesCast: "{done}/{total} votes",
  waitingFor: "Waiting for {seat}",

  compelTitle: "{invoker} compels {target}",
  compelLead: "Accept the effect and gain 2 Fate, or spend 1 Fate to refuse.",
  accept: "Accept",
  refuse: "Refuse · 1 Fate",
  refuseFree: "Refuse · waiver",
  cannotRefuse: "No Fate — you cannot refuse.",

  siteLost: "Site lost",
  siteRecontained: "Site recontained",
  winners: "Winners: {seats}",
  noWinners: "Nobody wins — every directive went unmet.",
  gameOver: "Game over",

  endgameTitle: "The motive reveal",
  endgameLead: "Every directive, in seat order. This is why it happened.",
  finalDirective: "Final directive",
  previousDirective: "Before the death",
  verdict: "Verdict",
  containmentAligned: "containment",
  breachAligned: "breach",
  evidenceTrail: "Evidence trail",
  role: "Role",
  won: "won",
  lost: "lost",
  whyWon: "the ending went their way.",
  whyCondition: "their condition did not hold.",
  whyFootprint: "no public footprint — the victory is rejected (D18).",
  playAgain: "Play again",
  credits: "Credits",

  creditsTitle: "Credits and licences",
  creditsLead: "Adapted entries are CC BY-SA 3.0. Original content is ours.",
  pendingAttribution: "author pending",
  original: "original",
  back: "Back",
  rules: "Rules",
  rulesLead: "How the facility works, in the order you meet it at the table.",

  devTools: "Dev tools",
  forceRoll: "Force roll",
  forceCard: "Open card",
  damage: "Damage 3",
  down: "Down",
  forceEscalation: "Escalation",
  forceDirective: "Directive",
  fingerprint: "cfg",
  nextDraws: "draw",
  rolesCount: "Roles: {count}",

  errorPrefix: "Rejected",
} as const;

export type Key = keyof typeof EN;

const ES: Record<Key, string> = {
  appTitle: "PROTOCOL BREACH",
  round: "ronda",
  phase: "fase",
  phaseRoll: "tirada",
  phaseMove: "movimiento",
  phaseSpace: "espacio",
  phaseAction: "acción",
  phaseEnd: "fin",
  phaseTurnStart: "inicio",
  threat: "amenaza",
  protocol: "protocolo",
  warhead: "ojiva",
  seed: "semilla",
  hash: "hash",
  newGame: "Nueva partida",
  language: "Idioma",
  english: "English",
  spanish: "Español",
  players: "Jugadores",
  legend: "Leyenda",
  log: "Registro",

  setupTitle: "Una instalación está fallando. Cuatro personas tienen que sobrevivir.",
  setupLead: "Dos o tres jugadores, un dispositivo, noventa minutos.",
  tableSize: "Tamaño de mesa",
  twoPlayers: "2 jugadores",
  threePlayers: "3 jugadores",
  start: "Empezar",
  draftTitle: "Elección de personaje",
  draftLead: "Elige el personaje que jugarás. Los demás quedan retirados en esta partida.",
  chooseRole: "Elegir",
  combat: "Combate",
  intellect: "Intelecto",
  integrity: "Integridad",
  gear: "Equipo",
  aspect: "Aspecto",
  none: "ninguno",

  handoffTitle: "Pasa el dispositivo",
  handoffLead: "Mantén pulsado para revelar y suelta. Nadie más debería mirar.",
  passTo: "Pasa a {seat}",
  reveal: "Mantén para revelar",
  conceal: "Suelta para ocultar",
  directive: "Directriz principal",
  beginTable: "Comenzar",
  seatDone: "Listo",

  you: "Tú",
  atSpace: "en",
  actions: "Acciones",
  rollMovement: "Tirar movimiento",
  endTurn: "Terminar turno",
  chooseLanding: "Elige dónde aterrizar ({count} opciones)",
  buyClearance: "Comprar acceso {level} · {price} Reg",
  raiseStat: "{stat} +1 · {cost} Reg",
  pickUp: "Recoger {item}",
  confront: "Confrontar a {hunter}",
  capsule: "Cápsula",
  claimCapsule: "Reclamar la cápsula de escape",
  capsuleHeld: "Cápsula: {seat}",
  advanceProtocol: "Avanzar protocolo · I{difficulty}",
  sabotageProtocol: "Sabotear protocolo",
  respawn: "Elegir personaje nuevo",
  rest: "Descansar",
  rescue: "Rescatar a {seat}",
  sealGate: "Sellar {gate}",
  useItem: "Usar",
  compel: "Apremiar",
  fate: "Destino",
  records: "Registros",
  clearance: "Acceso",
  downed: "CAÍDO",
  evidence: "Evidencia",
  accident: "accidente",
  intent: "intención",
  tags: "Etiquetas",
  yourSheet: "Tu ficha",
  holdToReveal: "Mantén para revelar",
  releaseToHide: "Suelta para ocultar",
  yourAspect: "Aspecto público",
  privatePanel: "Panel privado",
  claimSeat: "Yo soy…",
  notYourSeat: "No hay nada para esa posición.",
  motive: "Motivo",

  tierSafe: "seguro",
  tierEuclid: "euclid",
  tierKeter: "keter",
  kindEntry: "entrada",
  kindMedical: "médico",
  kindCheckpoint: "control",
  kindSupply: "suministros",
  kindTerminal: "terminal",
  kindLab: "laboratorio",
  kindCell: "celda",
  kindAlarm: "alarma",
  kindCore: "núcleo",
  gateTip: "{gate} — {condition} / Intelecto {difficulty}",
  gateTipSealed: "{gate} — {condition} / Intelecto {difficulty} · sellada hasta la ronda {round}",
  gateOpen: "abierta",
  gateLocked: "bloqueada",
  gateGuarded: "vigilada",
  hunterCount: "Cazadores: {count}",

  encounterTitle: "Anomalía",
  testLine: "{stat} {value} contra dificultad {difficulty}",
  contain: "Contener · {records} Reg",
  walkAway: "Alejarse",
  walkAwayCost: "Alejarse · +{threat} Amenaza",
  walkAwayFree: "Alejarse · gratis",

  assemblyTitle: "Asamblea de Emergencia",
  assemblyLead: "Sellar el mamparo o mantenerlo abierto. Nadie es señalado; alguien pierde.",
  sealBulkhead: "Sellar el mamparo",
  holdItOpen: "Mantenerlo abierto",
  votesCast: "{done}/{total} votos",
  waitingFor: "Esperando a {seat}",

  compelTitle: "{invoker} apremia a {target}",
  compelLead: "Acepta el efecto y gana 2 de Destino, o gasta 1 de Destino para rechazarlo.",
  accept: "Aceptar",
  refuse: "Rechazar · 1 Destino",
  refuseFree: "Rechazar · exención",
  cannotRefuse: "Sin Destino: no puedes rechazarlo.",

  siteLost: "Sitio perdido",
  siteRecontained: "Sitio recontendido",
  winners: "Ganadores: {seats}",
  noWinners: "Nadie gana: ninguna directriz se cumplió.",
  gameOver: "Fin de la partida",

  endgameTitle: "La revelación de motivos",
  endgameLead: "Cada directriz, en orden de asiento. Esto explica por qué ocurrió.",
  finalDirective: "Directriz final",
  previousDirective: "Antes de la muerte",
  verdict: "Veredicto",
  containmentAligned: "contención",
  breachAligned: "brecha",
  evidenceTrail: "Rastro de evidencia",
  role: "Rol",
  won: "ganó",
  lost: "perdió",
  whyWon: "el final les favoreció.",
  whyCondition: "su condición no se cumplió.",
  whyFootprint: "sin huella pública: la victoria queda rechazada (D18).",
  playAgain: "Jugar otra vez",
  credits: "Créditos",

  creditsTitle: "Créditos y licencias",
  creditsLead: "Las entradas adaptadas son CC BY-SA 3.0. El contenido original es nuestro.",
  pendingAttribution: "autor pendiente",
  original: "original",
  back: "Volver",
  rules: "Reglas",
  rulesLead: "Cómo funciona la instalación, en el orden en que la encuentras en la mesa.",

  devTools: "Herramientas de desarrollo",
  forceRoll: "Forzar tirada",
  forceCard: "Abrir carta",
  damage: "Daño 3",
  down: "Derribar",
  forceEscalation: "Escalada",
  forceDirective: "Directriz",
  fingerprint: "cfg",
  nextDraws: "robo",
  rolesCount: "Roles: {count}",

  errorPrefix: "Rechazado",
};

const DICTIONARIES: Record<Lang, Record<Key, string>> = {
  en: EN,
  es: ES,
  // §S12: the pseudo-locale proves chrome has no hardcoded strings. Any English
  // left un-bracketed on screen is a string that never went through `t()`.
  pseudo: Object.fromEntries(
    (Object.keys(EN) as Key[]).map((key) => [key, pseudo(EN[key])]),
  ) as Record<Key, string>,
};

function pseudo(text: string): string {
  const map: Record<string, string> = {
    a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í", j: "ĵ",
    k: "ķ", l: "ļ", m: "ɱ", n: "ñ", o: "ó", p: "þ", q: "ǫ", r: "ŕ", s: "š", t: "ţ",
    u: "ú", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž",
  };
  // `{vars}` must survive untouched: `t()` substitutes them after the pseudo
  // transform, and a mangled placeholder (`{ĝáţé}`) never matches `\w+`, so the
  // pseudo-locale used to print raw braces instead of the value.
  return `⟦${text.replace(/\{[^}]*\}|[a-z]/gi, (chunk) => {
    if (chunk.startsWith("{")) return chunk;
    const lower = chunk.toLowerCase();
    const mapped = map[lower] ?? lower;
    return chunk === lower ? mapped : mapped.toUpperCase();
  })}⟧`;
}

export function detectLang(search = typeof window === "undefined" ? "" : window.location.search): Lang {
  const param = new URLSearchParams(search).get("lang");
  if (param === "es" || param === "en" || param === "pseudo") return param;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("pb-lang");
    if (stored === "es" || stored === "en") return stored;
    if (window.navigator.language.toLowerCase().startsWith("es")) return "es";
  }
  return "en";
}

export function rememberLang(lang: Lang): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("pb-lang", lang);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState(null, "", url.toString());
}

export function t(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const template = DICTIONARIES[lang][key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Content is inline `{ en, es }`; chrome is a key. Two systems, one language state. */
export function localized(value: Localized, lang: Lang): string {
  return lang === "pseudo" ? value.en : value[lang];
}

export const DICTIONARY_KEYS = Object.keys(EN) as Key[];
