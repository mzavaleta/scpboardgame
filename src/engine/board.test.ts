/**
 * Board invariants (§C1.6). These are the checks the content validator will run
 * in CI (§S8.3 check 6); here they run against the single v1 board so a mistake
 * in the ring/gate tables cannot reach the UI.
 */

import { describe, expect, it } from "vitest";
import { BOARD } from "../content/board";
import { distance, gateBetween, neighborsOf, ringOf } from "./board";

const ids = BOARD.nodes.map((node) => node.id);

describe("board shape", () => {
  it("has 31 nodes across the four rings", () => {
    expect(BOARD.nodes).toHaveLength(31);
    expect(BOARD.rings.outer.slots).toBe(12);
    expect(BOARD.rings.middle.slots).toBe(10);
    expect(BOARD.rings.inner.slots).toBe(8);
    expect(BOARD.rings.core.slots).toBe(1);
  });

  it("has unique ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has exactly six gates, two per boundary", () => {
    expect(BOARD.gates).toHaveLength(6);
    expect(BOARD.gates.map((gate) => gate.id)).toEqual(["G1", "G2", "G3", "G4", "G5", "G6"]);
  });

  it("connects every gate to real nodes on the expected boundary", () => {
    for (const gate of BOARD.gates) {
      expect(ids).toContain(gate.a);
      expect(ids).toContain(gate.b);
      expect(ringOf(gate.a)).not.toBe(ringOf(gate.b));
    }
  });

  it("gives each boundary a choice of shape: open or locked outside, guarded or locked deeper", () => {
    const byBoundary = BOARD.gates.map((gate) => gate.condition);
    expect(byBoundary).toEqual(["open", "locked", "guarded", "locked", "locked", "guarded"]);
  });
});

describe("adjacency", () => {
  it("gives every node at least two neighbours", () => {
    for (const id of ids) {
      expect(neighborsOf(id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("is symmetric", () => {
    for (const id of ids) {
      for (const neighbour of neighborsOf(id)) {
        expect(neighborsOf(neighbour)).toContain(id);
      }
    }
  });

  it("has no duplicates", () => {
    for (const id of ids) {
      const neighbours = neighborsOf(id);
      expect(new Set(neighbours).size).toBe(neighbours.length);
    }
  });

  it("keeps gate edges out of ring adjacency", () => {
    expect(gateBetween("outer-05", "middle-04")?.id).toBe("G1");
    expect(gateBetween("core-00", "inner-01")?.id).toBe("G5");
    expect(gateBetween("outer-00", "outer-01")).toBeUndefined();
  });
});

describe("connectivity", () => {
  it("reaches every node from the arrival gate", () => {
    for (const id of ids) {
      expect(distance("outer-02", id)).toBeLessThan(Number.POSITIVE_INFINITY);
    }
  });

  it("keeps the Command Center about nine steps away, not two", () => {
    const steps = distance("outer-02", "core-00");
    expect(steps).toBe(9);
  });

  it("keeps the arrival gate at least three steps from every gate mouth", () => {
    const mouths = BOARD.gates.map((gate) => gate.a).concat(BOARD.gates.map((gate) => gate.b));
    for (const mouth of mouths) {
      expect(distance("outer-02", mouth)).toBeGreaterThanOrEqual(2);
    }
    for (const gate of BOARD.gates.filter((gate) => gate.a.startsWith("outer"))) {
      expect(distance("outer-02", gate.a)).toBeGreaterThanOrEqual(3);
    }
  });
});
