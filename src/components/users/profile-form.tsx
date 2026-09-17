import { For, Show, createSignal } from "solid-js";
import { patchMe } from "@/api/users";
import type { ProfileUpdate, User } from "@/api/client";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFlash } from "@/lib/flash";
import { hasMinRole } from "@/lib/roles";
import { useT } from "@/stores/preferences-context";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isFutureDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return true;
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return d.getTime() > tomorrow.getTime();
}

function dateInputFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function isoFromDateInput(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return value.trim();
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function ProfileForm(props: {
  user: User;
  /**
   * `display_name` and `bio` ride the same PATCH but do not live on `User` —
   * GET /auth/me never returns them, only GET /users/{id}/profile does. Pass
   * them where a profile is in hand; omit them and the fields stay hidden
   * rather than silently offering to clear values they cannot see.
   */
  profile?: { display_name: string | null; bio: string | null; branch?: string | null };
  /** The school's branş vocabulary (settings.branches); the picker hides when empty. */
  branches?: string[];
  maxDisplayNameLen?: number;
  maxBioLen?: number;
  onSaved: () => void;
  onSave?: (body: ProfileUpdate) => Promise<User>;
}) {
  const t = useT();
  const [name, setName] = createSignal(props.user.name ?? "");
  const [surname, setSurname] = createSignal(props.user.surname ?? "");
  const [email, setEmail] = createSignal(props.user.email ?? "");
  const [phone, setPhone] = createSignal(props.user.phone ?? "");
  const [birthDate, setBirthDate] = createSignal(dateInputFromIso(props.user.birth_date));
  const [displayName, setDisplayName] = createSignal(props.profile?.display_name ?? "");
  const [bio, setBio] = createSignal(props.profile?.bio ?? "");
  const [branch, setBranch] = createSignal(props.profile?.branch ?? "");
  // Branş is a teacher's field; a stored value outside the list still shows so
  // saving the form never silently drops it.
  const branchOptions = () => {
    const list = props.branches ?? [];
    const stored = props.profile?.branch;
    return stored && !list.includes(stored) ? [stored, ...list] : list;
  };
  const showBranch = () => !!props.profile && hasMinRole(props.user.role, "teacher") && branchOptions().length > 0;
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);

  const validate = (): string | null => {
    const e = email().trim();
    const p = phone().trim();
    const b = isoFromDateInput(birthDate());
    if (e && !EMAIL_RE.test(e)) return t("profile.emailInvalid");
    if (p && !PHONE_RE.test(p)) return t("profile.phoneInvalid");
    if (b && (!DATE_RE.test(b) || isFutureDate(b))) return t("profile.dateInvalid");
    return null;
  };

  const buildBody = (): ProfileUpdate => {
    const b: ProfileUpdate = {};
    const n = name().trim();
    const s = surname().trim();
    const e = email().trim();
    const p = phone().trim();
    const d = isoFromDateInput(birthDate());
    if (n !== (props.user.name ?? "")) b.name = n;
    if (s !== (props.user.surname ?? "")) b.surname = s;
    if (e !== (props.user.email ?? "")) b.email = e;
    if (p !== (props.user.phone ?? "")) b.phone = p;
    if (d !== (props.user.birth_date ?? "")) b.birth_date = d;
    if (props.profile) {
      // An empty string clears the field server-side; an omitted key keeps it.
      const dn = displayName().trim();
      const bi = bio().trim();
      if (dn !== (props.profile.display_name ?? "")) b.display_name = dn;
      if (bi !== (props.profile.bio ?? "")) b.bio = bi;
      if (showBranch() && branch() !== (props.profile.branch ?? "")) b.branch = branch();
    }
    return b;
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    setError("");
    const msg = validate();
    if (msg) { setError(msg); return; }
    const body = buildBody();
    if (Object.keys(body).length === 0) { props.onSaved(); return; }
    setPending(true);
    try {
      await (props.onSave ?? patchMe)(body);
      props.onSaved();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} class="space-y-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="pf-name">{t("profile.name")}</Label>
          <Input id="pf-name" class="h-10" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </div>
        <div class="space-y-1.5">
          <Label for="pf-surname">{t("profile.surname")}</Label>
          <Input id="pf-surname" class="h-10" value={surname()} onInput={(e) => setSurname(e.currentTarget.value)} />
        </div>
      </div>
      <Show when={props.profile}>
        <div class="space-y-1.5">
          <Label for="pf-display-name">{t("profile.displayName")}</Label>
          <Input
            id="pf-display-name"
            class="h-10"
            maxlength={props.maxDisplayNameLen}
            value={displayName()}
            onInput={(e) => setDisplayName(e.currentTarget.value)}
          />
          <p class="text-xs text-muted-foreground">{t("profile.displayNameHint")}</p>
        </div>
        <div class="space-y-1.5">
          <Label for="pf-bio">{t("profile.bio")}</Label>
          <Textarea
            id="pf-bio"
            rows={3}
            maxlength={props.maxBioLen}
            value={bio()}
            onInput={(e) => setBio(e.currentTarget.value)}
          />
          <p class="text-xs text-muted-foreground">
            {t("profile.bioHint")}
            <Show when={props.maxBioLen}>
              {(max) => <span class="ml-1 tabular-nums">{bio().length} / {max()}</span>}
            </Show>
          </p>
        </div>
      </Show>
      <Show when={showBranch()}>
        <div class="space-y-1.5">
          <Label for="pf-branch">{t("profile.branch")}</Label>
          <Select id="pf-branch" class="h-10" value={branch()} onChange={(e) => setBranch(e.currentTarget.value)}>
            <option value="">{t("profile.branchNone")}</option>
            <For each={branchOptions()}>{(name) => <option value={name}>{name}</option>}</For>
          </Select>
        </div>
      </Show>
      <div class="space-y-1.5">
        <Label for="pf-email">{t("profile.email")}</Label>
        <Input id="pf-email" class="h-10" type="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} />
      </div>
      <div class="space-y-1.5">
        <Label for="pf-phone">{t("profile.phone")}</Label>
        <Input id="pf-phone" class="h-10" type="tel" value={phone()} onInput={(e) => setPhone(e.currentTarget.value)} />
      </div>
      <div class="space-y-1.5">
        <Label for="pf-birth">{t("profile.birthDate")}</Label>
        <DatePicker id="pf-birth" class="h-10" placeholder={t("form.datePlaceholder")} value={birthDate()} onChange={setBirthDate} />
      </div>
      {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}
      <div class="flex justify-end">
        <Button type="submit" class="w-full sm:w-auto" disabled={pending()}>{t("common.save")}</Button>
      </div>
    </form>
  );
}
