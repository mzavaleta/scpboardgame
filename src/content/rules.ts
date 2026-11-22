/**
 * The rules page (§S12 chrome, content stays `{ en, es }`).
 *
 * Two rules for this file:
 * 1. **It describes what the engine actually does.** Where a number is a dial it
 *    is read from `TUNING`, so the page cannot drift from the build.
 * 2. **It is written for a player at the table**, not for the design document:
 *    short sentences, no jargon the screen does not already use.
 *
 * The gate table is generated from `BOARD.gates` + `gateRule()`, the same source
 * the engine reads.
 */

import { gateRule, TUNING } from "../config/tuning";
import { BOARD, type Localized } from "./board";

export type RuleSection = {
  readonly id: string;
  readonly title: Localized;
  readonly body: readonly Localized[];
};

const rewards = TUNING.rewards;
const threat = TUNING.threat;
const protocol = TUNING.protocol;
const fate = TUNING.fate;
const gates = BOARD.gates
  .map((gate) => {
    const rule = gateRule(gate.id);
    const word =
      rule.condition === "open" ? { en: "open", es: "abierta" } : rule.condition === "locked" ? { en: "locked", es: "bloqueada" } : { en: "guarded", es: "vigilada" };
    return `${gate.id} — ${word.en} · Intellect ${rule.test.difficulty}`;
  })
  .join(" · ");

const gatesEs = BOARD.gates
  .map((gate) => {
    const rule = gateRule(gate.id);
    const word =
      rule.condition === "open" ? "abierta" : rule.condition === "locked" ? "bloqueada" : "vigilada";
    return `${gate.id} — ${word} · Intelecto ${rule.test.difficulty}`;
  })
  .join(" · ");

export const RULE_SECTIONS: readonly RuleSection[] = [
  {
    id: "goal",
    title: { en: "The goal", es: "El objetivo" },
    body: [
      {
        en: "The facility is failing and it cannot be saved. You are trying to survive it — and each player has a secret Main Directive that says what surviving means to them. Nobody else can see it.",
        es: "La instalación está fallando y no se puede salvar. Intentas sobrevivir — y cada jugador tiene una Directriz Principal secreta que dice qué significa sobrevivir para él. Nadie más puede verla.",
      },
      {
        en: "The Command Center holds a one-seat escape capsule. The first player to claim it owns the seat; when the countdown runs out, that seat is the way out. A Main Directive whose condition holds at the end is a second way to win — and nobody can win by saving the site, because it cannot be saved.",
        es: "El Centro de Mando contiene una cápsula de escape de un solo asiento. El primer jugador que la reclame se queda con el asiento; cuando el contador llegue a cero, ese asiento es la salida. Una Directriz Principal cuya condición se cumpla al final es una segunda forma de ganar — y nadie gana salvando el sitio, porque no se puede salvar.",
      },
    ],
  },
  {
    id: "turn",
    title: { en: "Your turn", es: "Tu turno" },
    body: [
      {
        en: "Roll one die, move exactly that many spaces, resolve the space you land on, take one action, then end your turn. Only the landing resolves — passing through a space does nothing.",
        es: "Tira un dado, muévete exactamente esa cantidad de casillas, resuelve la casilla donde aterrizas, realiza una acción y termina tu turno. Solo se resuelve el aterrizaje — pasar por una casilla no hace nada.",
      },
      {
        en: "The path must be simple: you cannot return to a space you already visited in the same move. Gates are edges between rings — crossing one is part of the move.",
        es: "El camino debe ser simple: no puedes volver a una casilla que ya visitaste en el mismo movimiento. Las puertas son bordes entre anillos — cruzarlas forma parte del movimiento.",
      },
    ],
  },
  {
    id: "board",
    title: { en: "The board", es: "El tablero" },
    body: [
      {
        en: "Three rings around a Core: outer, middle and inner. The deeper you go, the worse the spaces and the better the payoff. Every boundary is crossed through one of two gates.",
        es: "Tres anillos alrededor de un Núcleo: exterior, medio e interior. Cuanto más profundo, peores son las casillas y mejor la recompensa. Cada frontera se cruza por una de dos puertas.",
      },
    ],
  },
  {
    id: "spaces",
    title: { en: "Spaces", es: "Casillas" },
    body: [
      {
        en: "Lab or cell: draw an anomaly (Safe in the outer ring, Euclid in the middle, Keter in the inner).",
        es: "Laboratorio o celda: roba una anomalía (Segura en el anillo exterior, Euclides en el medio, Keter en el interior).",
      },
      {
        en: "Supply or terminal: draw a piece of equipment. Alarm: draw an escalation card. Medical: resting there heals one more. Checkpoint: where Records are spent.",
        es: "Suministros o terminal: roba una pieza de equipo. Alarma: roba una carta de escalada. Enfermería: descansar allí cura uno más. Punto de control: donde se gastan los Registros.",
      },
      {
        en: "The Core holds the Command Center: the only place where the protocol can be worked.",
        es: "El Núcleo contiene el Centro de Mando: el único lugar donde se puede trabajar el protocolo.",
      },
    ],
  },
  {
    id: "anomalies",
    title: { en: "Anomalies", es: "Anomalías" },
    body: [
      {
        en: "Roll four Fate dice and add Combat or Intellect, then subtract the card's difficulty. The margin reads the outcome: clean or success contains it, collateral contains it and you pay the card's price, failure means it is still loose, breach means it gets out and the site pays.",
        es: "Tira cuatro dados de Destino y suma Combate o Intelecto, luego resta la dificultad de la carta. El margen decide el resultado: limpio o éxito la contiene, colateral la contiene y pagas el precio de la carta, fallo significa que sigue suelta, brecha significa que escapa y el sitio lo paga.",
      },
      {
        en: `Containing pays Records by tier: Safe ${rewards.safe}, Euclid ${rewards.euclid}, Keter ${rewards.keter}. Walking away costs Threat on Euclid and Keter cards, and the anomaly is not contained.`,
        es: `Contener paga Registros según el nivel: Segura ${rewards.safe}, Euclides ${rewards.euclid}, Keter ${rewards.keter}. Alejarse cuesta Amenaza en las cartas Euclides y Keter, y la anomalía no queda contenida.`,
      },
    ],
  },
  {
    id: "gates",
    title: { en: "Gates", es: "Puertas" },
    body: [
      {
        en: `Open: walk through. Locked: opened by a key or one Intellect test — and once opened it stays open for everyone. Guarded: the walk stops at the mouth and draws an anomaly from the ring you are entering. Contain it and you cross; fail or walk away and it stays at the gate, blocking everybody in both directions until someone clears it. Sealed: the Emergency Assembly can shut a gate for ${TUNING.vote.lockRounds} rounds.`,
        es: `Abierta: pasa. Bloqueada: se abre con una llave o con una prueba de Intelecto — y una vez abierta queda abierta para todos. Vigilada: el movimiento se detiene en la boca y roba una anomalía del anillo al que entras. Contenla y cruzas; si fallas o te alejas, se queda en la puerta y bloquea a todos en ambos sentidos hasta que alguien la despeje. Sellada: la Asamblea de Emergencia puede cerrar una puerta durante ${TUNING.vote.lockRounds} rondas.`,
      },
      {
        en: `Current doors: ${gates}.`,
        es: `Puertas actuales: ${gatesEs}.`,
      },
    ],
  },
  {
    id: "threat",
    title: { en: "Threat and the warhead", es: "Amenaza y la ojiva" },
    body: [
      {
        en: `The Threat track runs from 0 to ${threat.max}. At the end of each round it advances by one only if nobody attempted anything that round. An attempt is touching a gate, stepping into a deeper ring, starting a containment, or working the protocol — the outcome does not matter, trying is enough.`,
        es: `La pista de Amenaza va de 0 a ${threat.max}. Al final de cada ronda avanza uno solo si nadie intentó nada en esa ronda. Un intento es tocar una puerta, entrar en un anillo más profundo, iniciar una contención o trabajar el protocolo — el resultado no importa, intentarlo basta.`,
      },
      {
        en: "Trying is not enough to hold it. At the end of every round the facility also gives way: a doom card is drawn by chance, and it raises the track too. The site is lost on a schedule, not on a mistake.",
        es: "Intentarlo no basta para contenerla. Al final de cada ronda la instalación también cede: se roba una carta de perdición por azar, y también sube la pista. El sitio se pierde según un calendario, no por un error.",
      },
      {
        en: `At ${threat.max} the Alpha Warhead arms. It detonates ${threat.warheadCountdown} rounds later.`,
        es: `Con ${threat.max} se arma la Ojiva Alfa. Detona ${threat.warheadCountdown} rondas después.`,
      },
      {
        en: `Stalling has its own price: three turns in a row without attempting anything draws a hazard.`,
        es: `Estancarse tiene su propio precio: tres turnos seguidos sin intentar nada roban un peligro.`,
      },
    ],
  },
  {
    id: "protocol",
    title: { en: "The protocol", es: "El protocolo" },
    body: [
      {
        en: `From the Command Center you can work the protocol: an Intellect test at difficulty ${protocol.difficulty}. Every success buys the table one round — the countdown gains a round once the warhead is armed, and the Threat track falls before that. It never saves the site.`,
        es: `Desde el Centro de Mando puedes trabajar el protocolo: una prueba de Intelecto con dificultad ${protocol.difficulty}. Cada éxito le compra una ronda a la mesa — el contador gana una ronda una vez armada la ojiva, y antes de eso baja la Amenaza. Nunca salva el sitio.`,
      },
      {
        en: "Anyone can sabotage it: one step back, and it leaves public evidence.",
        es: "Cualquiera puede sabotearlo: un paso atrás, y deja evidencia pública.",
      },
    ],
  },
  {
    id: "records",
    title: { en: "Records and progress", es: "Registros y progreso" },
    body: [
      {
        en: "Records are what the facility pays you for containing anomalies. They are public.",
        es: "Los Registros son lo que la instalación te paga por contener anomalías. Son públicos.",
      },
      {
        en: `At a checkpoint you spend ${TUNING.progression.pointsPerStep} Records to raise Combat or Intellect by one, up to ${TUNING.progression.statCap}. That is the only progression in the game: there is no clearance, and no door asks for a rank.`,
        es: `En un punto de control gastas ${TUNING.progression.pointsPerStep} Registros para subir Combate o Intelecto en uno, hasta ${TUNING.progression.statCap}. Esa es la única progresión del juego: no hay acceso y ninguna puerta pide un rango.`,
      },
    ],
  },
  {
    id: "fate",
    title: { en: "Fate", es: "Destino" },
    body: [
      {
        en: `Fate is the small resource of nerve. You earn it the first time you descend into a ring, when an anomaly breaches, and from some escalation cards. It caps at ${fate.cap}.`,
        es: `El Destino es el pequeño recurso del temple. Lo ganas la primera vez que desciendes a un anillo, cuando una anomalía hace brecha, y con algunas cartas de escalada. Máximo ${fate.cap}.`,
      },
      {
        en: `Spend ${fate.reroll} to reroll a test, or 1 Fate per point to push a test by up to +2 — declared before the roll and spent once. A compel moves Fate instead of creating it: the invoker offers ${fate.invokeCompel}; if the target accepts, the point becomes theirs; if they refuse, they pay ${fate.refuseCompel} back to the invoker.`,
        es: `Gasta ${fate.reroll} para repetir una prueba, o 1 de Destino por punto para empujar una prueba hasta +2 — se declara antes de tirar y se gasta una vez. Un apremio mueve Destino en vez de crearlo: quien invoca ofrece ${fate.invokeCompel}; si el objetivo acepta, el punto pasa a ser suyo; si rechaza, paga ${fate.refuseCompel} a quien invocó.`,
      },
    ],
  },
  {
    id: "aspects",
    title: { en: "Aspects and compels", es: "Aspectos y apremios" },
    body: [
      {
        en: "Every character has a public Aspect with three Compels: lines of behaviour anyone can trigger when the situation fits. The Aspect is public even though your directive is not.",
        es: "Cada personaje tiene un Aspecto público con tres Apremios: líneas de conducta que cualquiera puede activar cuando la situación encaja. El Aspecto es público aunque tu directriz no lo sea.",
      },
      {
        en: `Invoking costs ${fate.invokeCompel} Fate and is once per turn. The target either accepts — the compel's effect applies and they gain ${fate.acceptCompel} Fate — or refuses, spending ${fate.refuseCompel} Fate. The Ethics Waiver refuses for free, once.`,
        es: `Invocar cuesta ${fate.invokeCompel} de Destino y es una vez por turno. El objetivo acepta — se aplica el efecto y gana ${fate.acceptCompel} de Destino — o rechaza, gastando ${fate.refuseCompel} de Destino. La Dispensa Ética rechaza gratis, una vez.`,
      },
    ],
  },
  {
    id: "objectives",
    title: { en: "Public objectives", es: "Objetivos públicos" },
    body: [
      {
        en: "Each character has one public objective, fixed by who they are — the reason they are in the building. Everyone can read it.",
        es: "Cada personaje tiene un objetivo público, fijado por quién es: la razón por la que está en el edificio. Todos pueden leerlo.",
      },
      {
        en: "Meet it during the game and take a real reward. Still have it undone when the warhead arms and it costs you — the moment the site's destruction stops being a threat and becomes a fact. An objective already met is never punished.",
        es: "Cúmplelo durante la partida y llévate una recompensa real. Si sigue sin cumplirse cuando se arma la ojiva, te cuesta: el momento en que la destrucción del sitio deja de ser una amenaza y se vuelve un hecho. Un objetivo ya cumplido nunca se castiga.",
      },
    ],
  },
  {
    id: "gear",
    title: { en: "Gear", es: "Equipo" },
    body: [
      {
        en: `Two racks of ${TUNING.equipment.slots}: one for consumables, one for standing equipment. Some items modify your tests or your stats. When a rack is full the new piece stays on the node where you found it, and anyone standing there can take it — including you, once you free a slot.`,
        es: `Dos estantes de ${TUNING.equipment.slots}: uno para consumibles y otro para equipo permanente. Algunos objetos modifican tus pruebas o tus estadísticas. Cuando un estante está lleno, la pieza nueva queda en la casilla donde la encontraste, y cualquiera que esté allí puede tomarla — incluido tú, cuando liberes un hueco.`,
      },
    ],
  },
  {
    id: "hunters",
    title: { en: "Hunters", es: "Cazadores" },
    body: [
      {
        en: "Escalation cards release Hunters. Each one is a real creature with a card's stats: it moves at the end of every round, and sharing its space means fighting it like a containment. A failed test leaves you hurt; confront it on your turn to destroy it. They are public: the whole table sees where they are.",
        es: "Las cartas de escalada liberan Cazadores. Cada uno es una criatura real con las estadísticas de una carta: se mueve al final de cada ronda, y compartir su casilla significa combatirlo como una contención. Una prueba fallida te deja herido; confróntalo en tu turno para destruirlo. Son públicos: toda la mesa ve dónde están.",
      },
    ],
  },
  {
    id: "winning",
    title: { en: "Winning", es: "Ganar" },
    body: [
      {
        en: "When the countdown reaches zero the site is lost. The player holding the escape capsule wins — that seat is the way out.",
        es: "Cuando el contador llega a cero el sitio se pierde. Gana el jugador que tiene la cápsula de escape — ese asiento es la salida.",
      },
      {
        en: "A Main Directive whose condition holds at that moment is a second win. A directive that names a public footprint also needs that evidence on the table.",
        es: "Una Directriz Principal cuya condición se cumpla en ese momento es una segunda victoria. Una directriz que exige una huella pública también necesita esa evidencia sobre la mesa.",
      },
    ],
  },
  {
    id: "downed",
    title: { en: "Down", es: "Caído" },
    body: [
      {
        en: "At 0 Integrity you are down: your turn is skipped unless someone revives you. A player on your space can revive you at 1 Integrity; with a Field Radio they can do it from an adjacent space.",
        es: "Con 0 de Integridad quedas caído: tu turno se salta a menos que alguien te reanime. Un jugador en tu casilla puede reanimarte con 1 de Integridad; con una Radio de Campo puede hacerlo desde una casilla adyacente.",
      },
    ],
  },
];
