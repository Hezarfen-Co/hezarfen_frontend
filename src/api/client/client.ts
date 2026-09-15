import type { Locale } from "@/i18n/messages";

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfter: number | null;
  /** Set when the school has this route's module switched off (`403 {error, module}`). */
  readonly module: string | null;

  constructor(status: number, message: string, retryAfter: number | null = null, module: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
    this.module = module;
  }
}

/** True for a refusal because the school's module is off, not a role or record problem. */
export function isModuleDisabledError(err: unknown): err is ApiError & { module: string } {
  return err instanceof ApiError && err.status === 403 && err.module != null;
}

// A builder can switch a module off mid-session; the backend then answers
// `403 {error, module}` on every route of it. Listeners (the modules context)
// hear about it on the first such refusal and refetch the enabled set, so the
// nav and route gate catch up without a reload.
const moduleDisabledListeners = new Set<(module: string) => void>();

export function onModuleDisabled(listener: (module: string) => void): () => void {
  moduleDisabledListeners.add(listener);
  return () => moduleDisabledListeners.delete(listener);
}

function disabledModuleOf(status: number, data: unknown): string | null {
  if (status !== 403 || !data || typeof data !== "object") return null;
  const module = (data as { module?: unknown }).module;
  if (typeof module !== "string" || !module) return null;
  for (const listener of moduleDisabledListeners) listener(module);
  return module;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  cache?: RequestCache;
};

const API_PREFIX = "/api";

// Deadline for a JSON request. Generous enough for the slowest real call
// (login's Argon2 hash under load), short enough that a hung socket surfaces
// as an error instead of a permanently disabled button.
const REQUEST_TIMEOUT_MS = 20_000;

const API_ERROR_MESSAGES: Record<string, Record<Locale, string>> = {
  // Settings lists reject two entries that fold to the same word — İZİN/izin,
  // ÖDEV/odev. Keyed on the whole normalized string, so both fields are listed.
  "exam_kinds: two entries are the same word apart from upper/lower case or turkish letters — keep only one of them": {
    en: "Two exam kinds are the same word apart from upper/lower case or Turkish letters. Keep only one of them.",
    tr: "İki sınav türü, büyük/küçük harf veya Türkçe harf farkı dışında aynı. Sadece birini bırak.",
  },
  "attendance_statuses: two entries are the same word apart from upper/lower case or turkish letters — keep only one of them": {
    en: "Two attendance statuses are the same word apart from upper/lower case or Turkish letters. Keep only one of them.",
    tr: "İki yoklama durumu, büyük/küçük harf veya Türkçe harf farkı dışında aynı. Sadece birini bırak.",
  },
  "request failed": {
    en: "Request failed.",
    tr: "İşlem tamamlanamadı.",
  },
  "unauthorized": {
    en: "Sign in to continue.",
    tr: "Devam etmek için giriş yap.",
  },
  "forbidden": {
    en: "You do not have permission for this action.",
    tr: "Bu işlem için yetkin yok.",
  },
  "not found": {
    en: "The requested record was not found.",
    tr: "İstenen kayıt bulunamadı.",
  },
  "invalid credentials": {
    en: "Username or password is incorrect.",
    tr: "Kullanıcı adı veya şifre hatalı.",
  },
  "username already exists": {
    en: "This username is already in use.",
    tr: "Bu kullanıcı adı zaten kullanılıyor.",
  },
  "file too large": {
    en: "This file is larger than the allowed upload limit.",
    tr: "Bu dosya izin verilen yükleme sınırından büyük.",
  },
  "payload too large": {
    en: "This upload is too large. Choose a smaller file and try again.",
    tr: "Bu yükleme çok büyük. Daha küçük bir dosya seçip tekrar dene.",
  },
  "request entity too large": {
    en: "This upload is too large. Choose a smaller file and try again.",
    tr: "Bu yükleme çok büyük. Daha küçük bir dosya seçip tekrar dene.",
  },
  "unsupported file type": {
    en: "This file type is not supported.",
    tr: "Bu dosya türü desteklenmiyor.",
  },
  "unsupported image type": {
    en: "This image type is not supported. Use PNG, JPEG, WebP, or GIF.",
    tr: "Bu görsel türü desteklenmiyor. PNG, JPEG, WebP veya GIF kullan.",
  },
  "invalid image": {
    en: "The image could not be read. Choose another image and try again.",
    tr: "Görsel okunamadı. Başka bir görsel seçip tekrar dene.",
  },
  "too many files": {
    en: "This note already has the maximum number of files.",
    tr: "Bu notta en fazla dosya sayısına ulaşılmış.",
  },
  "note file limit reached": {
    en: "This note already has the maximum number of files.",
    tr: "Bu notta en fazla dosya sayısına ulaşılmış.",
  },
  "this time overlaps a slot you have already published": {
    en: "This time overlaps a slot you already published.",
    tr: "Bu zaman aralığı, daha önce yayınladığın bir müsaitlikle çakışıyor.",
  },
  "a repeated slot overlaps one you have already published": {
    en: "One of the repeated slots overlaps a slot you already published.",
    tr: "Tekrarlanan müsaitliklerden biri, daha önce yayınladığın bir müsaitlikle çakışıyor.",
  },
  "the repeated slots overlap each other": {
    en: "The repeated slots overlap each other.",
    tr: "Tekrarlanan müsaitlikler birbiriyle çakışıyor.",
  },
  // Builder surface (web/builder.rs, tenant.rs) — byte-exact.
  "school slug already taken": {
    en: "That school code is already taken.",
    tr: "Bu okul kodu zaten kullanılıyor.",
  },
  "that account is not an admin of this school": {
    en: "That account exists but is not an admin of this school.",
    tr: "Bu hesap var ama bu okulun yöneticisi değil.",
  },
  "school is suspended": {
    en: "This school is suspended.",
    tr: "Bu okul askıya alınmış.",
  },
  // Booking/decision conflicts from domain/appointment.rs — byte-exact.
  "the slot is already booked": {
    en: "Someone else booked this time first.",
    tr: "Bu saati senden önce başkası aldı.",
  },
  "the slot has already started": {
    en: "This time has already started, so it can no longer be booked.",
    tr: "Bu saat başladığı için artık randevu alınamaz.",
  },
  "you already have an appointment at that time": {
    en: "You already have an appointment at that time.",
    tr: "O saatte zaten bir randevun var.",
  },
  "the appointment is already settled": {
    en: "This appointment is already settled.",
    tr: "Bu randevu zaten sonuçlanmış.",
  },
  "the appointment has already started": {
    en: "This appointment has already started.",
    tr: "Bu randevu çoktan başladı.",
  },
  "that time has already started": {
    en: "That time has already started. Pick a later one.",
    tr: "O saat çoktan başladı. Daha ileri bir saat seç.",
  },
  "no time has been proposed": {
    en: "No time has been proposed for this appointment yet.",
    tr: "Bu randevu için henüz bir saat önerilmedi.",
  },
  "the appointment is no longer pending": {
    en: "This appointment is no longer waiting for an answer.",
    tr: "Bu randevu artık yanıt bekliyor değil.",
  },
  "question: this question did not come from a bank template": {
    en: "This question was not copied from a bank template, so there is nothing to refresh it from.",
    tr: "Bu soru bir banka şablonundan kopyalanmadığı için yenilenecek bir kaynağı yok.",
  },
  "request timed out": {
    en: "The server did not respond in time. Check your connection and try again.",
    tr: "Sunucu zamanında yanıt vermedi. Bağlantını kontrol edip tekrar dene.",
  },
  "only the template's owner or an admin can change it": {
    en: "Only the teacher who created this template (or an admin) can change it.",
    tr: "Bu şablonu yalnızca onu oluşturan öğretmen (veya bir yönetici) değiştirebilir.",
  },
  "only the course creator, an assigned teacher, or a manager/admin can author questions": {
    en: "Only this course's teachers or a manager can add questions to this exam.",
    tr: "Bu sınava yalnızca dersin öğretmenleri veya bir müdür soru ekleyebilir.",
  },
  "only the course creator, an assigned teacher, or a manager/admin can save questions to the bank": {
    en: "Only this course's teachers or a manager can save this question to the bank.",
    tr: "Bu soruyu bankaya yalnızca dersin öğretmenleri veya bir müdür kaydedebilir.",
  },
  "cannot change questions after attempts have started": {
    en: "Students have already started this exam, so its questions can no longer change.",
    tr: "Öğrenciler bu sınava başladığı için soruları artık değiştirilemez.",
  },
  "bank questions still reference this subject — re-tag or delete them first": {
    en: "Question bank templates still use this subject. Re-tag or delete them first.",
    tr: "Soru bankasındaki şablonlar hâlâ bu konuyu kullanıyor. Önce onları başka konuya taşı veya sil.",
  },
  "the term is archived — past years are read-only": {
    en: "This term is archived. Past years are read-only.",
    tr: "Bu dönem arşivli. Geçmiş dönemler salt okunur.",
  },
  "this course's term is archived — past years are read-only": {
    en: "This course's term is archived. Past years are read-only.",
    tr: "Bu dersin dönemi arşivli. Geçmiş dönemler salt okunur.",
  },
  "module disabled": {
    en: "This feature is not enabled for your school.",
    tr: "Bu özellik okulunuz için etkin değil.",
  },
  "course not found": {
    en: "Course not found.",
    tr: "Ders bulunamadı.",
  },
  "exam not found": {
    en: "Exam not found.",
    tr: "Sınav bulunamadı.",
  },
  "not enrolled in this exam's course": {
    en: "You are not enrolled in this exam's course.",
    tr: "Bu sınavın dersine kayıtlı değilsin.",
  },
  "you are not enrolled in this exam's course": {
    en: "You are not enrolled in this exam's course.",
    tr: "Bu sınavın dersine kayıtlı değilsin.",
  },
  "exam is not scheduled": {
    en: "This exam is not scheduled for online sitting.",
    tr: "Bu sınav çevrim içi oturum için zamanlanmamış.",
  },
  "attempt not found": {
    en: "Start the exam before opening the exam room.",
    tr: "Sınav odasını açmadan önce sınavı başlat.",
  },
  "attempt is closed": {
    en: "This attempt is closed. Answers are read-only.",
    tr: "Bu oturum kapalı. Cevaplar salt okunur.",
  },
  "exam has not started": {
    en: "This exam has not started yet.",
    tr: "Bu sınav henüz başlamadı.",
  },
  "exam has ended": {
    en: "This exam has ended.",
    tr: "Bu sınav sona erdi.",
  },
  "no attempts left": {
    en: "No attempts left for this exam.",
    tr: "Bu sınav için deneme hakkı kalmadı.",
  },
  "answer is required": {
    en: "Enter an answer before saving.",
    tr: "Kaydetmeden önce cevap gir.",
  },
  "only students can sit exams": {
    en: "Only students can take exams.",
    tr: "Sınava yalnızca öğrenciler girebilir.",
  },
  "user_id: only students can be enrolled in a course": {
    en: "Only students can be enrolled in a course.",
    tr: "Derse yalnızca öğrenciler kaydedilebilir.",
  },
  "user_id: only students can be graded": {
    en: "Only students can be graded.",
    tr: "Yalnızca öğrencilere not verilebilir.",
  },
  "user_id: only students can be marked present in a lesson": {
    en: "Only students can be marked on a lesson roll call.",
    tr: "Ders yoklamasında yalnızca öğrenciler işaretlenebilir.",
  },
  "event is full": {
    en: "This event is full.",
    tr: "Bu etkinlik dolu.",
  },
  "registration is closed": {
    en: "Registration is closed for this event.",
    tr: "Bu etkinlik için kayıt kapalı.",
  },
  "already registered": {
    en: "This student is already registered.",
    tr: "Bu öğrenci zaten kayıtlı.",
  },
  "already enrolled": {
    en: "This student is already enrolled.",
    tr: "Bu öğrenci zaten kayıtlı.",
  },
  "active pomodoro session already exists": {
    en: "You already have a focus session running.",
    tr: "Zaten devam eden bir odak oturumun var.",
  },
  "no active pomodoro session": {
    en: "There is no active focus session to finish.",
    tr: "Bitirilecek aktif odak oturumu yok.",
  },
};

const FIELD_LABELS: Record<string, Record<Locale, string>> = {
  content: { en: "Content", tr: "İçerik" },
  description: { en: "Description", tr: "Açıklama" },
  password: { en: "Password", tr: "Şifre" },
  title: { en: "Title", tr: "Başlık" },
  username: { en: "Username", tr: "Kullanıcı adı" },
};

export function currentLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem("hezarfen.locale");
    if (saved === "en" || saved === "tr") return saved;
    return window.navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch {
    return "en";
  }
}

function normalizeApiMessage(message: string): string {
  return message
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .toLowerCase();
}

function sentenceCase(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toLocaleUpperCase("en-US") + trimmed.slice(1);
}

function formatRuntimeErrorMessage(message: string, locale: Locale): string | null {
  const normalized = normalizeApiMessage(message);
  if (/^(failed to fetch|load failed|networkerror|network request failed)/.test(normalized)) {
    return locale === "tr"
      ? "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene."
      : "Could not reach the server. Check your connection and try again.";
  }
  if (
    /^(typeerror:\s*)?cannot (read|set) propert(y|ies) of (null|undefined)/.test(normalized) ||
    /^use\w+ must be used within \w+provider/.test(normalized)
  ) {
    return locale === "tr"
      ? "Sayfa yüklenirken bir sorun oluştu. Sayfayı yeniden yükleyip tekrar dene."
      : "Something went wrong while loading the page. Reload the page and try again.";
  }
  return null;
}

function formatNumber(value: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(Number(value));
}

function fieldLabel(field: string, locale: Locale): string {
  const normalized = field.trim().toLowerCase().replace(/[_.-]+/g, " ");
  const known = FIELD_LABELS[normalized]?.[locale];
  if (known) return known;
  return sentenceCase(normalized);
}

function formatValidationMessage(message: string, locale: Locale): string | null {
  const lengthMatch = message.match(/^([\w .-]+) must be at most (\d+) characters \(got (\d+)\)$/i);
  if (!lengthMatch) return null;

  const label = fieldLabel(lengthMatch[1], locale);
  const max = formatNumber(lengthMatch[2], locale);
  const got = formatNumber(lengthMatch[3], locale);

  if (locale === "tr") return `${label} en fazla ${max} karakter olmalı. Şu an ${got} karakter.`;
  return `${label} must be at most ${max} characters. Currently ${got} characters.`;
}

function errorMessageFromPayload(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.error === "string") return record.error;
  if (typeof record.message === "string") return record.message;
  const detail = record.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const row = item as Record<string, unknown>;
        const loc = Array.isArray(row.loc) ? row.loc.map(String).join(".") : "";
        const msg = typeof row.msg === "string" ? row.msg : "";
        return loc && msg ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean)
      .join("; ") || fallback;
  }
  return fallback;
}

const pendingGets = new Map<string, Promise<unknown>>();

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  // JSON calls only — uploads (formClient) and downloads (blobClient) stay
  // untimed. Without this a dead connection leaves callers (exam-room REST
  // autosave) stuck on "saving…" until the browser gives up.
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  // Caller-initiated aborts keep their original AbortError so cancellation
  // handling upstream is untouched; only our own deadline becomes an ApiError.
  const asDeadlineError = (err: unknown) =>
    timeout.aborted && !options.signal?.aborted ? new ApiError(408, "request timed out") : err;

  let res: Response;
  try {
    res = await fetch(`${API_PREFIX}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      credentials: "same-origin",
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      cache: options.cache,
    });
  } catch (err) {
    throw asDeadlineError(err);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  // The deadline aborts the body stream too, so headers can arrive in time and
  // res.text() still blow up mid-download on a multi-MB response.
  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    throw asDeadlineError(err);
  }

  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const message = errorMessageFromPayload(data, res.statusText || "Request failed");

    let retryAfter: number | null = null;
    if (res.status === 429 || res.status === 503) {
      const raw = res.headers.get("Retry-After");
      if (raw) {
        const n = Number(raw);
        retryAfter = Number.isFinite(n) ? n : null;
      }
    }

    throw new ApiError(res.status, message, retryAfter, disabledModuleOf(res.status, data));
  }

  return data as T;
}

/**
 * Coalesce only overlapping, non-cancellable GETs. This is deliberately not a
 * cache: once settled the entry disappears, so every later resource refetch
 * still reaches the backend and mutation consistency stays unchanged.
 */
export function client<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET" || options.body !== undefined || options.signal || options.cache === "no-store") {
    return request<T>(path, options);
  }
  const key = `${path}\u0000${options.cache ?? "default"}`;
  const pending = pendingGets.get(key);
  if (pending) return pending as Promise<T>;
  const next = request<T>(path, options).finally(() => pendingGets.delete(key));
  pendingGets.set(key, next);
  return next;
}

export async function formClient<T>(path: string, body: FormData, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    body,
    credentials: "same-origin",
    signal,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const message = errorMessageFromPayload(data, res.statusText || "Request failed");
    throw new ApiError(res.status, message, null, disabledModuleOf(res.status, data));
  }

  return data as T;
}

export async function blobClient(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    credentials: "same-origin",
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText || "Request failed";
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
        message = errorMessageFromPayload(payload, message);
      } catch {
        message = text;
      }
    }
    throw new ApiError(res.status, message, null, disabledModuleOf(res.status, payload));
  }

  return res.blob();
}

export function formatApiErrorMessage(message: string, locale: Locale = currentLocale()): string {
  const normalized = normalizeApiMessage(message);
  const known = API_ERROR_MESSAGES[normalized]?.[locale];
  if (known) return known;
  const runtime = formatRuntimeErrorMessage(message, locale);
  if (runtime) return runtime;
  const validation = formatValidationMessage(message, locale);
  if (validation) return validation;
  // Unmapped backend text is raw English/technical — never surface it to the
  // user. Fall back to a clean localized line; add a mapping in
  // API_ERROR_MESSAGES when a specific message deserves its own wording.
  return locale === "tr"
    ? "İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar dene."
    : "Something went wrong. Please check your input and try again.";
}

export function formatApiError(err: unknown, locale: Locale = currentLocale()): string {
  if (err instanceof ApiError) {
    if ((err.status === 429 || err.status === 503) && err.retryAfter != null) {
      return locale === "tr" ? `${err.retryAfter} sn sonra tekrar dene.` : `Try again in ${err.retryAfter}s.`;
    }
    // The specific backend message wins over the per-status generic one —
    // otherwise every 401/403/404/413/5xx entry in the table is dead code.
    // Ahead of the message table: the backend's text for a switched-off
    // module may be a generic "forbidden", which reads as a permissions fault.
    if (err.module != null && err.status === 403) {
      return locale === "tr" ? "Bu özellik okulunuzda şu an kapalı." : "This feature is currently switched off for your school.";
    }
    const known = API_ERROR_MESSAGES[normalizeApiMessage(err.message)]?.[locale];
    if (known) return known;
    if (err.status === 401) return API_ERROR_MESSAGES.unauthorized[locale];
    if (err.status === 403) return API_ERROR_MESSAGES.forbidden[locale];
    if (err.status === 404) return API_ERROR_MESSAGES["not found"][locale];
    if (err.status === 413) return API_ERROR_MESSAGES["payload too large"][locale];
    if (err.status >= 500) return locale === "tr" ? "Sunucuda bir sorun oluştu. Lütfen tekrar dene." : "Server error. Please try again.";
    return formatApiErrorMessage(err.message, locale);
  }
  if (err instanceof TypeError) {
    return formatRuntimeErrorMessage(err.message, locale) ??
      (locale === "tr"
        ? "Sayfa yüklenirken bir sorun oluştu. Sayfayı yeniden yükleyip tekrar dene."
        : "Something went wrong while loading the page. Reload the page and try again.");
  }
  if (err instanceof Error) return formatApiErrorMessage(err.message, locale);
  return locale === "tr" ? "Bir şeyler ters gitti." : "Something went wrong.";
}
