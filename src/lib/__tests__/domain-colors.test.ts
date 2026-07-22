import { describe, expect, it } from "vitest";
import { DOMAIN_COLORS, type DomainKind } from "../domain-colors";

describe("domain-colors", () => {
  it("defines shared color definitions for all domain kinds", () => {
    const kinds: DomainKind[] = ["notes", "messages", "events", "exams", "courses", "marks", "attendance"];
    for (const kind of kinds) {
      const def = DOMAIN_COLORS[kind];
      expect(def).toBeDefined();
      expect(def.accent).toBeTruthy();
      expect(def.badgeClass).toContain("border");
      expect(def.borderClass).toContain("border");
      expect(def.cardBorderClass).toContain("border");
      expect(def.iconOutlineClass).toContain("border");
    }
  });

  it("notes uses amber accent and messages uses violet accent", () => {
    expect(DOMAIN_COLORS.notes.accent).toBe("amber");
    expect(DOMAIN_COLORS.messages.accent).toBe("violet");
    expect(DOMAIN_COLORS.exams.accent).toBe("rose");
    expect(DOMAIN_COLORS.events.accent).toBe("emerald");
  });
});
