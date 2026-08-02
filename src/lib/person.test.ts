import { personInitials } from "@/lib/person";

test("builds locale-aware initials from a display name", () => {
  expect(personInitials("ışık yıldız")).toBe("IY");
  expect(personInitials("ışık")).toBe("IŞ");
});

test("uses a consistent fallback for empty names", () => {
  expect(personInitials("   ")).toBe("?");
  expect(personInitials(undefined, "H")).toBe("H");
});
