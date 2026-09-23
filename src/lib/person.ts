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

export function personInitials(value: string | null | undefined, fallback = "?"): string {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase("tr-TR");
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

// Every appointment listing is scoped to the viewer (`list_for_requester` /
// `list_for_teacher`), so one of the two sides is always the viewer themselves.
// Show the OTHER person, or the row reads "Ali" to Ali.
export function appointmentCounterpart(a: Appointment, viewerId: string | undefined): string {
  return personLabel(a.requester.id === viewerId ? a.teacher ?? a.requester : a.requester);
}

// Two students can share a name, so a picker adds the student number, else
// the username — never the raw id, which means nothing to a person reading it.
export function personPickerLabel(person: PersonLike): string {
  if (!person) return "—";
  if (typeof person === "string") return person;
  const label = personLabel(person);
  const handle = person.student_number?.trim() || person.username;
  return handle && handle !== label ? `${label} (${handle})` : label;
}
