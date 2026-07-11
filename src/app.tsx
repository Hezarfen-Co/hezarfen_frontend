// Route table. Pages are lazy so the first paint ships only the shell plus the
// page in view. Everything except /login sits behind the auth gate.

import { Navigate, Route, Router } from "@solidjs/router";
import { Show, lazy, type ParentProps } from "solid-js";
import { Layout } from "./components/Layout";
import { Loading } from "./components/Feedback";
import { AuthProvider, useAuth } from "./lib/auth";

const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const Notes = lazy(() => import("./pages/Notes"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Exams = lazy(() => import("./pages/Exams"));
const ExamDetail = lazy(() => import("./pages/ExamDetail"));
const Marks = lazy(() => import("./pages/Marks"));
const Profile = lazy(() => import("./pages/Profile"));
const Users = lazy(() => import("./pages/Users"));
const NotFound = lazy(() => import("./pages/NotFound"));

/** Renders children once the session is known; bounces to /login when absent. */
function Protected(props: ParentProps) {
  const { user } = useAuth();
  return (
    <Show when={user() !== undefined} fallback={<Loading />}>
      <Show when={user()} fallback={<Navigate href="/login" />}>
        <Layout>{props.children}</Layout>
      </Show>
    </Show>
  );
}

export function App() {
  return (
    <Router root={(props) => <AuthProvider>{props.children}</AuthProvider>}>
      <Route path="/login" component={Login} />
      <Route component={Protected}>
        <Route path="/" component={Home} />
        <Route path="/notes" component={Notes} />
        <Route path="/events" component={Events} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/courses" component={Courses} />
        <Route path="/courses/:id" component={CourseDetail} />
        <Route path="/exams" component={Exams} />
        <Route path="/exams/:id" component={ExamDetail} />
        <Route path="/marks" component={Marks} />
        <Route path="/profile" component={Profile} />
        <Route path="/users" component={Users} />
      </Route>
      <Route path="*" component={NotFound} />
    </Router>
  );
}
