import { createResource, createSignal, For, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import { getCourses } from "@/api/courses";
import { getTime } from "@/api/time";
import type { Event, EventAudience, Role } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

const AUDIENCE_KINDS = ["school", "role", "course", "registration"] as const;
const AUDIENCE_ROLES: Role[] = ["student", "teacher", "manager", "admin"];

function dateInputFromMs(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function timeInputFromMs(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateTimeInputToMs(date: string, time: string): number | null {
  if (!date.trim() && !time.trim()) return null;
  const dateMatch = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = time.trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, dayRaw, monthRaw, yearRaw] = dateMatch;
  const [, hourRaw, minuteRaw] = timeMatch;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day || d.getHours() !== hour || d.getMinutes() !== minute) return null;
  return d.getTime();
}

export type EventFormValues = {
  title: string;
  description: string;
  audience: EventAudience;
  starts_at: number | null | undefined;
  ends_at: number | null | undefined;
};

export function EventForm(props: {
  initial?: Partial<Event>;
  submitLabel?: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const isEdit = !!props.initial?.id;
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const initialAudience = () => props.initial?.audience ?? { kind: "school" as const };
  const audience = initialAudience();
  const [audienceKind, setAudienceKind] = createSignal<EventAudience["kind"]>(audience.kind);
  const [audienceRole, setAudienceRole] = createSignal<Role>(audience.kind === "role" ? audience.role : "student");
  const [audienceCourse, setAudienceCourse] = createSignal(audience.kind === "course" ? audience.course : "");
  const [capacity, setCapacity] = createSignal(audience.kind === "registration" && audience.capacity != null ? String(audience.capacity) : "");
  const [startsDate, setStartsDate] = createSignal(dateInputFromMs(props.initial?.starts_at));
  const [startsTime, setStartsTime] = createSignal(timeInputFromMs(props.initial?.starts_at));
  const [endsDate, setEndsDate] = createSignal(dateInputFromMs(props.initial?.ends_at));
  const [endsTime, setEndsTime] = createSignal(timeInputFromMs(props.initial?.ends_at));
  const [startsTouched, setStartsTouched] = createSignal(false);
  const [endsTouched, setEndsTouched] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<EventFormValues | null>(null);
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const [courses] = createResource(async () => (await getCourses().catch(() => ({ items: [] }))).items);

  const resolveTime = (date: string, time: string, touched: boolean): number | null | undefined => {
    if (isEdit && !touched) return undefined;
    return dateTimeInputToMs(date, time);
  };

  const validate = (
    starts: number | null | undefined,
    ends: number | null | undefined,
  ): string | null => {
    const value = title().trim();
    if (!value) return t("form.titleRequired");
    if (value.length > 200) return t("form.titleMax");
    if (description().length > 2000) return t("form.descriptionMax");
    if (audienceKind() === "course" && !audienceCourse()) return t("events.audienceCourseRequired");
    if (audienceKind() === "registration" && capacity().trim() && Number(capacity()) < 1) return t("events.audienceCapacityInvalid");
    const s = starts === undefined ? props.initial?.starts_at ?? null : starts;
    const e = ends === undefined ? props.initial?.ends_at ?? null : ends;
    if (startsTouched() && (startsDate().trim() || startsTime().trim()) && starts == null) return t("form.timeOrder");
    if (endsTouched() && (endsDate().trim() || endsTime().trim()) && ends == null) return t("form.timeOrder");
    if (s != null && e != null && e < s) return t("form.timeOrder");
    if ((!isEdit || startsTouched() || endsTouched()) && ((s != null && s < (serverTime()?.now ?? Date.now())) || (e != null && e < (serverTime()?.now ?? Date.now())))) return t("form.timePast");
    return null;
  };

  const audienceValue = (): EventAudience => {
    if (audienceKind() === "role") return { kind: "role", role: audienceRole() };
    if (audienceKind() === "course") return { kind: "course", course: audienceCourse() };
    if (audienceKind() === "registration") {
      const value = capacity().trim();
      return { kind: "registration", capacity: value ? Number(value) : null };
    }
    return { kind: "school" };
  };

  const save = async (values: EventFormValues) => {
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
      if (!isEdit) {
        setTitle("");
        setDescription("");
        setAudienceKind("school");
        setAudienceRole("student");
        setAudienceCourse("");
        setCapacity("");
        setStartsDate("");
        setStartsTime("");
        setEndsDate("");
        setEndsTime("");
        setStartsTouched(false);
        setEndsTouched(false);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const starts_at = resolveTime(startsDate(), startsTime(), startsTouched());
    const ends_at = resolveTime(endsDate(), endsTime(), endsTouched());
    const v = validate(starts_at, ends_at);
    if (v) {
      setError(v);
      return;
    }
    const values = {
      title: title().trim(),
      description: description(),
      audience: audienceValue(),
      starts_at,
      ends_at,
    };
    if (isEdit) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    await save(values);
  };

  return (
    <>
    <form class="space-y-4" onSubmit={handleSubmit}>
      <div class="space-y-3 rounded-2xl border border-sky-500/15 bg-sky-500/2.5 p-4 shadow-xs">
        <div class="space-y-1.5">
          <Label for="event-title">{t("form.title")}</Label>
          <Input
            id="event-title"
            class="h-11"
            value={title()}
            maxlength={200}
            required
            onInput={(e) => setTitle(e.currentTarget.value)}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="event-description">{t("form.description")}</Label>
          <Textarea
            id="event-description"
            class="min-h-28"
            value={description()}
            maxlength={2000}
            rows={3}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </div>
      </div>
      <div class="space-y-3 rounded-2xl border border-violet-500/15 bg-violet-500/3 p-4 shadow-xs">
        <div class="space-y-1.5">
          <Label for="event-audience">{t("events.audience")}</Label>
          <Select id="event-audience" value={audienceKind()} onChange={(e) => setAudienceKind(e.currentTarget.value as EventAudience["kind"])}>
            <For each={AUDIENCE_KINDS}>{(kind) => <option value={kind}>{t(`events.audience.${kind}` as MessageKey)}</option>}</For>
          </Select>
        </div>
        <Show when={audienceKind() === "role"}>
          <div class="space-y-1.5">
            <Label for="event-audience-role">{t("admin.role")}</Label>
            <Select id="event-audience-role" value={audienceRole()} onChange={(e) => setAudienceRole(e.currentTarget.value as Role)}>
              <For each={AUDIENCE_ROLES}>{(role) => <option value={role}>{t(`role.${role}` as MessageKey)}</option>}</For>
            </Select>
          </div>
        </Show>
        <Show when={audienceKind() === "course"}>
          <div class="space-y-1.5">
            <Label for="event-audience-course">{t("nav.courses")}</Label>
            <SearchableSelect id="event-audience-course" value={audienceCourse()} onChange={setAudienceCourse} placeholder={t("events.selectCourse")} options={(courses() ?? []).map((course) => ({ value: course.id, label: course.title }))} />
          </div>
        </Show>
        <Show when={audienceKind() === "registration"}>
          <div class="space-y-1.5">
            <Label for="event-audience-capacity">{t("events.capacity")}</Label>
            <Input
              id="event-audience-capacity"
              type="number"
              min="1"
              inputMode="numeric"
              placeholder={t("events.capacityOptional")}
              value={capacity()}
              onInput={(e) => setCapacity(e.currentTarget.value)}
            />
          </div>
        </Show>
      </div>
      <div class="grid gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/3 p-4">
        <div class="space-y-1.5">
          <Label for="event-starts">{t("events.starts")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker
              id="event-starts"
              class="h-11"
              placeholder={t("form.datePlaceholder")}
              value={startsDate()}
              onChange={(value) => {
                setStartsDate(value);
                setStartsTouched(true);
              }}
            />
            <Input
              id="event-starts-time"
              class="h-11 font-mono placeholder:text-muted-foreground/45"
              inputMode="numeric"
              placeholder="09:00"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={startsTime()}
              aria-label={t("exams.startTime")}
              onInput={(e) => {
                setStartsTime(e.currentTarget.value);
                setStartsTouched(true);
              }}
            />
          </div>
          <Show when={isEdit && startsTouched() && !startsDate() && !startsTime()}>
            <p class="text-xs text-muted-foreground">{t("events.clearStart")}</p>
          </Show>
        </div>
        <div class="space-y-1.5">
          <Label for="event-ends">{t("events.ends")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker
              id="event-ends"
              class="h-11"
              placeholder={t("form.datePlaceholder")}
              value={endsDate()}
              onChange={(value) => {
                setEndsDate(value);
                setEndsTouched(true);
              }}
            />
            <Input
              id="event-ends-time"
              class="h-11 font-mono placeholder:text-muted-foreground/45"
              inputMode="numeric"
              placeholder="10:00"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={endsTime()}
              aria-label={t("exams.endTime")}
              onInput={(e) => {
                setEndsTime(e.currentTarget.value);
                setEndsTouched(true);
              }}
            />
          </div>
          <Show when={isEdit && endsTouched() && !endsDate() && !endsTime()}>
            <p class="text-xs text-muted-foreground">{t("events.clearEnd")}</p>
          </Show>
        </div>
      </div>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-border bg-background px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
        <Button type="submit" class="h-10 flex-1 sm:flex-none" disabled={pending()}>
          {props.submitLabel ?? t("common.save")}
        </Button>
        {props.onCancel && (
          <Button type="button" variant="outline" class="h-10 flex-1 sm:flex-none" onClick={props.onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
    <ConfirmDialog
      open={confirmOpen()}
      onOpenChange={setConfirmOpen}
      title={t("confirm.updateTitle")}
      summary={t("confirm.updateEvent", { title: pendingValues()?.title ?? "" })}
      onConfirm={async () => {
        const values = pendingValues();
        if (!values) return;
        await save(values);
      }}
    />
    </>
  );
}
