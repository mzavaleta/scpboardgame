/**
 * Board data (§C1). Pure content: no rules, no rendering, no engine imports.
 *
 * Node names are provisional pending the canon pass (B4); every field that will
 * need attribution later is marked in the implementation document, not here.
 *
 * Ring sizes are a tuning parameter, so nothing in this file encodes positions —
 * only slots, rings, kinds and edges. The renderer derives geometry (§C1, §S7.4).
 */

export type Localized = { readonly en: string; readonly es: string };

export type RingId = "outer" | "middle" | "inner" | "core";

export type NodeKind =
  | "entry"
  | "medical"
  | "checkpoint"
  | "supply"
  | "terminal"
  | "lab"
  | "cell"
  | "alarm"
  | "core";

export type BoardNode = {
  readonly id: string;
  readonly ring: RingId;
  readonly slot: number;
  readonly kind: NodeKind;
  readonly name: Localized;
};

export type Gate = {
  readonly id: string;
  /** Nodes on either side. Gates are bidirectional edges, never nodes (§C1.3). */
  readonly a: string;
  readonly b: string;
  /** Clearance level that lets you through without a test. */
  readonly clearance: 1 | 2 | 3 | 4;
  /** Fallback for players who have not bought clearance yet. */
  readonly test: { readonly stat: "intellect"; readonly difficulty: number };
};

export type BoardDef = {
  readonly rings: Readonly<Record<RingId, { readonly slots: number }>>;
  readonly nodes: readonly BoardNode[];
  readonly gates: readonly Gate[];
};

const node = (ring: RingId, slot: number, kind: NodeKind, en: string, es: string): BoardNode => ({
  id: `${ring}-${String(slot).padStart(2, "0")}`,
  ring,
  slot,
  kind,
  name: { en, es },
});

export const BOARD: BoardDef = {
  rings: {
    outer: { slots: 12 },
    middle: { slots: 10 },
    inner: { slots: 8 },
    core: { slots: 1 },
  },
  nodes: [
    // Outer — Safe · Administrative & Residential (§C1.5)
    node("outer", 0, "lab", "Storage Vault 2", "Bóveda de Almacenamiento 2"),
    node("outer", 1, "terminal", "Records Annex", "Anexo de Registros"),
    node("outer", 2, "entry", "Arrival Gate", "Puerta de Llegada"),
    node("outer", 3, "supply", "Requisitions Office", "Oficina de Requisiciones"),
    node("outer", 4, "alarm", "Alarm Junction", "Cruce de Alarmas"),
    node("outer", 5, "checkpoint", "Checkpoint Alpha", "Punto de Control Alfa"),
    node("outer", 6, "medical", "Medical Bay", "Enfermería"),
    node("outer", 7, "lab", "Dormitory Block C", "Bloque de Dormitorios C"),
    node("outer", 8, "supply", "Supply Depot", "Depósito de Suministros"),
    node("outer", 9, "terminal", "Personnel Terminal", "Terminal de Personal"),
    node("outer", 10, "lab", "Containment Locker 4", "Casillero de Contención 4"),
    node("outer", 11, "medical", "Observation Ward", "Sala de Observación"),

    // Middle — Euclid · Heavy Containment
    node("middle", 0, "lab", "Euclid Containment 1", "Contención Euclid 1"),
    node("middle", 1, "cell", "Anomaly Cell 7", "Celda de Anomalías 7"),
    node("middle", 2, "checkpoint", "Checkpoint Beta", "Punto de Control Beta"),
    node("middle", 3, "terminal", "Research Terminal", "Terminal de Investigación"),
    node("middle", 4, "supply", "Requisition Cage", "Jaula de Requisiciones"),
    node("middle", 5, "alarm", "Breach Corridor", "Pasillo de Brecha"),
    node("middle", 6, "lab", "Biohazard Lab", "Laboratorio de Riesgo Biológico"),
    node("middle", 7, "checkpoint", "Checkpoint Gamma", "Punto de Control Gamma"),
    node("middle", 8, "cell", "Euclid Containment 9", "Contención Euclid 9"),
    node("middle", 9, "medical", "Field Station", "Puesto de Campaña"),

    // Inner — Keter · Critical Core
    node("inner", 0, "cell", "Keter Holding A", "Confinamiento Keter A"),
    node("inner", 1, "checkpoint", "Core Airlock Alpha", "Esclusa del Núcleo Alfa"),
    node("inner", 2, "terminal", "Command Terminal", "Terminal de Mando"),
    node("inner", 3, "alarm", "Reactor Spine", "Columna del Reactor"),
    node("inner", 4, "cell", "Keter Holding B", "Confinamiento Keter B"),
    node("inner", 5, "checkpoint", "Core Airlock Beta", "Esclusa del Núcleo Beta"),
    node("inner", 6, "medical", "Burn Ward", "Sala de Quemados"),
    node("inner", 7, "supply", "Armory Cage", "Jaula de Armería"),

    // Core
    node("core", 0, "core", "Command Center", "Centro de Mando"),
  ],
  // Two gates per boundary, placed roughly antipodal (§C1.6 invariant 2).
  gates: [
    { id: "G1", a: "outer-05", b: "middle-04", clearance: 2, test: { stat: "intellect", difficulty: 2 } },
    { id: "G2", a: "outer-10", b: "middle-08", clearance: 2, test: { stat: "intellect", difficulty: 2 } },
    { id: "G3", a: "middle-02", b: "inner-02", clearance: 3, test: { stat: "intellect", difficulty: 3 } },
    { id: "G4", a: "middle-07", b: "inner-06", clearance: 3, test: { stat: "intellect", difficulty: 3 } },
    { id: "G5", a: "inner-01", b: "core-00", clearance: 4, test: { stat: "intellect", difficulty: 4 } },
    { id: "G6", a: "inner-05", b: "core-00", clearance: 4, test: { stat: "intellect", difficulty: 4 } },
  ],
};

export const ARRIVAL_NODE = "outer-02";
