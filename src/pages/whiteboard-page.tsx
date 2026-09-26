import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import {
  deleteBoardById,
  getBoardEpochs,
  getBoardHistory,
  getBoardById,
  patchBoardById,
  postBoardClear,
  postBoardClose,
} from "@/api/boards";
import { getUserProfile, getUsers } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { WhiteboardRoom, type BoardLiveState } from "@/components/whiteboard/whiteboard-room-ws";
import { BoardSettingsPanel } from "@/components/whiteboard/board-settings-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DrawingPlayback } from "@/components/ui/drawing-playback";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  IconChevronLeft,
  IconEraser,
  IconLock,
  IconMenu,
  IconRotateCcw,
  IconSettings,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { reassembleStrokes } from "@/lib/board-stroke-codec";
import { strokesBounds, type DrawScene } from "@/lib/draw-stroke";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
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
// Same island look as the canvas's own tool island.
const CORNER_ISLAND = "rounded-lg border border-border/70 bg-card shadow-[0_1px_4px_rgb(0_0_0/0.08)]";
const CORNER_BUTTON = cn(
  CORNER_ISLAND,
  "inline-flex h-10 w-10 items-center justify-center text-foreground/80 outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-expanded:bg-primary/15 data-expanded:text-primary-text",
);

/** A soft per-person colour, stable for an id, like Excalidraw's collaborator chips. */
function avatarStyle(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return { "background-color": `hsl(${hue} 70% 86%)`, color: `hsl(${hue} 45% 26%)` };
}

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
  // `GET /users` is admin-only, so only an admin can resolve the roster's ids
  // to names — every other role would just 403 the moment this page mounts.
  // Gate the call by role: below admin it is never sent, and names fall back to
  // the id (with the current user resolved from their own auth record below).
  const isAdmin = () => hasMinRole(auth.user()?.role, "admin");
  const [users] = createResource(
    () => (isAdmin() ? "admin" : null),
    async () => {
      try {
        return (await getUsers({ limit: 500 })).items;
      } catch {
        return [];
      }
    },
  );

  // Live board state, seeded from the REST read and updated by the room's socket.
  const [live, setLive] = createSignal<BoardLiveState>({});
  const [boardTitle, setBoardTitle] = createSignal("");
  const [connection, setConnection] = createSignal<"connecting" | "connected" | "disconnected">("connecting");
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
      setBoardTitle(b.title);
    }
  });
  const mergeLive = (patch: BoardLiveState) => setLive((prev) => ({ ...prev, ...patch }));

  const meId = () => auth.user()?.id ?? "";
  const isCreator = () => live().creator === meId();
  const locked = () => live().locked ?? false;
  const closed = () => live().closed ?? false;

  const nameOf = (userId: string) => {
    // The current user is always resolvable from their own auth record, even
    // when the admin-only roster lookup didn't run.
    if (userId === meId()) {
      const me = auth.user();
      if (me) return [me.name, me.surname].filter(Boolean).join(" ") || me.username;
    }
    const u = (users() ?? []).find((x) => x.id === userId);
    if (!u) return profiles.latest?.get(userId)?.name ?? userId;
    return [u.name, u.surname].filter(Boolean).join(" ") || u.username;
  };
  const roleOf = (userId: string) => {
    const u = (users() ?? []).find((x) => x.id === userId);
    const role = u?.role ?? profiles.latest?.get(userId)?.role ?? (userId === meId() ? auth.user()?.role : undefined);
    return role ? t(`role.${role}` as MessageKey) : "";
  };
  const roster = () => {
    const creator = live().creator;
    const parts = live().participants ?? [];
    return creator ? [creator, ...parts] : parts;
  };
  const isParticipant = () => roster().includes(meId());

  // Below admin, resolve each roster id through its public profile — any
  // signed-in account may read one (a parent only their linked students; the
  // rest 403 and keep the id). The roster is small and capped by the backend.
  const [profiles] = createResource(
    () => (isAdmin() ? null : roster().filter((userId) => userId !== meId()).sort().join(",") || null),
    async (key) => {
      const entries = await Promise.all(
        key.split(",").map(async (userId) => {
          try {
            const p = await getUserProfile(userId);
            return [userId, { name: p.display_name || p.username, role: p.role }] as const;
          } catch {
            return null;
          }
        }),
      );
      return new Map(entries.filter((entry) => entry !== null));
    },
  );


  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [clearOpen, setClearOpen] = createSignal(false);
  const [closeOpen, setCloseOpen] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [historyOpen, setHistoryOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);

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

  const updateBoard = async (body: { title?: string; participants?: string[] }) => {
    setBusy(true);
    setError("");
    try {
      const updated = await patchBoardById(id(), body);
      setBoardTitle(updated.title);
      mergeLive({ creator: updated.creator, participants: updated.participants, locked: updated.locked, closed: updated.closed_at != null, epoch: updated.epoch });
    } catch (err) {
      setError(formatApiError(err, locale()));
      throw err;
    } finally {
      setBusy(false);
    }
  };

  // One status line on the canvas, most important first; an action error
  // outranks all of them.
  const banner = () => {
    if (error()) return error();
    if (closed()) return t("whiteboard.closedBanner");
    if (locked()) return t("whiteboard.lockedBanner");
    if (!isParticipant()) return t("whiteboard.readOnlyBanner");
    if (connection() === "disconnected") return t("ws.disconnected");
    return "";
  };

  const initialOf = (userId: string) => nameOf(userId).slice(0, 1).toLocaleUpperCase(locale());

  const BoardMenu = () => (
    <>
      <DropdownMenu placement="bottom-start" gutter={8}>
        <DropdownMenuTrigger class={CORNER_BUTTON} aria-label={t("whiteboard.menu")} title={t("whiteboard.menu")}>
          <IconMenu class="h-4.5 w-4.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56">
          <DropdownMenuItem onSelect={() => navigate({ to: "/whiteboards" })}>
            <IconChevronLeft class="h-4 w-4" />
            {t("whiteboard.back")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setTimeout(() => setHistoryOpen(true), 0)}>
            <IconRotateCcw class="h-4 w-4" />
            {t("whiteboard.history")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTimeout(() => setSettingsOpen(true), 0)}>
            <IconSettings class="h-4 w-4" />
            {t("whiteboard.edit")}
          </DropdownMenuItem>
          <Show when={isCreator() && !closed()}>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={busy()} onSelect={() => void toggleLock()}>
              <IconLock class="h-4 w-4" />
              {locked() ? t("whiteboard.unlock") : t("whiteboard.lock")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy()} onSelect={() => setTimeout(() => setClearOpen(true), 0)}>
              <IconEraser class="h-4 w-4" />
              {t("whiteboard.clear")}
            </DropdownMenuItem>
            <DropdownMenuItem
              class="text-warning-text focus:bg-warning/10 focus:text-warning-text data-highlighted:bg-warning/10 data-highlighted:text-warning-text"
              disabled={busy()}
              onSelect={() => setTimeout(() => setCloseOpen(true), 0)}
            >
              <IconLock class="h-4 w-4" />
              {t("whiteboard.close")}
            </DropdownMenuItem>
          </Show>
          <Show when={isCreator()}>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive disabled={busy()} onSelect={() => setTimeout(() => setDeleteOpen(true), 0)}>
              <IconTrash class="h-4 w-4" />
              {t("whiteboard.delete")}
            </DropdownMenuItem>
          </Show>
        </DropdownMenuContent>
      </DropdownMenu>
      <span class="hidden min-w-0 truncate rounded-md bg-card/80 px-2 py-1 text-sm font-semibold text-text-strong backdrop-blur-xs sm:block" title={boardTitle()}>
        {boardTitle()}
      </span>
    </>
  );

  const BoardPresence = () => (
    <>
      <Popover placement="bottom-end" gutter={8}>
        <PopoverTrigger
          class={cn(CORNER_ISLAND, "flex h-10 items-center gap-2 pl-1.5 pr-2.5 outline-hidden focus-visible:ring-2 focus-visible:ring-ring")}
          aria-label={`${t("whiteboard.roster")}: ${roster().length}`}
          title={t("whiteboard.roster")}
        >
          <span class="flex -space-x-2">
            <For each={roster().slice(0, 3)}>
              {(userId) => (
                <span
                  class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 ring-card"
                  style={avatarStyle(userId)}
                  aria-hidden="true"
                >
                  {initialOf(userId)}
                </span>
              )}
            </For>
          </span>
          <Show when={roster().length > 3}>
            <span class="text-xs font-semibold text-muted-foreground">+{roster().length - 3}</span>
          </Show>
          <span class={cn("h-2 w-2 rounded-full", connection() === "connected" ? "bg-success" : "bg-warning")} aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent class="w-72 p-0">
          <div class="flex items-center justify-between gap-2 border-b border-border-hairline px-4 py-3">
            <h3 class="text-sm font-semibold text-text-strong">{t("whiteboard.roster")}</h3>
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span class={cn("h-2 w-2 rounded-full", connection() === "connected" ? "bg-success" : "bg-warning")} />
              {connection() === "connected" ? t("ws.connected") : connection() === "connecting" ? t("ws.connecting") : t("ws.disconnected")}
            </span>
          </div>
          <ul class="max-h-80 space-y-0.5 overflow-y-auto p-2">
            <For each={roster()}>
              {(userId) => (
                <li class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={avatarStyle(userId)}>
                    {initialOf(userId)}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="flex min-w-0 items-center gap-1.5">
                      <span class="truncate text-sm font-medium">{nameOf(userId)}</span>
                      <Show when={userId === meId()}>
                        <span class="shrink-0 text-xs text-muted-foreground">({t("whiteboard.you")})</span>
                      </Show>
                      <Show when={userId === live().creator}>
                        <Badge variant="outline" class="shrink-0 text-[11px]">{t("whiteboard.creator")}</Badge>
                      </Show>
                    </span>
                    <span class="block truncate text-xs text-muted-foreground">{roleOf(userId) || userId}</span>
                  </span>
                  <Show when={isCreator() && !closed() && userId !== live().creator}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text"
                      disabled={busy()}
                      title={t("whiteboard.removeParticipant")}
                      aria-label={t("whiteboard.removeParticipant")}
                      onClick={() => void updateBoard({ participants: (live().participants ?? []).filter((id) => id !== userId) })}
                    >
                      <IconX class="h-4 w-4" />
                    </Button>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </PopoverContent>
      </Popover>
      <Show when={isCreator() && !closed()}>
        <button
          type="button"
          class={cn(CORNER_BUTTON, locked() && "border-warning/50 bg-warning/15 text-warning-text hover:bg-warning/20")}
          disabled={busy()}
          aria-pressed={locked()}
          aria-label={locked() ? t("whiteboard.unlock") : t("whiteboard.lock")}
          title={locked() ? t("whiteboard.unlock") : t("whiteboard.lock")}
          onClick={() => void toggleLock()}
        >
          <IconLock class="h-4.5 w-4.5" />
        </button>
        <Button type="button" size="sm" class="hidden h-10 rounded-lg px-4 sm:inline-flex" onClick={() => setSettingsOpen(true)}>
          {t("whiteboard.inviteAction")}
        </Button>
      </Show>
    </>
  );

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
          // Edge to edge over the content column's padding, like Excalidraw
          // owning the viewport; the height leaves room for the shell header
          // (desktop) or the tab bar (phone).
          <div class="-mx-4 -mt-6 sm:-mx-6 lg:-mx-10 lg:-mb-6">
            <h1 class="sr-only">{boardTitle()}</h1>
            <WhiteboardRoom
              board={b()}
              meId={meId()}
              class="h-[calc(100dvh-3.5rem-max(env(safe-area-inset-bottom),var(--android-nav-inset,0px)))] min-h-96 lg:h-[calc(100dvh-49px-env(safe-area-inset-top))]"
              topLeft={<BoardMenu />}
              topRight={<BoardPresence />}
              banner={banner()}
              bannerTone={error() ? "error" : "info"}
              onState={mergeLive}
              onConnectionChange={setConnection}
              onDeleted={() => navigate({ to: "/whiteboards" })}
            />

            <BoardSettingsPanel
              open={settingsOpen()}
              onOpenChange={setSettingsOpen}
              boardId={id}
              title={boardTitle}
              participants={roster}
              creatorId={() => live().creator ?? ""}
              canManageParticipants={() => isCreator() && !closed()}
              canSearchPeople={() => hasMinRole(auth.user()?.role, "teacher")}
              nameOf={nameOf}
              roleOf={roleOf}
              onTitleSave={(title) => updateBoard({ title })}
              onParticipantsSave={(participants) => updateBoard({ participants: participants.filter((participant) => participant !== live().creator) })}
              // Merge in place rather than refetching the board resource, which
              // would re-suspend the page; the socket's `participants` frame
              // re-syncs anyway, this just avoids waiting on it.
              onInvited={(board) => mergeLive({ creator: board.creator, participants: board.participants })}
            />

            <HistoryPanel open={historyOpen()} onOpenChange={setHistoryOpen} boardId={id()} />

            <ConfirmDialog
              open={clearOpen()}
              onOpenChange={setClearOpen}
              title={t("whiteboard.clear")}
              description={t("whiteboard.clearConfirm")}
              summary={b().title}
              confirmLabel={t("whiteboard.clear")}
              onConfirm={doClear}
            />
            <ConfirmDialog
              open={closeOpen()}
              onOpenChange={setCloseOpen}
              variant="destructive"
              title={t("whiteboard.close")}
              description={t("whiteboard.closeConfirm")}
              summary={b().title}
              confirmLabel={t("whiteboard.close")}
              icon={<IconLock class="h-4 w-4" />}
              iconClass="border-warning/40 bg-warning/10 text-warning-text"
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
