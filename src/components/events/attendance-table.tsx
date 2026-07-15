import { For, Show, createSignal } from "solid-js";
import type { Attendance } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableFrame } from "@/components/ui/data-table";
import { IconTrash } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { personId, personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export function AttendanceTable(props: {
  rows: Attendance[];
  emptyLabel?: string;
  canRemove?: boolean;
  onRemove?: (userId: string) => Promise<void>;
}) {
  const t = useT();
  const [targetUser, setTargetUser] = createSignal<string | null>(null);

  return (
    <>
      <Show
        when={props.rows.length > 0}
        fallback={
          <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {props.emptyLabel ?? t("events.noAttendance")}
          </p>
        }
      >
        <DataTableFrame>
          <Table class="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t("events.userId")}</TableHead>
                <TableHead>{t("events.status")}</TableHead>
                <TableHead>{t("events.markedBy")}</TableHead>
                <Show when={props.canRemove}>
                  <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                </Show>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.rows}>
                {(row) => (
                  <TableRow>
                    <TableCell class="font-medium">{personLabel(row.user)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" class="rounded-sm capitalize">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-sm text-muted-foreground">{personLabel(row.marked_by)}</TableCell>
                    <Show when={props.canRemove && props.onRemove}>
                      <TableCell class="px-1 text-center">
                        <TableRowActions
                          label={t("common.actions")}
                          actions={[
                            {
                              label: t("common.remove"),
                              icon: <IconTrash class="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => setTargetUser(personId(row.user)),
                            },
                          ]}
                        />
                      </TableCell>
                    </Show>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </DataTableFrame>
      </Show>

      <ConfirmDialog
        open={targetUser() != null}
        onOpenChange={(open) => {
          if (!open) setTargetUser(null);
        }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("confirm.removeAttendance", { user: targetUser() ?? "" })}
        onConfirm={async () => {
          const userId = targetUser();
          if (!userId) return;
          await props.onRemove?.(userId);
          setTargetUser(null);
        }}
      />
    </>
  );
}
