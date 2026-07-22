# Role Scope Matrix

## Page Access per Role

| Page / Feature | Student | Teacher | Manager | Admin |
|---|---|---|---|---|
| Home `/` | ✅ | ✅ | ✅ | ✅ |
| Profile `/profile` | ✅ | ✅ | ✅ | ✅ |
| Guide `/guide` | ✅ | ✅ | ✅ | ✅ |
| Notes `/notes` | ✅ | ✅ | ✅ | ✅ |
| Courses `/courses` | ✅ | ✅ | ✅ | ✅ |
| Course detail `/courses/:id` | ✅ | ✅ | ✅ | ✅ |
| Exams `/exams` | ✅ | ✅ | ✅ | ✅ |
| Exam detail `/exams/:id` | ✅ | ✅ | ✅ | ✅ |
| Exam room `/exam-room/:id` | ✅ | ❌ | ❌ | ❌ |
| Live monitor `/exams/:id/live` | ❌ | ✅ | ✅ | ✅ |
| Events `/events` | ✅ | ✅ | ✅ | ✅ |
| Event detail `/events/:id` | ✅ | ✅ | ✅ | ✅ |
| **Report card `/marks`** | ✅ | ❌ (FE) | ❌ (FE) | ❌ (FE) |
| My attendance `/attendance` | ✅ | ✅ | ✅ | ✅ |
| Student marks lookup `/management/student-marks` | ❌ | ✅ | ✅ | ✅ |
| Student attendance lookup `/management/student-attendance` | ❌ | ✅ | ✅ | ✅ |
| Work log `/work` | ❌ | ✅ | ✅ | ✅ |
| Staff work log `/management/staff-work` | ❌ | ❌ | ✅ | ✅ |
| Settings `/management/settings` | ❌ | ❌ | ✅ | ✅ |
| Terms `/management/terms` | ❌ | ❌ | ✅ | ✅ |
| User management `/admin/users` | ❌ | ❌ | ❌ | ✅ |

## Sidebar Visibility per Role

| Sidebar group / item | Student | Teacher | Manager | Admin |
|---|---|---|---|---|
| **classes** — Courses / Exams / Events / exam grades | ✅ | ✅ | ✅ | ✅ |
| **grades** — Defter (`/notes`) | ✅ | ✅ | ✅ | ✅ |
| **community** — Messages / Question pool | ✅ | ✅ | ✅ | ✅ |
| **students** — My attendance (`/attendance`) | ✅ | ✅ | ✅ | ✅ |
| **reports** — Student attendance / pomodoros / work | ❌ | ✅ | ✅ | ✅ |
| **reports** — Staff work log | ❌ | ❌ | ✅ | ✅ |
| **settings** — Settings / Terms | ❌ | ❌ | ✅ | ✅ |
| **admin** — Users | ❌ | ❌ | ❌ | ✅ |

## Dashboard Portal Cards per Role

| Card | Student | Teacher | Manager | Admin |
|---|---|---|---|---|
| Courses | ✅ (enrolled count) | ✅ | ✅ | ✅ |
| Exams | ✅ (enrolled scope) | ✅ | ✅ | ✅ |
| Events | ✅ | ✅ (teacher badge) | ✅ | ✅ |
| Report card | ✅ | ❌ | ❌ | ❌ |
| Messages | ✅ | ✅ | ✅ | ✅ |
| Notes | ✅ | ✅ | ✅ | ✅ |
| Student marks | ❌ | ✅ (teacher badge) | ✅ (teacher badge) | ✅ (teacher badge) |
| Student attendance | ❌ | ✅ (teacher badge) | ✅ (teacher badge) | ✅ (teacher badge) |
| Work log | ❌ | ✅ (teacher badge) | ✅ (teacher badge) | ✅ (teacher badge) |
| Settings | ❌ | ❌ | ✅ (manager badge) | ✅ (manager badge) |
| Terms | ❌ | ❌ | ✅ (manager badge) | ✅ (manager badge) |
| Users | ❌ | ❌ | ❌ | ✅ (admin badge) |

## Action Scope per Role

| Action | Student | Teacher | Manager | Admin |
|---|---|---|---|---|
| Create / edit / delete own notes | ✅ | ✅ | ✅ | ✅ |
| Mark own attendance on events | ✅ | ✅ | ✅ | ✅ |
| Mark other users' event attendance | ❌ | ✅ | ✅ | ✅ |
| Create / edit / delete events | ❌ | ✅ (creator or manager+) | ✅ | ✅ |
| Enroll students / unenroll any enrollment | ❌ | ✅ (course creator) | ✅ | ✅ |
| Edit / delete courses | ❌ | ✅ (course creator) | ✅ | ✅ |
| Create / edit / delete course sessions | ❌ | ✅ (course manager) | ✅ | ✅ |
| Create / edit / delete course subjects | ❌ | ✅ (course manager) | ✅ | ✅ |
| Take session roll call | ❌ | ✅ (session teacher or course manager) | ✅ | ✅ |
| Mark session teacher's own presence | ❌ | ❌ | ✅ | ✅ |
| Create exams | ❌ | ✅ (course manager) | ✅ | ✅ |
| Edit / delete exams | ❌ | ✅ (course manager) | ✅ | ✅ |
| Grade students | ❌ | ✅ (course manager) | ✅ | ✅ |
| Read exam results / statistics | ❌ | ✅ (course manager) | ✅ | ✅ |
| Read own exam result | ✅ | ❌ (FE) | ❌ (FE) | ❌ (FE) |
| Write exam questions | ❌ | ✅ (course manager) | ✅ | ✅ |
| Start / finish own pomodoro focus session | ✅ | ❌ | ❌ | ❌ |
| Read answer sheets | ❌ | ✅ (course manager) | ✅ | ✅ |
| Watch live monitor | ❌ | ✅ (course manager) | ✅ | ✅ |
| Sit an exam (attempt) | ✅ | ❌ | ❌ | ❌ |
| Work check-in / check-out | ❌ | ✅ | ✅ | ✅ |
| Read / correct any user's work log | ❌ | ❌ | ✅ | ✅ |
| Read school settings & terms | ✅ | ✅ | ✅ | ✅ |
| Edit school settings & terms | ❌ | ❌ | ✅ | ✅ |
| Change user roles | ❌ | ❌ | ❌ | ✅ |
| Look up any user | ❌ | ✅ (search) | ✅ (search) | ✅ (full) |

## Architectural Rules

- **Hierarchical roles:** `student < teacher < manager < admin`. A higher role satisfies any lower requirement. The only exception is `exactRole` page guards (below), which are presentation filters — backend authorization never breaks the hierarchy.
- **Course management rights:** course creator or `manager+`. Required for enrollment, subject/session CRUD, exam CRUD, grading, roster read.
- **Ownership edits:** event/note edit/delete respects creator id. Manager+ overrides creator gate.
- **Student-only actions (BE-enforced):** enrolling, sitting exams (including the exam-room WebSocket — the role is re-checked on every answer save, so a mid-exam promotion closes the sheet), being graded, and being marked on lesson roll call all require the target's live role to be `student`. Unenroll, result removal, and roll-call removal stay role-free on the target, so stale rows left behind by a promotion remain removable.
- **Student-only pages (FE-only):** `/marks` (personal report card) is hidden from staff by `RouteGuard exactRole="student"` + router `beforeLoad` redirect as presentation, not security — the backend serves `GET /marks/me` and `GET /exams/{id}/result` to any authenticated user; a staff member's report is just permanently empty (staff cannot be enrolled or graded). Do not "fix" the backend to 403 these: a student promoted to staff must keep read access to their own history.
- **My attendance:** `/attendance` renders for every role. Staff have real rows behind it — their own event attendance and their manager-marked session-presence records — so it is not an empty page for them.
- **Management pages:** all `/management/*` routes require at least `teacher` (marks/attendance lookup) or `manager` (settings/terms/staff-work). Guarded by both `RouteGuard` and `beforeLoad`.
- **Data scope:** students see only enrolled/related data; teachers see managed course scope; manager+ sees all.

## Guard Implementation

| Guard mechanism | Where | Purpose |
|---|---|---|
| `RouteGuard` (client component) | Page component root | Blocks render; shows fallback |
| `RouteGuard exactRole` | `/marks` | Student-only page (FE presentation; BE allows the own-data read) |
| `RouteGuard minRole` | Management pages | Teacher+ or manager+ |
| `beforeLoad` redirect (router) | Route definition | Redirects before page JS loads |
| `isStudent()` | In-page logic | Exam room CTA, own-result section on exam detail |
| `UserSearchSelect role="student"` | Enroll picker, student-marks lookup | Offers only students — matches the BE student-only walls |
| `canManage()` / `hasCourseManagementRights()` | Detail pages | Course action visibility |
| `canCreate` | List pages | Create button visibility |
| Nav `exactRole` | Sidebar items | Student-only nav links |
| Nav `minRole` | Sidebar items / groups | Teacher+, manager+, or admin only groups |

## Legend

- ✅ = access granted
- ❌ = access denied
- ❌ (FE) = hidden by the frontend only — the backend permits the underlying own-data read; never treat as a security boundary
- (badge) = optional neutral min-role chip on dashboard portal cards (muted border; not a colored accent)
