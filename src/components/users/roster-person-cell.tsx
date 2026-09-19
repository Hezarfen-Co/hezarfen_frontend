import type { PersonRef } from "@/api/client";
import { UserAvatar } from "@/components/users/user-avatar";

/** Avatar initials and display name — the first column of the student/teacher rosters. */
export function RosterPersonCell(props: { person: PersonRef }) {
  return (
    <div class="flex min-w-0 items-center gap-2.5">
      <UserAvatar userId={props.person.id} name={props.person.display_name || "?"} hasAvatar={false} size="sm" />
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-text-strong">{props.person.display_name || "—"}</p>
      </div>
    </div>
  );
}
