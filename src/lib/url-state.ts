import { createEffect, createSignal, on } from "solid-js";
import { useLocation, useNavigate } from "@tanstack/solid-router";

/**
 * List and view state that lives in the URL search params, so Back and a
 * reload land on the same page, search, sort, tab or calendar view the user
 * left. Every write replaces the current history entry: typing into a search
 * box must not push one entry per keystroke, and Back should leave the page
 * rather than step through its filters.
 */

export type SearchRecord = Record<string, unknown>;

/** A value the URL should not carry: the default state is a bare URL. */
const isBlank = (value: unknown) => value === undefined || value === null || value === "";

/** `prev` with `patch` merged in; blank values drop their key. */
export function patchSearch(prev: SearchRecord, patch: SearchRecord): SearchRecord {
  const next: SearchRecord = { ...prev };
  for (const [key, value] of Object.entries(patch)) {
    if (isBlank(value)) delete next[key];
    else next[key] = value;
  }
  return next;
}

/**
 * A search param as text. The router parses `?q=12` into the number 12 and
 * `?q=true` into a boolean, so anything scalar is turned back into a string.
 */
export function readString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** `?page=` is one-based for people; the table's index is zero-based. */
export function readPageIndex(value: unknown): number {
  const page = typeof value === "number" ? value : Number.parseInt(readString(value), 10);
  return Number.isInteger(page) && page > 1 ? page - 1 : 0;
}

/** The first page is the default, so it leaves the URL bare. */
export function encodePageIndex(index: number): number | undefined {
  return index > 0 ? index + 1 : undefined;
}

export type SortEntry = { id: string; desc: boolean };

/** `?sort=starts_at.desc` → one sort entry; anything unreadable → unsorted. */
export function decodeSort(value: unknown): SortEntry[] {
  const raw = readString(value).trim();
  if (!raw) return [];
  const dot = raw.lastIndexOf(".");
  const direction = dot > 0 ? raw.slice(dot + 1) : "";
  if (direction === "asc" || direction === "desc") return [{ id: raw.slice(0, dot), desc: direction === "desc" }];
  return [{ id: raw, desc: false }];
}

/** The inverse of `decodeSort`; only the leading sort survives a round trip. */
export function encodeSort(state: readonly SortEntry[]): string | undefined {
  const first = state[0];
  return first ? `${first.id}.${first.desc ? "desc" : "asc"}` : undefined;
}

/** A param that must be one of `allowed`, else `fallback`. */
export function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const raw = readString(value);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export type UrlParamOptions<T> = {
  /** Raw router value (string, number, boolean or undefined) → state. */
  parse: (raw: unknown) => T;
  /** State → URL value; `undefined` (or "") drops the key, e.g. for the default. */
  serialize: (value: T) => unknown;
};

/** Stable key for comparing what was written with what the URL now says. */
const fingerprint = (value: unknown) => (isBlank(value) ? "" : JSON.stringify(value));

/**
 * A signal mirrored into one search param. Reads are local and immediate —
 * the input never waits for the router — and each write replaces the URL.
 * A change that did not come from this signal (a nav link back to the bare
 * route, the browser restoring an entry) flows back into it.
 */
export function createUrlParam<T>(key: string, options: UrlParamOptions<T>): [() => T, (value: T) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const urlValue = () => ((location().search ?? {}) as SearchRecord)[key];
  const [value, setValue] = createSignal<T>(options.parse(urlValue()));
  // Writes still on their way through the router. Each one arrives in order;
  // an arriving value we wrote is not an outside change and must not pull
  // the input back to an older keystroke.
  let pending: string[] = [];

  createEffect(
    on(
      () => fingerprint(options.serialize(options.parse(urlValue()))),
      (current) => {
        const index = pending.indexOf(current);
        if (index >= 0) {
          pending = pending.slice(index + 1);
          return;
        }
        pending = [];
        setValue(() => options.parse(urlValue()));
      },
      { defer: true },
    ),
  );

  const write = (next: T) => {
    setValue(() => next);
    const serialized = options.serialize(next);
    const current = fingerprint(options.serialize(options.parse(urlValue())));
    if (fingerprint(serialized) === current && pending.length === 0) return;
    pending.push(fingerprint(serialized));
    void navigate({
      to: location().pathname,
      search: (prev: SearchRecord) => patchSearch(prev ?? {}, { [key]: serialized }),
      hash: location().hash || undefined,
      replace: true,
      resetScroll: false,
    } as never);
  };

  return [value, write];
}

/** A text param (`?q=`, `?tab=`); `fallback` is the bare-URL value. */
export function createUrlString(key: string, fallback = ""): [() => string, (value: string) => void] {
  return createUrlParam(key, {
    parse: (raw) => readString(raw) || fallback,
    serialize: (value) => (value === fallback ? undefined : value),
  });
}

/** One of a fixed set (`?tab=sessions`, `?view=week`); `fallback` stays out of the URL. */
export function createUrlEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): [() => T, (value: T) => void] {
  return createUrlParam(key, {
    parse: (raw) => readEnum(raw, allowed, fallback),
    serialize: (value) => (value === fallback ? undefined : value),
  });
}

/** A zero-based page index kept one-based in `?page=`. */
export function createUrlPageIndex(key = "page"): [() => number, (value: number) => void] {
  return createUrlParam(key, { parse: readPageIndex, serialize: encodePageIndex });
}

/** Search-param names for one list; a prefix keeps two lists on a page apart. */
export function listParamKeys(prefix?: string) {
  const name = (key: string) => (prefix ? `${prefix}.${key}` : key);
  return { q: name("q"), page: name("page"), sort: name("sort") };
}
