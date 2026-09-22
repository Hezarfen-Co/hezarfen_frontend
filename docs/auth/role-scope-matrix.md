# Role Scope Matrix

## Page Access per Role

| Page / Feature | Student | Teacher | Manager | Admin |
|---|---|---|---|---|
| Home `/` | ✅ | ✅ | ✅ | ✅ |
| Profile `/profile` | ✅ | ✅ | ✅ | ✅ |
| Guide `/guide` | ✅ | ✅ | ✅ | ✅ |
| Notes `/notes` | ✅ | ✅ | ✅ | ✅ |
| Courses `/courses` | ✅ | ✅ | ✅ | ✅ |
| Students hub `/students` | ❌ | ✅ | ✅ | ✅ |
| School hub `/school` | ❌ | ❌ | ✅ | ✅ |
| Course detail `/courses/:id` | ✅ | ✅ | ✅ | ✅ |
| Exams `/exams` | ✅ | ✅ | ✅ | ✅ |
| Exam detail `/exams/:id` | ✅ | ✅ | ✅ | ✅ |
| Exam room `/exam-room/:id` | ✅ | ❌ | ❌ | ❌ |
| Live monitor `/exams/:id/live` | ❌ | ✅ | ✅ | ✅ |
| Question bank `/question-bank` | ❌ | ✅ | ✅ | ✅ |
| Events `/events` | ✅ | ✅ | ✅ | ✅ |
| Event detail `/events/:id` | ✅ | ✅ | ✅ | ✅ |
| Appointments `/appointments` | ✅ (book + own) | ✅ (publish/manage own) | ✅ (manage all) | ✅ (manage all) |
| Meals `/meals`, `/meals/:id` | ✅ (self) | ✅ (service) | ✅ (manage) | ✅ (manage + credit) |
| **Progress `/marks` (Report card + Attendance)** | ✅ | ❌ (FE) | ❌ (FE) | ❌ (FE) |
| Student marks lookup `/management/student-marks` | ❌ | ✅ | ✅ | ✅ |
| Student attendance lookup `/management/student-attendance` | ❌ | ✅ | ✅ | ✅ |
| Work log `/work` | ❌ | ✅ | ✅ | ✅ |
| Staff work log `/management/staff-work` | ❌ | ❌ | ✅ | ✅ |
| Settings `/management/settings` | ❌ | ❌ | ✅ | ✅ |
| Terms `/management/terms` | ❌ | ❌ | ✅ | ✅ |
| User management `/admin/users` | ❌ | ❌ | ❌ | ✅ |
| License & modules `/management/modules` (read-only) | ❌ | ❌ | ❌ | ✅ |
| Student pomodoro lookup `/management/pomodoros` | ❌ | ✅ | ✅ | ✅ |

Parent pages: `/students` (progress report) plus `/students/attendance`,
`/students/exams`, `/students/study` — the same page opening a linked child on
that tab. Study reads `GET /pomodoro/{user}` (parent link), shown only when the
school has the `pomodoro` module.

## Builder (Operator) Surface

Not a school role. A builder session (`builder.` cookie) is 401 on every school
route and a school session is 401 here, so these pages carry their own
`BuilderProvider`/`BuilderGuard` instead of `RouteGuard`.

| Page | Purpose |
|---|---|
| `/builder/login` | Operator sign-in (linked from the school login footer) |
| `/builder` | School list: create (with first admin + module set), suspend/activate, delete |
| `/builder/schools/:id` | Rename/status, module switchboard (per module + per package), admin password reset, enter as admin |

## Primary Navigation per Role

| Destination | Student | Teacher | Manager | Admin | Parent |
|---|---|---|---|---|---|
| Today `/` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Classes `/courses` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Students `/students` | ❌ | ✅ | ✅ | ✅ | ❌ |
| Children `/students` | ❌ | ❌ | ❌ | ❌ | ✅ |
| Calendar `/calendar` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progress `/marks` | ✅ | ❌ | ❌ | ❌ | ❌ |
| School `/school` | ❌ | ❌ | ✅ | ✅ | ❌ |
| Meals `/meals` | ❌ | ❌ | ❌ | ❌ | ✅ |

Primary destinations stay compact. Every role-valid list page is also exposed
in the grouped sidebar/mobile drawer, gated by the school's modules:
courses, notes, questions, events, meals, appointments and messages for every
role the backend serves them to; terms, student marks/pomodoro lookups and the
work log for staff; license modules for admin. Appointments is directly
available there for every role. Detail pages remain
reachable from their parent lists, and Guide remains in the account menu.

## Dashboard Scope per Role

| Role | Highlights | Charts | Secondary panel |
|---|---|---|---|
| Student | courses, exams, average, attendance | course-average bars + attendance split | none |
| Teacher | courses, exams, events, homework | course-capacity bars + workload split | Question Bank / Question Pool |
| Manager/admin | courses, exams, events, meals | course-capacity bars + workload split | Question Bank / Question Pool |
| Parent | children, appointments, meals | none | none |

All roles receive active/today/soon deadline rows, including their appointments,
from data available to their scope. Rows navigate to exam, event, homework detail
or appointments. Counts and charts use current API fields only; no trends,
inferred priority, refresh control, card ordering, or mutation actions.

## Action Scope per Role

| Action | Student | Teacher | Manager | Admin |
|---|---|---|---|---|
| Create / edit / delete own notes | ✅ | ✅ | ✅ | ✅ |
| Mark own attendance on events | ✅ | ✅ | ✅ | ✅ |
| Mark other users' event attendance | ❌ | ✅ | ✅ | ✅ |
| Create / edit / delete events | ❌ | ✅ (creator or manager+) | ✅ | ✅ |
| Publish / delete appointment slots | ❌ | ✅ (own slots) | ✅ (any) | ✅ (any) |
| Approve / reject / reschedule / cancel bookings | ❌ | ✅ (own slots) | ✅ (any) | ✅ (any) |
| Book an appointment (+ cancel / accept reschedule) | ✅ (student & parent) | ❌ | ❌ | ❌ |
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
<!-- Own-result review (own answer sheet + past attempts) is additionally gated on the exam's `allow_review` flag AND the teacher having marked the student. -->

| Write exam questions | ❌ | ✅ (course manager) | ✅ | ✅ |
| Create bank templates | ❌ | ✅ (course manager) | ✅ | ✅ |
| Edit / delete bank templates | ❌ | ✅ (own only) | ✅ (own only) | ✅ (any) |
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
| Book/cancel meal | ✅ (self; parent linked child) | ❌ | ❌ | ❌ |
| Record meal service | ❌ | ✅ | ✅ | ✅ |
| Manage menus/dishes/dietary profiles | ❌ | ❌ | ✅ | ✅ |
| Record append-only meal credit | ❌ | ❌ | ❌ | ✅ |

## Architectural Rules

- **Hierarchical roles:** `student < teacher < manager < admin`. A higher role satisfies any lower requirement. The only exception is `exactRole` page guards (below), which are presentation filters — backend authorization never breaks the hierarchy.
- **Course management rights:** course creator or `manager+`. Required for enrollment, subject/session CRUD, exam CRUD, grading, roster read.
- **Ownership edits:** event/note edit/delete respects creator id. Manager+ overrides creator gate.
- **Student-only actions (BE-enforced):** enrolling, sitting exams (including the exam-room WebSocket — the role is re-checked on every answer save, so a mid-exam promotion closes the sheet), being graded, and being marked on lesson roll call all require the target's live role to be `student`. Unenroll, result removal, and roll-call removal stay role-free on the target, so stale rows left behind by a promotion remain removable.
- **Student Progress (FE-only):** `/marks` combines Report card and Attendance
  tabs and is hidden from staff with `RouteGuard exactRole="student"`.
  `/attendance` is a compatibility redirect to the Attendance tab.
- **Management pages:** all `/management/*` routes require at least `teacher` (marks/attendance lookup) or `manager` (settings/terms/staff-work). Guarded by both `RouteGuard` and `beforeLoad`.
- **Data scope:** students see only enrolled/related data; teachers see managed course scope; manager+ sees all.

## Guard Implementation

| Guard mechanism | Where | Purpose |
|---|---|---|
| `RouteGuard` (client component) | Page component root | Blocks render; shows fallback |
| `RouteGuard exactRole` | `/marks` | Student-only Progress page |
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
