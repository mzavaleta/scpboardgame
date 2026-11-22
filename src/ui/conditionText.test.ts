/**
 * A3 — the private checklist has to be legible and live.
 *
 * The win rule still reads `condition`; these tests pin the display half: every
 * directive has steps, and a step's line reports the real count.
 */

import { describe, expect, it } from "vitest";
import { MAIN_DIRECTIVES } from "../content/directives";
import { createGame } from "../engine/reduce";
import { seatsFor } from "../engine/types";
import { stepText } from "./conditionText";

describe("directive steps", () => {
  it("gives every directive at least one step", () => {
    for (const directive of MAIN_DIRECTIVES) {
      expect(directive.steps.length).toBeGreaterThan(0);
      expect(directive.steps.length).toBeLessThanOrEqual(3);
    }
  });

  it("reports the count and the state", () => {
    const base = createGame(1, seatsFor(2));
    const player = base.players.p1!;
    const state = {
      ...base,
      players: { ...base.players, p1: { ...player, counters: { ...player.counters, containments: 2 } } },
    };

    const met = stepText(state, "p1", { kind: "containments", atLeast: 2 }, "en");
    expect(met.done).toBe(true);
    expect(met.text).toBe("Containments 2/2");

    const unmet = stepText(state, "p1", { kind: "containments", atLeast: 3 }, "en");
    expect(unmet.done).toBe(false);
    expect(unmet.text).toBe("Containments 2/3");
  });

  it("answers in the requested language", () => {
    const base = createGame(1, seatsFor(2));
    expect(stepText(base, "p1", { kind: "fullIntegrity" }, "es").text).toMatch(/Integridad/);
  });
});
