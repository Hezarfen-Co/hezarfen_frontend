import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/solid-router";
import { Suspense, lazy, type Component } from "solid-js";
import { AppShell } from "@/components/layout/app-shell";
import { PageSpinner } from "@/components/ui/page-spinner";

function lazyRoute(loader: () => Promise<{ default: Component }>): Component {
  const Page = lazy(loader);
  return function LazyRoutePage() {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Page />
      </Suspense>
    );
  };
}

const LoginPage = lazyRoute(() => import("@/pages/login-page"));
const RegisterPage = lazyRoute(() => import("@/pages/register-page"));
const DashboardPage = lazyRoute(() => import("@/pages/dashboard-page"));
const NotesPage = lazyRoute(() => import("@/pages/notes-page"));
const EventsPage = lazyRoute(() => import("@/pages/events-page"));
const EventDetailPage = lazyRoute(() => import("@/pages/event-detail-page"));
const ExamsPage = lazyRoute(() => import("@/pages/exams-page"));
const ExamDetailPage = lazyRoute(() => import("@/pages/exam-detail-page"));
const CoursesPage = lazyRoute(() => import("@/pages/courses-page"));
const CourseDetailPage = lazyRoute(() => import("@/pages/course-detail-page"));
const MarksPage = lazyRoute(() => import("@/pages/marks-page"));
const AdminUsersPage = lazyRoute(() => import("@/pages/admin-users-page"));
const GuidePage = lazyRoute(() => import("@/pages/guide-page"));

function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <div class="space-y-2 py-16 text-center">
      <p class="text-lg font-medium">404</p>
      <a href="/" class="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Home
      </a>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes",
  component: NotesPage,
});

const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events",
  component: EventsPage,
});

const eventDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/$id",
  component: EventDetailPage,
});

const examsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exams",
  component: ExamsPage,
});

const examDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exams/$id",
  component: ExamDetailPage,
});

const coursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses",
  component: CoursesPage,
});

const courseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$id",
  component: CourseDetailPage,
});

const marksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marks",
  component: MarksPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide",
  component: GuidePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  notesRoute,
  eventsRoute,
  eventDetailRoute,
  coursesRoute,
  courseDetailRoute,
  examsRoute,
  examDetailRoute,
  marksRoute,
  adminUsersRoute,
  guideRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPendingComponent: PageSpinner,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}
