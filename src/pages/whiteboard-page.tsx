import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import {
  deleteBoardById,
  getBoardEpochs,
  getBoardHistory,
  getBoardById,
  patchBoardById,
  postBoardClear,
  postBoardClose,
} from "@/api/boards";
import { getUsers } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { WhiteboardRoom, type BoardLiveState } from "@/components/whiteboard/whiteboard-room-ws";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DrawingPlayback } from "@/components/ui/drawing-playback";
import { IconChevronLeft, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { reassembleStrokes } from "@/lib/board-stroke-codec";
import { strokesBounds, type DrawScene } from "@/lib/draw-stroke";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function WhiteboardPage() {
  return (
    <RouteGuard minRole="student">
      <WhiteboardContent />
    </RouteGuard>
  );
}

const EXPORT_MARGIN = 8;

// Build a replayable scene from a set of reassembled strokes (an epoch's marks),
// shifted into a tight box like the drawing export pipeline.
function strokesToScene(strokes: DrawScene["strokes"]): DrawScene | null {
  const b = strokesBounds(strokes);
  if (!b) return null;
  const w = Math.ceil(b.w + EXPORT_MARGIN * 2);
  const h = Math.ceil(b.h + EXPORT_MARGIN * 2);
  const dx = EXPORT_MARGIN - b.x;
  const dy = EXPORT_MARGIN - b.y;
  const shifted = strokes.map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }));
  return { v: 1, w, h, strokes: shifted, bg: "grid" };
}

function WhiteboardContent() {
  const t = useT();
  const { locale } = usePreferences();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const id = createMemo((prev: string) => {
    const match = /^\/whiteboards\/([^/]+)$/.exec(location().pathname);
    return match ? decodeURIComponent(match[1]) : prev;
  }, "");

  const [board] = createResource(id, (boardId) => getBoardById(boardId));
  const [users] = createResource(async () => {
    try {
      return (await getUsers({ limit: 500 })).items;
    } catch {
      return [];
    }
  });

  // Live board state, seeded from the REST read and updated by the room's socket.
  const [live, setLive] = createSignal<BoardLiveState>({});
  createEffect(() => {
    const b = board();
    if (b) {
      setLive({
        locked: b.locked,
        closed: b.closed_at != null,
        creator: b.creator,
        participants: b.participants,
        epoch: b.epoch,
      });
    }
  });
  const mergeLive = (patch: BoardLiveState) => setLive((prev) => ({ ...prev, ...patch }));

  const meId = () => auth.user()?.id ?? "";
  const isCreator = () => live().creator === meId();
  const locked = () => live().locked ?? false;
  const closed = () => live().closed ?? false;

  const nameOf = (userId: string) => {
    const u = (users() ?? []).find((x) => x.id === userId);
    if (!u) return userId;
    return [u.name, u.surname].filter(Boolean).join(" ") || u.username;
  };
  const roleOf = (userId: string) => {
    const u = (users() ?? []).find((x) => x.id === userId);
    return u ? t(`role.${u.role}` as MessageKey) : "";
  };
  const roster = () => {
    const creator = live().creator;
    const parts = live().participants ?? [];
    return creator ? [creator, ...parts] : parts;
  };

  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [clearOpen, setClearOpen] = createSignal(false);
  const [closeOpen, setCloseOpen] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [historyOpen, setHistoryOpen] = createSignal(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = () =>
    run(async () => {
      const next = !locked();
      await patchBoardById(id(), { locked: next });
      mergeLive({ locked: next });
    });
  const doClear = () => run(async () => void (await postBoardClear(id())));
  const doClose = () =>
    run(async () => {
      await postBoardClose(id());
      mergeLive({ closed: true });
    });
  const doDelete = () =>
    run(async () => {
      await deleteBoardById(id());
      navigate({ to: "/whiteboards" });
    });

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={board()?.id === id() ? board() : undefined}
        fallback={
          <Show when={board.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{t("whiteboard.notFound")}</Alert>
          </Show>
        }
      >
        {(b) => (
          <div class="space-y-4">
            <PageHeader
              compact
              title={b().title}
              actions={
                <div class="flex flex-wrap items-center gap-1.5">
                  <Button type="button" variant="ghost" size="sm" onClick={() => navigate({ to: "/whiteboards" })}>
                    <IconChevronLeft class="h-4 w-4" />
                    {t("common.back")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                    {t("whiteboard.history")}
                  </Button>
                  <Show when={isCreator() && !closed()}>
                    <Button type="button" variant="outline" size="sm" disabled={busy()} onClick={() => void toggleLock()}>
                      {locked() ? t("whiteboard.unlock") : t("whiteboard.lock")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy()} onClick={() => setClearOpen(true)}>
                      {t("whiteboard.clear")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy()} onClick={() => setCloseOpen(true)}>
                      {t("whiteboard.close")}
                    </Button>
                  </Show>
                  <Show when={isCreator()}>
                    <Button type="button" variant="outline" size="sm" class="text-destructive" disabled={busy()} onClick={() => setDeleteOpen(true)}>
                      <IconTrash class="h-4 w-4" />
                      {t("whiteboard.delete")}
                    </Button>
                  </Show>
                </div>
              }
            />

            <Show when={error()}>
              <Alert variant="destructive">{error()}</Alert>
            </Show>

            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
              <WhiteboardRoom
                board={b()}
                meId={meId()}
                onState={mergeLive}
                onDeleted={() => navigate({ to: "/whiteboards" })}
              />
              <aside class="space-y-2 rounded-xl border bg-card p-3">
                <h3 class="text-sm font-semibold">{t("whiteboard.roster")}</h3>
                <ul class="space-y-1">
                  <For each={roster()}>
                    {(userId) => (
                      <li class="flex items-center justify-between gap-2 text-sm">
                        <span class="flex min-w-0 items-center gap-1.5">
                          <span class="truncate">{nameOf(userId)}</span>
                          <Show when={userId === live().creator}>
                            <Badge variant="outline" class="rounded-full text-[10px]">{t("whiteboard.creator")}</Badge>
                          </Show>
                        </span>
                        <span class="shrink-0 text-xs text-muted-foreground">{roleOf(userId)}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </aside>
            </div>

            <HistoryPanel open={historyOpen()} onOpenChange={setHistoryOpen} boardId={id()} />

            <ConfirmDialog
              open={clearOpen()}
              onOpenChange={setClearOpen}
              title={t("whiteboard.clear")}
              description={t("whiteboard.clearConfirm")}
              summary={b().title}
              onConfirm={doClear}
            />
            <ConfirmDialog
              open={closeOpen()}
              onOpenChange={setCloseOpen}
              variant="destructive"
              title={t("whiteboard.close")}
              description={t("whiteboard.closeConfirm")}
              summary={b().title}
              onConfirm={doClose}
            />
            <ConfirmDialog
              open={deleteOpen()}
              onOpenChange={setDeleteOpen}
              variant="destructive"
              title={t("whiteboard.delete")}
              description={t("whiteboard.deleteConfirm")}
              summary={b().title}
              onConfirm={doDelete}
            />
          </div>
        )}
      </Show>
    </Suspense>
  );
}

function HistoryPanel(props: { open: boolean; onOpenChange: (open: boolean) => void; boardId: string }) {
  const t = useT();
  const { locale } = usePreferences();
  const [selectedEpoch, setSelectedEpoch] = createSignal<number | null>(null);

  // Only fetch the epoch index while the panel is open.
  const [epochs] = createResource(
    () => (props.open ? props.boardId : null),
    async (boardId) => (await getBoardEpochs(boardId, { limit: 100 })).items,
  );

  const [scene] = createResource(
    () => (selectedEpoch() != null ? { boardId: props.boardId, epoch: selectedEpoch()! } : null),
    async (arg) => {
      const page = await getBoardHistory(arg.boardId, { epoch: arg.epoch, limit: 500 });
      const strokes = reassembleStrokes(page.items.filter((r) => r.kind === "stroke").map((r) => r.payload));
      return strokesToScene(strokes);
    },
  );

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("whiteboard.history")} size="wide">
      <div class="space-y-4">
        <Suspense fallback={<PageSpinner />}>
          <Show
            when={(epochs() ?? []).length > 0}
            fallback={<p class="text-sm text-muted-foreground">{t("whiteboard.noHistory")}</p>}
          >
            <div class="flex flex-wrap gap-2">
              <For each={epochs()}>
                {(marker) => (
                  <Button
                    type="button"
                    variant={selectedEpoch() === marker.epoch ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEpoch(marker.epoch)}
                  >
                    {t("whiteboard.replaySession")} {marker.epoch}
                    <span class="ml-1 text-xs text-muted-foreground">· {formatDateTime(marker.created_at, locale())}</span>
                  </Button>
                )}
              </For>
            </div>
          </Show>
        </Suspense>

        <Show when={selectedEpoch() != null}>
          <Suspense fallback={<PageSpinner />}>
            <Show when={scene()} fallback={<p class="text-sm text-muted-foreground">{t("whiteboard.noHistory")}</p>}>
              {(s) => <DrawingPlayback scene={s()} />}
            </Show>
          </Suspense>
        </Show>
      </div>
    </SidePanel>
  );
}
