import { useNavigate } from "@tanstack/solid-router";
import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal, onCleanup } from "solid-js";
import { getBoards, postBoard, type Board } from "@/api/boards";
import { getUserSearch } from "@/api/users";
import { formatApiError, type PersonRef } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { DataSection } from "@/components/ui/data-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconPlus, IconX } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function WhiteboardsPage() {
  return (
    <RouteGuard minRole="student">
      <WhiteboardsContent />
    </RouteGuard>
  );
}

function WhiteboardsContent() {
  const t = useT();
  const { locale } = usePreferences();
  const auth = useAuth();
  const navigate = useNavigate();

  const PAGE_SIZE = 12;
  const [page, setPage] = createSignal(0);
  const [boards, { refetch }] = createResource(
    page,
    (pageIndex) => getBoards({ limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE }),
  );
  const [createOpen, setCreateOpen] = createSignal(false);
  const pageCount = createMemo(() => Math.max(1, Math.ceil((boards.latest?.total ?? 0) / PAGE_SIZE)));
  const [query, setQuery] = createSignal("");
  // The board list endpoint has no server-side text filter, so this narrows
  // only the current page's real titles — a client-side search over real
  // data, not a promise of searching every board the caller has ever opened.
  const visibleBoards = createMemo(() => {
    const q = query().trim().toLocaleLowerCase();
    const items = boards()?.items ?? [];
    return q ? items.filter((b) => b.title.toLocaleLowerCase().includes(q)) : items;
  });

  const meId = () => auth.user()?.id ?? "";

  return (
    <div class="space-y-5">
      <DataSection
        title={t("whiteboard.title")}
        description={t("whiteboard.subtitle")}
        actions={
          <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreateOpen(true)}>
            <IconPlus class="h-4 w-4" />
            {t("whiteboard.create")}
          </Button>
        }
      >
        <Suspense fallback={<PageSpinner />}>
          <Show when={boards.error}>
            <ErrorAlert message={formatApiError(boards.error, locale())} />
          </Show>
          <Show
            when={(boards()?.items ?? []).length > 0}
            fallback={<EmptyState kind="whiteboard" title={t("whiteboard.empty")} description={t("whiteboard.subtitle")} />}
          >
            <div class="space-y-4">
              <Input
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
                placeholder={t("whiteboard.searchPlaceholder")}
                class="h-8 max-w-sm rounded-lg text-[13px]"
              />
              <Show when={visibleBoards().length > 0} fallback={<EmptyState kind="search" title={t("common.noResults")} />}>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <For each={visibleBoards()}>
                    {(board) => (
                      <BoardCard
                        board={board}
                        isCreator={board.creator === meId()}
                        onOpen={() => navigate({ to: "/whiteboards/$id", params: { id: board.id } })}
                        createdLabel={formatDate(board.created_at, locale())}
                      />
                    )}
                  </For>
                </div>
              </Show>
              <Show when={(boards()?.total ?? 0) > PAGE_SIZE}>
                <TablePagination
                  pageIndex={page()}
                  pageCount={pageCount()}
                  pageSize={PAGE_SIZE}
                  total={boards()?.total ?? 0}
                  onPageChange={setPage}
                />
              </Show>
            </div>
          </Show>
        </Suspense>
      </DataSection>

      <CreateBoardPanel
        open={createOpen()}
        onOpenChange={setCreateOpen}
        onCreated={(board) => {
          setCreateOpen(false);
          void refetch();
          navigate({ to: "/whiteboards/$id", params: { id: board.id } });
        }}
      />
    </div>
  );
}

function BoardCard(props: { board: Board; isCreator: boolean; onOpen: () => void; createdLabel: string }) {
  const t = useT();
  return (
    <button
      type="button"
      class="flex w-full cursor-pointer flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4 text-left shadow-xs outline-hidden transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-surface-tint focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0"
      onClick={props.onOpen}
    >
      <div class="flex items-start justify-between gap-2">
        <h3 class="min-w-0 truncate font-semibold text-text-strong">{props.board.title}</h3>
        <div class="flex shrink-0 gap-1">
          <Show when={props.board.closed_at != null}>
            <Badge variant="warning">{t("whiteboard.closedBadge")}</Badge>
          </Show>
          <Show when={props.board.locked && props.board.closed_at == null}>
            <Badge variant="outline">{t("whiteboard.lockedBadge")}</Badge>
          </Show>
          <Show when={props.isCreator}>
            <Badge variant="outline">{t("whiteboard.creator")}</Badge>
          </Show>
        </div>
      </div>
      <p class="text-xs text-text-subtle">
        {t("whiteboard.createdAt")}: {props.createdLabel} · {t("whiteboard.participantCount", { count: props.board.participants.length + 1 })}
      </p>
    </button>
  );
}

function CreateBoardPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (board: Board) => void;
}) {
  const t = useT();
  const auth = useAuth();
  const { locale } = usePreferences();
  const [title, setTitle] = createSignal("");
  const [query, setQuery] = createSignal("");
  const [selected, setSelected] = createSignal<PersonRef[]>([]);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");

  // `/users/search` is teacher+, so a student (boards are student+) can't search
  // for participants — the picker is disabled for them, and they create a board
  // for themselves that a teacher can later add people to. Teacher+ uses the
  // live search below (the admin-only `/users` list would 403 a manager/teacher).
  const canSearch = () => hasMinRole(auth.user()?.role, "teacher");
  const [searchResults, setSearchResults] = createSignal<PersonRef[]>([]);
  let searchController: AbortController | null = null;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const q = query().trim();
    searchController?.abort();
    clearTimeout(searchTimer);
    if (!canSearch() || q.length === 0) {
      setSearchResults([]);
      return;
    }
    searchTimer = setTimeout(() => {
      const ctrl = new AbortController();
      searchController = ctrl;
      void getUserSearch(q, ctrl.signal)
        .then((page) => setSearchResults(page.items))
        .catch(() => {
          if (!ctrl.signal.aborted) setSearchResults([]);
        });
    }, 300);
  });
  onCleanup(() => {
    searchController?.abort();
    clearTimeout(searchTimer);
  });

  const selectedIds = createMemo(() => new Set(selected().map((u) => u.id)));
  // `/users/search` doesn't expose role, so a parent can still show up here —
  // the backend rejects one as a participant at submit time (see `submit`)
  // instead, same as it already does for course rosters.
  const filtered = createMemo(() => searchResults().filter((u) => !selectedIds().has(u.id)).slice(0, 8));

  // Keyboard navigation over the suggestion list: highlight moves with the
  // arrow keys, Enter adds the highlighted user. Reset to the top whenever the
  // query changes so the highlight never points past the filtered list.
  const [activeIndex, setActiveIndex] = createSignal(0);
  createEffect(() => {
    query();
    setActiveIndex(0);
  });
  const addParticipant = (u: PersonRef) => {
    setSelected((prev) => [...prev, u]);
    setQuery("");
  };
  const onPickerKeyDown = (e: KeyboardEvent) => {
    const list = filtered();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(list.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (list.length > 0) {
        e.preventDefault();
        const u = list[Math.min(activeIndex(), list.length - 1)];
        if (u) addParticipant(u);
      }
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  const submit = async () => {
    if (!title().trim()) return;
    setPending(true);
    setError("");
    try {
      const board = await postBoard({
        title: title().trim(),
        participants: selected().map((u) => u.id),
      });
      setTitle("");
      setSelected([]);
      setQuery("");
      props.onCreated(board);
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("whiteboard.create")}>
      <div class="space-y-4">
        <Show when={error()}>
          <ErrorAlert message={error()} />
        </Show>
        <div class="space-y-1.5">
          <Label>{t("whiteboard.titleLabel")}</Label>
          <Input value={title()} maxlength={200} onInput={(e) => setTitle(e.currentTarget.value)} />
        </div>

        <div class="space-y-1.5">
          <Label>{t("whiteboard.participants")}</Label>
          <p class="text-xs text-muted-foreground">{t("whiteboard.participantsHint")}</p>
          <Show when={selected().length > 0}>
            <div class="flex flex-wrap gap-1.5">
              <For each={selected()}>
                {(u) => (
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs"
                    onClick={() => setSelected((prev) => prev.filter((x) => x.id !== u.id))}
                  >
                    {personLabel(u)}
                    <IconX class="h-3 w-3" />
                  </button>
                )}
              </For>
            </div>
          </Show>
          <Input
            placeholder={t("whiteboard.addParticipant")}
            value={query()}
            disabled={!canSearch()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={onPickerKeyDown}
          />
          <Show when={!canSearch()}>
            <p class="text-xs text-muted-foreground">{t("form.searchNoPermission")}</p>
          </Show>
          <Show when={query().trim() && filtered().length > 0}>
            <div class="rounded-lg border">
              <For each={filtered()}>
                {(u, i) => (
                  <button
                    type="button"
                    class={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                      activeIndex() === i() ? "bg-accent" : "hover:bg-accent",
                    )}
                    onMouseEnter={() => setActiveIndex(i())}
                    onClick={() => addParticipant(u)}
                  >
                    <span class="truncate">{personLabel(u)}</span>
                    <span class="text-xs text-muted-foreground">@{u.username}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={pending() || !title().trim()} onClick={() => void submit()}>
            {t("whiteboard.create")}
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}
