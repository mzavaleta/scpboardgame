/**
 * The simulator's own contract (§S9.1, M3a).
 *
 * The instrument is only useful if it is reproducible: a report that changes
 * between runs cannot show a balance change. These tests pin that, plus the two
 * things M3a is allowed to claim (a turn cap, and the purchase contrast) and the
 * things it is explicitly *not* allowed to fake.
 */

import { describe, expect, it } from "vitest";
import { stableStringify } from "../engine/hash";
import { CONFIG_FINGERPRINT } from "../config/tuning";
import { playGame, runSimulation, toMarkdown } from "./run";
import type { SimOptions } from "./run";

const options: SimOptions = {
  games: 6,
  players: [2],
  policy: "mixed",
  seedBase: 7,
  maxRounds: 40,
};

describe("the simulator is an instrument, so it must be reproducible", () => {
  it("produces byte-identical reports for identical options", () => {
    const first = runSimulation(options);
    const second = runSimulation(options);

    expect(stableStringify(first)).toBe(stableStringify(second));
  });

  it("produces a different report for a different seed base", () => {
    const first = runSimulation(options);
    const other = runSimulation({ ...options, seedBase: options.seedBase + 1000 });

    expect(stableStringify(first)).not.toBe(stableStringify(other));
  });

  it("counts every game it claims to have played", () => {
    const report = runSimulation({ ...options, players: [2, 3] });

    // two seat counts x two policies x six games
    expect(report.games).toBe(24);
    expect(report.rows).toHaveLength(4);
    expect(report.rows.every((row) => row.games === options.games)).toBe(true);
  });

  it("stamps the tuning fingerprint, so a report belongs to a config", () => {
    expect(runSimulation(options).config).toBe(CONFIG_FINGERPRINT);
  });
});

describe("what M3a is allowed to claim", () => {
  it("reports the turn cap honestly instead of inventing an ending", () => {
    const short = runSimulation({ ...options, maxRounds: 1 });

    expect(short.rows.every((row) => row.capHitShare === 1)).toBe(true);
    expect(short.rows.every((row) => row.roundsP50 === 1)).toBe(true);
  });

  it("plays the two strategies differently: one pays, one gambles", () => {
    const report = runSimulation({ ...options, games: 8 });
    const cautious = report.rows.find((row) => row.policy === "cautious");
    const aggressive = report.rows.find((row) => row.policy === "aggressive");

    expect(cautious?.purchasesPerGame).toBeGreaterThan(0);
    expect(aggressive?.purchasesPerGame).toBe(0);
    expect(aggressive?.recordsSpentPerGame).toBe(0);
  });

  it("reports the terminal it can measure and names the one it cannot", () => {
    const report = runSimulation(options);
    const markdown = toMarkdown(report);

    // The warhead is the only ending that exists, so every terminal is a detonation.
    expect(report.rows.every((row) => row.roundsToTerminalP50 >= 0)).toBe(true);
    expect(markdown).toMatch(/Detonated/);
    // The recontained terminal needs the protocol track, so it is declared missing
    // instead of reported as a zero.
    expect(Object.keys(report.notMeasured)).toContain("recontainedRate");
    expect(markdown).toMatch(/recontainedRate/);
  });

  it("stops a game when the warhead fires instead of playing to the cap", () => {
    const report = runSimulation({ ...options, games: 6, maxRounds: 40 });
    // With a working clock some games must end before the cap...
    expect(report.rows.some((row) => row.capHitShare < 1)).toBe(true);
  });
});

describe("one game in isolation", () => {
  it("ends at the cap with a round count the host can read", () => {
    const sample = playGame("cautious", 2, 42, 3);

    expect(sample.capHit).toBe(true);
    expect(sample.rounds).toBeLessThanOrEqual(3);
    expect(sample.players).toBe(2);
  });

  it("is a pure function of its seed", () => {
    expect(stableStringify(playGame("aggressive", 3, 99, 20))).toBe(
      stableStringify(playGame("aggressive", 3, 99, 20)),
    );
  });
});
