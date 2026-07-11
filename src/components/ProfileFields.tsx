// The five personal-info inputs plus the FormData → ProfilePatch reader,
// shared by the self-service profile page and the admin per-user editor.
// Submitting sends every field: what an input holds is what the server keeps,
// and an emptied input clears the field (the backend's "" semantics).

import type { ProfilePatch } from "../lib/api";
import { today } from "../lib/format";
import { LIMITS, type User } from "../lib/types";

/** Matches the backend rule: optional leading +, separators, 7–15 digits. */
const PHONE_PATTERN = "\\+?(?:[\\s()-]*\\d){7,15}[\\s()-]*";

export function profilePatch(form: HTMLFormElement): ProfilePatch {
  const data = new FormData(form);
  return {
    name: String(data.get("name")),
    surname: String(data.get("surname")),
    email: String(data.get("email")),
    phone: String(data.get("phone")),
    birth_date: String(data.get("birth_date")),
  };
}

export function ProfileFields(props: { user: User }) {
  return (
    <>
      <div class="row">
        <label style={{ flex: 1 }}>
          Name
          <input name="name" value={props.user.name ?? ""} maxLength={LIMITS.personName} />
        </label>
        <label style={{ flex: 1 }}>
          Surname
          <input name="surname" value={props.user.surname ?? ""} maxLength={LIMITS.personName} />
        </label>
      </div>
      <label>
        Email
        <input
          name="email"
          type="email"
          value={props.user.email ?? ""}
          maxLength={LIMITS.email}
          placeholder="name@example.com"
        />
      </label>
      <div class="row">
        <label style={{ flex: 1 }}>
          Phone
          <input
            name="phone"
            type="tel"
            value={props.user.phone ?? ""}
            pattern={PHONE_PATTERN}
            title={`${LIMITS.phoneDigits.min} to ${LIMITS.phoneDigits.max} digits; +, spaces, dashes, and parentheses are allowed`}
            placeholder="+90 555 123 45 67"
          />
        </label>
        <label style={{ flex: 1 }}>
          Birth date
          <input
            name="birth_date"
            type="date"
            value={props.user.birth_date ?? ""}
            max={today()}
          />
        </label>
      </div>
    </>
  );
}
