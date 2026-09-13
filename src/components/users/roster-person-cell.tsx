import type { PersonRef } from "@/api/client";
import { UserAvatar } from "@/components/users/user-avatar";
import { personLabel } from "@/lib/person";

/** Avatar initials, display name and @username — the first column of the ADM-02/ADM-08 rosters. */
export function RosterPersonCell(props: { person: PersonRef }) {
  return (
    <div class="flex min-w-0 items-center gap-2.5">
      <UserAvatar userId={props.person.id} name={personLabel(props.person)} hasAvatar={false} size="sm" />
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-text-strong">{personLabel(props.person)}</p>
        <p class="truncate text-xs text-text-subtle">@{props.person.username}</p>
      </div>
    </div>
  );
}
