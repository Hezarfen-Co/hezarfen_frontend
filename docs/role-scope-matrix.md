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

## Kullanılan Kısaltmalar

- ✅ = erişim var
- ❌ = erişim yok
- FE = frontend (düzeltme sadece ön yüzde)
- BE = backend (düzeltme sunucu tarafında)
