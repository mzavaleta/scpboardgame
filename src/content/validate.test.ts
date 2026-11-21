/**
 * §S8.3's gate, tested. The validator is only useful if it is green on the
 * shipped content and red on a real defect, so both directions are pinned.
 */

import { describe, expect, it } from "vitest";
import { summarize, validateContent } from "./validate";

describe("the content gate", () => {
  it("passes the shipped content with no errors", () => {
    const issues = validateContent();
    expect(summarize(issues).errors).toBe(0);
  });

  it("reports the attribution debt as warnings before release", () => {
    const issues = validateContent();
    const pending = issues.filter((issue) => issue.message.includes("PENDING"));
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((issue) => issue.level === "warning")).toBe(true);
  });

  it("turns the same debt into a release failure", () => {
    const issues = validateContent({ release: true });
    const pending = issues.filter((issue) => issue.message.includes("PENDING"));
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((issue) => issue.level === "error")).toBe(true);
  });

  it("checks the rules a playtest would otherwise discover", () => {
    const issues = validateContent();
    const checks = new Set(issues.map((issue) => issue.check));
    // Even when clean, the gate has to have looked at these families.
    expect(issues.length).toBeGreaterThan(0);
    expect(checks.has("attribution")).toBe(true);
  });
});
