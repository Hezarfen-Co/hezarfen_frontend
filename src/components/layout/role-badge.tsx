import type { Role } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

// A role is an identity, not a status, so it reads as a tinted pill with a
// leading dot rather than borrowing the semantic success/destructive variants —
// an admin is not an error. Ranked warm-to-cool from most to least privileged.
const TONE: Record<Role, string> = {
  parent: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  student: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  teacher: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  manager: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  admin: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
};

const DOT: Record<Role, string> = {
  parent: "bg-sky-500",
  student: "bg-emerald-500",
  teacher: "bg-violet-500",
  manager: "bg-amber-500",
  admin: "bg-rose-500",
};

export function RoleBadge(props: { role: Role; class?: string }) {
  const t = useT();
  return (
    <span
      class={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE[props.role],
        props.class,
      )}
    >
      <span class={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[props.role])} />
      {t(`role.${props.role}` as MessageKey)}
    </span>
  );
}
