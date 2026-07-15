# Rol Kapsamı Matrisi

## Sayfa Bazında Erişim

| Sayfa / Özellik | Öğrenci | Öğretmen | Müdür | Admin |
|---|---|---|---|---|
| Ana sayfa `/` | ✅ | ✅ | ✅ | ✅ |
| Profil `/profile` | ✅ | ✅ | ✅ | ✅ |
| Rehber `/guide` | ✅ | ✅ | ✅ | ✅ |
| Notlar `/notes` | ✅ | ✅ | ✅ | ✅ |
| Dersler `/courses` | ✅ | ✅ | ✅ | ✅ |
| Ders detay `/courses/:id` | ✅ | ✅ | ✅ | ✅ |
| Sınavlar `/exams` | ✅ | ✅ | ✅ | ✅ |
| Sınav detay `/exams/:id` | ✅ | ✅ | ✅ | ✅ |
| Sınav salonu `/exam-room/:id` | ✅ | ❌ | ❌ | ❌ |
| Canlı monitör `/exams/:id/live` | ❌ | ✅ | ✅ | ✅ |
| Etkinlikler `/events` | ✅ | ✅ | ✅ | ✅ |
| Etkinlik detay `/events/:id` | ✅ | ✅ | ✅ | ✅ |
| **Karnem `/marks`** | ✅ | ❌ | ❌ | ❌ |
| **Yoklamam `/attendance`** | ✅ | ❌ | ❌ | ❌ |
| Öğrenci not sorgula `/management/student-marks` | ❌ | ✅ | ✅ | ✅ |
| Öğrenci yoklama sorgula `/management/student-attendance` | ❌ | ✅ | ✅ | ✅ |
| Mesai `/work` | ❌ | ✅ | ✅ | ✅ |
| Ayarlar `/management/settings` | ❌ | ❌ | ✅ | ✅ |
| Dönemler `/management/terms` | ❌ | ❌ | ✅ | ✅ |
| Kullanıcı yönetimi `/admin/users` | ❌ | ❌ | ❌ | ✅ |

## Sidebar’da Ne Görsün?

| Sidebar grubu / item | Öğrenci | Öğretmen | Müdür | Admin |
|---|---|---|---|---|
| **classes** — Dersler / Sınavlar / Etkinlikler | ✅ | ✅ | ✅ | ✅ |
| **grades** — Karnem (`/marks`) | ✅ | ❌ | ❌ | ❌ |
| **grades** — Notlar | ✅ | ✅ | ✅ | ✅ |
| **students** — Yoklamam (`/attendance`) | ✅ | ❌ | ❌ | ❌ |
| **reports** — Öğrenci notları / yoklama / mesai | ❌ | ✅ | ✅ | ✅ |
| **settings** — Ayarlar / Dönemler | ❌ | ❌ | ✅ | ✅ |
| **admin** — Kullanıcılar | ❌ | ❌ | ❌ | ✅ |

## Dashboard Portal Kartları

| Kart | Öğrenci | Öğretmen | Müdür | Admin |
|---|---|---|---|---|
| Dersler | ✅ (kayıtlı) | ✅ | ✅ | ✅ |
| Sınavlar | ✅ (kayıtlı) | ✅ | ✅ | ✅ |
| Etkinlikler | ✅ | ✅ (teacher badge) | ✅ | ✅ |
| Karnem | ✅ | ❌ | ❌ | ❌ |
| Notlar | ✅ | ✅ | ✅ | ✅ |
| Öğrenci notları | ❌ | ✅ (teacher badge) | ✅ (teacher badge) | ✅ (teacher badge) |
| Öğrenci yoklaması | ❌ | ✅ (teacher badge) | ✅ (teacher badge) | ✅ (teacher badge) |
| Mesai | ❌ | ✅ (teacher badge) | ✅ (teacher badge) | ✅ (teacher badge) |
| Ayarlar | ❌ | ❌ | ✅ (manager badge) | ✅ (manager badge) |
| Dönemler | ❌ | ❌ | ✅ (manager badge) | ✅ (manager badge) |
| Kullanıcılar | ❌ | ❌ | ❌ | ✅ (admin badge) |

## Tespit Edilen Hatalar

| # | Hata | Dosya(lar) | Önem |
|---|---|---|---|
| 1 | `/marks` her role açık, RouteGuard yok, nav'da herkes görür | `marks-page.tsx`, `router.tsx`, `side-nav.tsx` | YÜKSEK |
| 2 | `/attendance` her role açık, RouteGuard yok, nav'da herkes görür | `attendance-page.tsx`, `router.tsx`, `side-nav.tsx` | YÜKSEK |
| 3 | `RouteGuard` student-only desteklemiyor (sadece `minRole` var) | `route-guard.tsx` | ORTA |
| 4 | `/work`, `/live`, `/settings`, `/terms` `beforeLoad` guard'ı yok (client-side RouteGuard var ama tutarsız) | `router.tsx` | DÜŞÜK |
| 5 | Sınav salonu butonu manager/admin'e görünüyor (tıklayınca hata) | `exam-detail-page.tsx` | DÜŞÜK |

## Backend Notu

Backend README Auth kolonunda:
- `GET /marks/me` = **student**
- `GET /attendance/me` = **student**
- `GET /marks/{user}` = **teacher**
- `GET /attendance/{user}` = **teacher**

Ancak kodda `*/me` endpoint'leri `CurrentUser` (rol kontrolü yok) ile çalışıyor, `RequireTeacher`/`RequireStudent` değil. README'de `student` yazıp kodda herkese açık olması tutarsız. Bu endpoint'ler ya `RequireStudent` ile korunmalı ya da mevcut davranış (herkese açık) README'e yansıtılmalı.

---

## Known Gaps (English — for backend team)

### Contract Mismatches

| # | Issue | BE field | FE field | Impact |
|---|-------|----------|----------|--------|
| 1 | Course term field name mismatch | `term` (string ID) | `term_id` (in FE type, write body is correct for POST/PATCH) | Term column and term filter on courses page almost always show "unassigned". The read response field is `term` but the FE type expects `term_id` |

### Role Guard Gaps (FE)

| # | Issue | Files | Priority |
|---|-------|-------|----------|
| 1 | `/marks` page has no student-only guard — any authenticated user can see it | `marks-page.tsx`, `router.tsx`, `side-nav.tsx` | HIGH |
| 2 | `/attendance` page has no student-only guard | `attendance-page.tsx`, `router.tsx`, `side-nav.tsx` | HIGH |
| 3 | `RouteGuard` only supports `minRole` (hierarchical: teacher→manager→admin); no `exactRole` or student-only mode exists | `route-guard.tsx` | MEDIUM |
| 4 | `/work`, `/live`, `/management/settings`, `/management/terms` have client-side `RouteGuard` but no router `beforeLoad` guard | `router.tsx` | LOW |

### Missing BE → FE coverage

| Endpoint | Purpose | Status |
|---|---|---|
| `PATCH /sessions/{id}` | Edit a course session | No helper, no UI |
| `GET /work/{user}` | Read another user's work log (manager+) | No helper, no UI |
| `PATCH /work/entries/{id}` | Correct a closed work stint (manager+) | No helper, no UI |
| `DELETE /work/entries/{id}` | Delete a work entry (manager+) | No helper, no UI |

### Incomplete Features

| Feature | Detail |
|---|---|
| `allow_rejoin` | Type + request body exist; form always sends `true`; no UI toggle |
| Exam weight badge | BE `ExamResponse` has no weight field; weight is derived from kind + settings. Badge never shows |
| Exam room CTA | Visible to managers/admins on exam detail page; the room page itself blocks non-students |

### Pagination Status

- All list endpoints accept `?limit=&offset=` and return `{ items, total, limit, offset }`.
- Main FE lists (courses, exams, events, notes, terms, work log, admin users) send real server page params.
- Nested lists (sessions, enrollments, attendance, exam results/questions) unwrap full `.items` — acceptable for school-scale data.
- Reports (`/marks/*`, `/attendance/*`) are not paged — aggregate report shapes.

---

## Kullanılan Kısaltmalar

- ✅ = erişim var
- ❌ = erişim yok
- FE = frontend (düzeltme sadece ön yüzde)
- BE = backend (düzeltme sunucu tarafında)
