import type { ColumnDef } from "@tanstack/solid-table";
import type { StudentDirectoryRow } from "@/lib/student-directory";
import type { useT } from "@/stores/preferences-context";

/**
 * The three identifying columns every teacher-facing tracking table opens with —
 * student number, name, class — so Yoklamalar, Sınav Notları and Pomodorolar
 * read the same row the same way. Each page appends its own columns after these.
 */
export function studentDirectoryColumns(t: ReturnType<typeof useT>): ColumnDef<StudentDirectoryRow>[] {
  return [
    {
      id: "studentNumber",
      // Sorts as text: the backend stores a free-text number, not an integer.
      accessorFn: (row) => row.person.student_number ?? "",
      header: t("roster.studentNumber"),
      meta: { headerClass: "w-32 min-w-32 whitespace-nowrap" },
      cell: (cell) => (
        <span class="tabular-nums text-muted-foreground">{cell.row.original.person.student_number || "—"}</span>
      ),
    },
    {
      id: "student",
      accessorFn: (row) => row.person.display_name || row.person.username,
      header: t("roster.name"),
      cell: (cell) => <span class="font-medium">{cell.row.original.person.display_name || t("exams.nameless")}</span>,
    },
    {
      id: "class",
      accessorFn: (row) => row.classes.map((cls) => cls.name).join(", "),
      header: t("roster.studentClass"),
      cell: (cell) => <span>{cell.row.original.classes.map((cls) => cls.name).join(", ") || "—"}</span>,
    },
  ];
}
