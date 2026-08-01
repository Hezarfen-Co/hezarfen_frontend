import { useNavigate } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getBoards, postBoard, type Board } from "@/api/boards";
import { getUsers } from "@/api/users";
import { formatApiError, type User } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconPlus, IconX } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { formatDate } from "@/lib/format";
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

  const [boards, { refetch }] = createResource(async () => (await getBoards({ limit: 200 })).items);
  const [createOpen, setCreateOpen] = createSignal(false);

  const meId = () => auth.user()?.id ?? "";

  return (
    <div class="space-y-5">
      <PageHeader
        title={t("whiteboard.title")}
        description={t("whiteboard.subtitle")}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <IconPlus class="h-4 w-4" />
            {t("whiteboard.create")}
          </Button>
        }
      />

      <Suspense fallback={<PageSpinner />}>
        <Show when={boards.error}>
          <ErrorAlert message={formatApiError(boards.error, locale())} />
        </Show>
        <Show
          when={(boards() ?? []).length > 0}
          fallback={<EmptyState title={t("whiteboard.empty")} description={t("whiteboard.subtitle")} />}
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={boards()}>
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
      </Suspense>

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
    <div class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <div class="flex items-start justify-between gap-2">
        <h3 class="min-w-0 truncate font-semibold">{props.board.title}</h3>
        <div class="flex shrink-0 gap-1">
          <Show when={props.board.closed_at != null}>
            <Badge variant="outline" class="rounded-full text-amber-600">{t("whiteboard.closedBadge")}</Badge>
          </Show>
          <Show when={props.board.locked && props.board.closed_at == null}>
            <Badge variant="outline" class="rounded-full">{t("whiteboard.lockedBadge")}</Badge>
          </Show>
          <Show when={props.isCreator}>
            <Badge variant="outline" class="rounded-full">{t("whiteboard.creator")}</Badge>
          </Show>
        </div>
      </div>
      <p class="text-xs text-muted-foreground">
        {t("whiteboard.createdAt")}: {props.createdLabel} · {props.board.participants.length + 1} {t("whiteboard.participants").toLowerCase()}
      </p>
      <Button type="button" variant="outline" size="sm" class="mt-auto w-full" onClick={props.onOpen}>
        {t("whiteboard.open")}
      </Button>
    </div>
  );
}

function CreateBoardPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (board: Board) => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [title, setTitle] = createSignal("");
  const [query, setQuery] = createSignal("");
  const [selected, setSelected] = createSignal<User[]>([]);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");

  // Parents can never be on a roster (backend 400s them), so they are filtered out.
  const [candidates] = createResource(async () =>
    (await getUsers({ limit: 500 })).items.filter((u) => u.role !== "parent"),
  );

  const selectedIds = createMemo(() => new Set(selected().map((u) => u.id)));
  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    const me = undefined;
    return (candidates() ?? [])
      .filter((u) => u !== me && !selectedIds().has(u.id))
      .filter((u) => !q || u.username.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  });

  const label = (u: User) => [u.name, u.surname].filter(Boolean).join(" ") || u.username;

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
                    {label(u)}
                    <IconX class="h-3 w-3" />
                  </button>
                )}
              </For>
            </div>
          </Show>
          <Input
            placeholder={t("whiteboard.addParticipant")}
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          <Show when={query().trim() && filtered().length > 0}>
            <div class="rounded-lg border">
              <For each={filtered()}>
                {(u) => (
                  <button
                    type="button"
                    class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setSelected((prev) => [...prev, u]);
                      setQuery("");
                    }}
                  >
                    <span class="truncate">{label(u)}</span>
                    <span class="text-xs text-muted-foreground">{u.role}</span>
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
