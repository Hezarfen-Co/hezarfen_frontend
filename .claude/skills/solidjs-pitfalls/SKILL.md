---
name: solidjs-pitfalls
description: The two high-cost SolidJS resource pitfalls in hezarfen_frontend — using resource.latest for always-rendered/shell reads to avoid whole-page blanking on refetch, and using a local signal (not mutate/refetch) for live save-on-click toggles to avoid refetch cascades. Load when touching createResource reads outside <Suspense>, polling, or inline PATCH toggles.
---

# SolidJS resource pitfalls

Baseline SolidJS rules (run-once, no destructure, signals, control-flow components) live in `AGENTS.md`. These two are the expensive, non-obvious ones.

## 1. `resource.latest` for reads outside `<Suspense>`

A bare `resource()` re-suspends on **every** `refetch()` — not just the first load, and `initialValue` does NOT stop it. If that read sits outside a `<Suspense>` (e.g. an always-rendered badge/count in a shell component mounted beside `<Outlet>`), the suspension bubbles up and **blanks the whole page** for the entire fetch duration, once per poll/refetch. Invisible on a fast local backend; a multi-second blank on a real one.

Rule:
- Reads under a page's `<Suspense>` → use `resource()`.
- Always-rendered / shell / badge reads of a periodically-refetched resource → use `resource.latest` (last value, no suspend).
- Poll-driven revalidation belongs behind `.latest`.

## 2. Live save-on-click toggles use a local signal, not `mutate`/`refetch`

For an inline switch that PATCHes one field (e.g. the exam-review toggle in `exam-detail-page.tsx`):

- Do NOT `refetch()` the shared resource → re-suspends → page spinner.
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
