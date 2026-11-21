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

  it("never reports a metric it cannot measure yet", () => {
    const report = runSimulation(options);
    const markdown = toMarkdown(report);

    expect(Object.keys(report.notMeasured)).toContain("roundsToTerminal");
    expect(markdown).toMatch(/Not measured yet/);
    expect(markdown).toMatch(/roundsToTerminal/);
    // No fabricated zero for a metric that needs a terminal state.
    expect(JSON.stringify(report.rows)).not.toMatch(/roundsToTerminal/);
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
