---
name: solidjs-pitfalls
description: SolidJS rules and resource pitfalls for hezarfen_frontend — run-once model, no destructure, signals, control-flow components, resource.latest, local signal for toggles. Load when touching any Solid component, createResource reads outside <Suspense>, polling, or inline PATCH toggles.
---

# SolidJS rules & resource pitfalls

## Baseline rules — SolidJS is not React

Solid components run **once**; there is no re-render.

1. Never destructure props — use `props.title` or `splitProps`.
2. Signals are functions: read `count()`, write `setCount(v)`.
3. Use `createSignal`/`createMemo`/`createEffect`/`createResource` — never
   `useState`/`useEffect`/`useMemo`, no dependency arrays.
4. Conditional/list rendering: `<Show>`, `<For>`, `<Switch>/<Match>`; server data:
   `<Suspense>` + `createResource`.
5. Use `class`, not `className`. Route components are `lazy()`-loaded into the
   TanStack Router tree.

## Performance

- Every route component is `lazy()` (code-split per page).
- Server data goes through `createResource` → `<Suspense>` (lightweight fallback),
  `refetch()` after mutations.
- One `<Suspense>` boundary per page, no spinner-cascades, fixed-height list rows.

## Two expensive resource pitfalls

## 1. Import `createResource` from `@/lib/create-resource`, never `solid-js`

Solid's bare `resource()` re-suspends on **every** `refetch()` and every source change — `initialValue` does NOT stop it. The nearest `<Suspense>` then swaps its whole subtree for the fallback: a table card (header, search, pager) blanks after one row delete and loses its own page/query state; a read outside any page boundary blanks the whole route.

Rule:
- Always `import { createResource } from "@/lib/create-resource"`. Its accessor reads `.latest`: suspends only until the first value, then keeps the last value on screen while the next loads. `loading`/`error`/`state`/`latest`/`refetch`/`mutate` are unchanged.
- Stale data never crosses records: detail routes remount per `$id` (the router keys a match by its params).
- Show in-flight refresh with `resource.loading` where it matters, not a Suspense fallback.

## 2. Live save-on-click toggles use a local signal, not `mutate`/`refetch`

For an inline switch that PATCHes one field (e.g. the exam-review toggle in `exam-detail-page.tsx`):

- Do NOT `refetch()` the shared resource → a needless GET, and any dependent resource refetches too.
- Do NOT `mutate({...res, field})` either → mutating a shared resource changes its object identity, so every *other* `createResource` whose source reads it (directly or via a memo like `hasCourseManagementRights()`) re-runs and refetches, cascading the same spinner.

Instead keep a local signal, sync from the resource in a `createEffect`, flip optimistically, revert on failure:

```ts
const [on, setOn] = createSignal(false);
createEffect(() => { const e = res(); if (e) setOn(e.field); });
const toggle = async (next: boolean) => {
  if (saving()) return;
  setOn(next); setSaving(true);
  try { await patchX(id(), { field: next }); }
  catch (err) { setOn(!next); setError(fmt(err)); }
  finally { setSaving(false); }
};
```

A correct toggle fires exactly one PATCH and zero GETs. No success toast — the switch position is the feedback. Pitfall #1's `resource.latest` is the read-side companion (survive a refetch without blanking); this is the write-side (don't trigger the refetch at all). `mutate()` (`settings-page.tsx`) is fine for a form that owns its whole resource, but still cascades for a shared one — the local signal is the safe default.
