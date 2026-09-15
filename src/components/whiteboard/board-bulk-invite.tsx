import { For, Show, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getClasses, getMyClasses } from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getEvents } from "@/api/events";
import { postBoardInvite } from "@/api/boards";
import { getLimits } from "@/api/limits";
import { ApiError, formatApiError } from "@/api/client";
import type { Board, BoardInviteBody } from "@/api/boards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

type InviteKind = BoardInviteBody["kind"];

const KINDS: InviteKind[] = ["class", "course", "event"];

async function loadOptions(kind: InviteKind) {
  if (kind === "class") {
    // GET /classes is teacher+; a teacher who is not on the school-wide list
    // still has their own, so fall back rather than showing an empty picker.
    try {
      return (await getClasses({ limit: 200 })).items.map((c) => ({ value: c.id, label: c.name }));
    } catch {
      return (await getMyClasses({ limit: 200 })).items.map((c) => ({ value: c.id, label: c.name }));
    }
  }
  if (kind === "course") {
    // A club is a course whose kind is "club", so one list covers both arms.
    return (await getCourses({ limit: 200 })).items.map((c) => ({ value: c.id, label: c.title }));
  }
  return (await getEvents({ limit: 200 })).items.map((e) => ({ value: e.id, label: e.title }));
}

export function BoardBulkInvite(props: {
  boardId: () => string;
  /** Creator-only, and only while the board is open — the backend 403s below that. */
  visible: () => boolean;
  participantCount: () => number;
  onInvited: (board: Board) => void;
}) {
  const t = useT();
  const [kind, setKind] = createSignal<InviteKind>("class");
  const [picked, setPicked] = createSignal("");
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  const [pending, setPending] = createSignal(false);

  // The panel keeps its children mounted, so gate on `visible` too: a
  // non-creator must never fire these three list requests, and switching kind
  // must refetch rather than leave the previous kind's options on screen.
  const [options] = createResource(
    () => (props.visible() ? kind() : null),
    (k) => loadOptions(k),
  );
  const [limits] = createResource(() => (props.visible() ? true : null), () => getLimits());

  const invite = async () => {
    const id = picked();
    if (!id) return;
    setError("");
    setNotice("");
    setPending(true);
    const before = props.participantCount();
    const k = kind();
    const body: BoardInviteBody =
      k === "class" ? { kind: "class", class: id } : k === "course" ? { kind: "course", course: id } : { kind: "event", event: id };
    try {
      const board = await postBoardInvite(props.boardId(), body);
      props.onInvited(board);
      const added = board.participants.length - before;
      setNotice(added > 0 ? t("whiteboard.inviteAdded", { count: added }) : t("whiteboard.inviteNoneAdded"));
      setPicked("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("whiteboard.inviteTooMany", { max: limits.latest?.board?.max_participants ?? 200 }));
      } else if (err instanceof ApiError && err.status === 400) {
        // A named class/course/event that no longer exists is a 400 here; a 404
        // would have meant the board itself.
        setError(t("whiteboard.inviteNotFound"));
      } else {
        setError(formatApiError(err));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section class="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
      <div>
        <h3 class="text-sm font-semibold">{t("whiteboard.bulkInvite")}</h3>
        <p class="mt-1 text-xs text-muted-foreground">{t("whiteboard.bulkInviteHint")}</p>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <For each={KINDS}>
          {(k) => (
            <button
              type="button"
              class={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                kind() === k
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:bg-muted/60",
              )}
              aria-pressed={kind() === k}
              onClick={() => {
                setKind(k);
                setPicked("");
                setError("");
                setNotice("");
              }}
            >
              {t(
                k === "class"
                  ? "whiteboard.inviteSourceClass"
                  : k === "course"
                    ? "whiteboard.inviteSourceCourse"
                    : "whiteboard.inviteSourceEvent",
              )}
            </button>
          )}
        </For>
      </div>

      <div class="space-y-1.5">
        <Label for="board-invite-source">{t("whiteboard.inviteSelect")}</Label>
        <div class="flex flex-wrap gap-2">
          <SearchableSelect
            id="board-invite-source"
            class="min-w-0 flex-1"
            value={picked()}
            onChange={setPicked}
            options={options.latest ?? []}
            placeholder={t("whiteboard.inviteSelect")}
            disabled={options.loading || (options.latest?.length ?? 0) === 0}
          />
          <Button type="button" size="sm" class="rounded-lg" disabled={pending() || !picked()} onClick={() => void invite()}>
            {t("whiteboard.inviteAction")}
          </Button>
        </div>
        <Show when={!options.loading && (options.latest?.length ?? 0) === 0}>
          <p class="text-xs text-muted-foreground">{t("whiteboard.inviteEmptySource")}</p>
        </Show>
      </div>

      <Show when={notice()}>
        <p class="text-xs text-muted-foreground">{notice()}</p>
      </Show>
      <Show when={error()}>
        <p class="text-xs text-destructive">{error()}</p>
      </Show>
    </section>
  );
}
