/**
 * The rules page is content, but it must not lie about the build.
 *
 * These tests pin the two things that can rot silently: a half-translated
 * section (the page is read by players, not only by the designer) and a number
 * that was typed by hand instead of read from `TUNING`.
 */

import { describe, expect, it } from "vitest";
import { TUNING } from "../config/tuning";
import { BOARD } from "./board";
import { RULE_SECTIONS } from "./rules";

describe("the rules page", () => {
  it("answers every section in both languages", () => {
    for (const section of RULE_SECTIONS) {
      expect(section.title.en.trim().length).toBeGreaterThan(0);
      expect(section.title.es.trim().length).toBeGreaterThan(0);
      expect(section.body.length).toBeGreaterThan(0);
      for (const line of section.body) {
        expect(line.en.trim().length).toBeGreaterThan(20);
        expect(line.es.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("leaves no template placeholder in the prose", () => {
    for (const section of RULE_SECTIONS) {
      for (const line of [...section.body, section.title]) {
        expect(line.en).not.toMatch(/\{[a-z]+\}/);
        expect(line.es).not.toMatch(/\{[a-z]+\}/);
      }
    }
  });

  it("reads the live dials instead of copying them", () => {
    const all = RULE_SECTIONS.flatMap((section) => section.body.map((line) => line.en)).join("\n");
    expect(all).toContain(`0 to ${TUNING.threat.max}`);
    expect(all).toContain(`${TUNING.threat.warheadCountdown} rounds later`);
    expect(all).toContain(`difficulty ${TUNING.protocol.difficulty}`);
    expect(all).toContain(`Safe ${TUNING.rewards.safe}`);
    expect(all).toContain(`${TUNING.equipment.slots} items`);
  });

  it("names every gate the board actually has", () => {
    const gates = RULE_SECTIONS.find((section) => section.id === "gates")!;
    const text = gates.body.map((line) => line.en).join(" ");
    for (const gate of BOARD.gates) expect(text).toContain(gate.id);
  });
});
