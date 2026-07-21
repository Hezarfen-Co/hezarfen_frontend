import type { PersonRef } from "@/api/client";

export type PersonLike = PersonRef | string | null | undefined;

export function personId(person: PersonLike): string {
  if (!person) return "";
  return typeof person === "string" ? person : person.id;
}

export function personLabel(person: PersonLike): string {
  if (!person) return "—";
  if (typeof person === "string") return person;
  return person.display_name || person.username || person.id;
}

export function personLabelWithId(person: PersonLike): string {
  if (!person) return "—";
  if (typeof person === "string") return person;
  return `${personLabel(person)} - ${person.id}`;
}
