/**
 * The chrome dictionary (§S12): every key exists in both languages, the
 * pseudo-locale really is different, and interpolation is not a template engine.
 */

import { describe, expect, it } from "vitest";
import { DICTIONARY_KEYS, localized, t } from "./index";

describe("the UI dictionary", () => {
  it("answers every key in both languages, non-empty", () => {
    for (const key of DICTIONARY_KEYS) {
      expect(t("en", key).trim().length).toBeGreaterThan(0);
      expect(t("es", key).trim().length).toBeGreaterThan(0);
    }
  });

  it("translates the load-bearing chrome", () => {
    expect(t("es", "rollMovement")).not.toBe(t("en", "rollMovement"));
    expect(t("es", "directive")).not.toBe(t("en", "directive"));
    expect(t("es", "threat")).not.toBe(t("en", "threat"));
  });

  it("fills variables instead of printing the braces", () => {
    expect(t("en", "passTo", { seat: "P2" })).toContain("P2");
    expect(t("en", "passTo", { seat: "P2" })).not.toContain("{seat}");
    expect(t("es", "contain", { records: 3 })).toContain("3");
  });

  it("brackets every pseudo string, so an untranslated literal is visible", () => {
    for (const key of DICTIONARY_KEYS) {
      expect(t("pseudo", key)).toContain("⟦");
      expect(t("pseudo", key)).toContain("⟧");
      expect(t("pseudo", key)).not.toBe(t("en", key));
    }
  });

  it("keeps placeholder braces intact so the pseudo-locale still interpolates", () => {
    // The pseudo transform used to transliterate inside `{var}`, and `t()`
    // never matched the mangled brace — the UI printed `{gate}` raw.
    const seal = t("pseudo", "gateTipSealed", { gate: "G1", condition: "locked", difficulty: 2, round: 7 });
    expect(seal).toContain("G1");
    expect(seal).toContain("7");
    expect(seal).not.toContain("{");
  });

  it("reads content in the requested locale, and falls back to EN for pseudo", () => {
    const value = { en: "Command Center", es: "Centro de Mando" };
    expect(localized(value, "en")).toBe("Command Center");
    expect(localized(value, "es")).toBe("Centro de Mando");
    expect(localized(value, "pseudo")).toBe("Command Center");
  });
});
