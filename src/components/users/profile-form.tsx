import { createSignal } from "solid-js";
import { patchMe } from "@/api/patchMe";
import type { ProfileUpdate, User } from "@/api/types";
import { formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function ProfileForm(props: { user: User; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = createSignal(props.user.name ?? "");
  const [surname, setSurname] = createSignal(props.user.surname ?? "");
  const [email, setEmail] = createSignal(props.user.email ?? "");
  const [phone, setPhone] = createSignal(props.user.phone ?? "");
  const [birthDate, setBirthDate] = createSignal(dateInputFromIso(props.user.birth_date));
  const [error, setError] = createSignal("");
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
      await patchMe(body);
      props.onSaved();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} class="space-y-4">
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
