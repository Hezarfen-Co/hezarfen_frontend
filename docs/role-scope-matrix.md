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
| **Report card `/marks`** | ✅ | ❌ | ❌ | ❌ |
| **My attendance `/attendance`** | ✅ | ❌ | ❌ | ❌ |
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
| **classes** — Courses / Exams / Events | ✅ | ✅ | ✅ | ✅ |
| **grades** — Report card (`/marks`) | ✅ | ❌ | ❌ | ❌ |
| **grades** — Notes | ✅ | ✅ | ✅ | ✅ |
| **students** — My attendance (`/attendance`) | ✅ | ❌ | ❌ | ❌ |
| **reports** — Student marks / attendance / work | ❌ | ✅ | ✅ | ✅ |
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
| Enroll / unenroll students | ❌ | ✅ (course creator) | ✅ | ✅ |
| Edit / delete courses | ❌ | ✅ (course creator) | ✅ | ✅ |
| Create / edit / delete course sessions | ❌ | ✅ (course manager) | ✅ | ✅ |
| Take session roll call | ❌ | ✅ (session teacher or course manager) | ✅ | ✅ |
| Mark session teacher's own presence | ❌ | ❌ | ✅ | ✅ |
| Create exams | ❌ | ✅ (course manager) | ✅ | ✅ |
| Edit / delete exams | ❌ | ✅ (course manager) | ✅ | ✅ |
| Grade students | ❌ | ✅ (course manager) | ✅ | ✅ |
| Read exam results / statistics | ❌ | ✅ (course manager) | ✅ | ✅ |
| Read own exam result | ✅ | ❌ | ❌ | ❌ |
| Write exam questions | ❌ | ✅ (course manager) | ✅ | ✅ |
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

- **Hierarchical roles:** `student < teacher < manager < admin`. A higher role satisfies any lower requirement.
- **Course management rights:** course creator or `manager+`. Required for enrollment, session CRUD, exam CRUD, grading, roster read.
- **Ownership edits:** event/note edit/delete respects creator id. Manager+ overrides creator gate.
- **Student-only pages:** `/marks` (personal report card) and `/attendance` (personal attendance) are guarded by `RouteGuard exactRole="student"` and router `beforeLoad` redirect.
- **Management pages:** all `/management/*` routes require at least `teacher` (marks/attendance lookup) or `manager` (settings/terms/staff-work). Guarded by both `RouteGuard` and `beforeLoad`.
- **Data scope:** students see only enrolled/related data; teachers see managed course scope; manager+ sees all.

## Guard Implementation

| Guard mechanism | Where | Purpose |
|---|---|---|
| `RouteGuard` (client component) | Page component root | Blocks render; shows fallback |
| `RouteGuard exactRole` | `/marks`, `/attendance` | Student-only pages |
| `RouteGuard minRole` | Management pages | Teacher+ or manager+ |
| `beforeLoad` redirect (router) | Route definition | Redirects before page JS loads |
| `!isTeacherPlus()` | In-page logic | Exam room CTA, event self-mark |
| `canManage()` / `hasCourseManagementRights()` | Detail pages | Course action visibility |
| `canCreate` | List pages | Create button visibility |
| Nav `exactRole` | Sidebar items | Student-only nav links |
| Nav `minRole` | Sidebar items / groups | Teacher+, manager+, or admin only groups |

## Legend

- ✅ = access granted
- ❌ = access denied
- FE = frontend only change
- BE = backend change required
- (badge) = visual indicator showing minimum role requirement on dashboard cards
