import { For, Show, createSignal } from "solid-js";
import type { Attendance } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconTrash } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
        <div class="overflow-hidden rounded-lg border border-border/70 bg-background/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("events.userId")}</TableHead>
                <TableHead>{t("events.status")}</TableHead>
                <TableHead>{t("events.markedBy")}</TableHead>
                <Show when={props.canRemove}>
                  <TableHead class="w-28" />
                </Show>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.rows}>
                {(row) => (
                  <TableRow class="h-12">
                    <TableCell class="font-mono text-xs">{row.user}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" class="capitalize">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell class="font-mono text-xs">{row.marked_by}</TableCell>
                    <Show when={props.canRemove && props.onRemove}>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setTargetUser(row.user)}
                        >
                          <IconTrash class="h-4 w-4" />
                          {t("common.remove")}
                        </Button>
                      </TableCell>
                    </Show>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </div>
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
