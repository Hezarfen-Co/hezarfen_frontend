import type { Appointment, PersonRef } from "@/api/client";

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

// Every appointment listing is scoped to the viewer (`list_for_requester` /
// `list_for_teacher`), so one of the two sides is always the viewer themselves.
// Show the OTHER person, or the row reads "Ali" to Ali.
export function appointmentCounterpart(a: Appointment, viewerId: string | undefined): string {
  return personLabel(a.requester.id === viewerId ? a.teacher ?? a.requester : a.requester);
}

export function personLabelWithId(person: PersonLike): string {
  if (!person) return "—";
  if (typeof person === "string") return person;
  return `${personLabel(person)} - ${person.id}`;
}
