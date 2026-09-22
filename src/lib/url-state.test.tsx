import { createRoot, createSignal } from "solid-js";
import {
  createUrlEnum,
  createUrlString,
  decodeSort,
  encodePageIndex,
  encodeSort,
  listParamKeys,
  patchSearch,
  readEnum,
  readPageIndex,
  readString,
} from "@/lib/url-state";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: null as null | (() => { pathname: string; search: Record<string, unknown>; hash: string }),
}));

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => router.navigate,
  useLocation: () => router.location,
}));

afterEach(() => vi.clearAllMocks());

test("patchSearch merges and drops blank values", () => {
  expect(patchSearch({ kind: "club", q: "alg", page: 2 }, { q: "", page: undefined, sort: "title.asc" })).toEqual({
    kind: "club",
    sort: "title.asc",
  });
});

test("readString turns router-parsed scalars back into text", () => {
  expect(readString("abc")).toBe("abc");
  expect(readString(12)).toBe("12");
  expect(readString(true)).toBe("true");
  expect(readString({ a: 1 })).toBe("");
  expect(readString(undefined)).toBe("");
});

test("pages are one-based in the URL and zero-based in the table", () => {
  expect(readPageIndex(3)).toBe(2);
  expect(readPageIndex("2")).toBe(1);
  expect(readPageIndex(1)).toBe(0);
  expect(readPageIndex(0)).toBe(0);
  expect(readPageIndex(-4)).toBe(0);
  expect(readPageIndex("x")).toBe(0);
  expect(readPageIndex(undefined)).toBe(0);
  expect(encodePageIndex(0)).toBeUndefined();
  expect(encodePageIndex(2)).toBe(3);
});

test("sort round-trips through one param", () => {
  expect(decodeSort("starts_at.desc")).toEqual([{ id: "starts_at", desc: true }]);
  expect(decodeSort("title.asc")).toEqual([{ id: "title", desc: false }]);
  expect(decodeSort("title")).toEqual([{ id: "title", desc: false }]);
  expect(decodeSort("a.b.desc")).toEqual([{ id: "a.b", desc: true }]);
  expect(decodeSort("")).toEqual([]);
  expect(decodeSort(undefined)).toEqual([]);
  expect(encodeSort([{ id: "starts_at", desc: true }])).toBe("starts_at.desc");
  expect(encodeSort([])).toBeUndefined();
});

test("readEnum falls back on anything outside the set", () => {
  expect(readEnum("week", ["day", "week", "month"] as const, "month")).toBe("week");
  expect(readEnum("year", ["day", "week", "month"] as const, "month")).toBe("month");
});

test("listParamKeys prefixes keys for a second list on the page", () => {
  expect(listParamKeys()).toEqual({ q: "q", page: "page", sort: "sort" });
  expect(listParamKeys("roster")).toEqual({ q: "roster.q", page: "roster.page", sort: "roster.sort" });
});

test("a URL param starts from the URL, writes with replace, and follows outside changes", () => {
  const [location, setLocation] = createSignal({ pathname: "/exams", search: { tab: "draft", q: "alg" } as Record<string, unknown>, hash: "" });
  router.location = location;

  // Effects start once the root has been built, as they do in a mounted page.
  const { tab, setTab, query, setQuery, dispose } = createRoot((dispose) => {
    const [tab, setTab] = createUrlEnum("tab", ["all", "draft"] as const, "all");
    const [query, setQuery] = createUrlString("q");
    return { tab, setTab, query, setQuery, dispose };
  });
  expect(tab()).toBe("draft");
  expect(query()).toBe("alg");

  setQuery("algebra");
  expect(query()).toBe("algebra");
  const call = router.navigate.mock.calls.at(-1)?.[0];
  expect(call).toMatchObject({ to: "/exams", replace: true, resetScroll: false });
  expect(call.search({ tab: "draft", q: "alg" })).toEqual({ tab: "draft", q: "algebra" });

  // The default value leaves the URL bare.
  setTab("all");
  expect(router.navigate.mock.calls.at(-1)?.[0].search({ tab: "draft" })).toEqual({});

  // The router catches up with our own writes: nothing is pulled back.
  setLocation({ pathname: "/exams", search: { tab: "draft", q: "algebra" }, hash: "" });
  expect(query()).toBe("algebra");
  setLocation({ pathname: "/exams", search: { q: "algebra" }, hash: "" });
  expect(tab()).toBe("all");

  // A change from elsewhere (a nav link to the bare route) flows back in.
  setLocation({ pathname: "/exams", search: {}, hash: "" });
  expect(query()).toBe("");
  dispose();
});
