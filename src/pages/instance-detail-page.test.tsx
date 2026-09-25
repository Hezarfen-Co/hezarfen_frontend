import { cleanup, render, screen } from "@solidjs/testing-library";
import InstanceDetailPage from "@/pages/instance-detail-page";

const instance = {
  id: "instance-1",
  class: "class-1",
  course: "course-1",
  offering: "offering-1",
  title: "Matematik",
  title_overridden: false,
  description: "",
  description_overridden: false,
  ders_saati: 4,
  ders_saati_overridden: false,
  counts_toward_karne: true,
  counts_toward_karne_overridden: false,
  subjects_inherited: true,
  subjects: [],
  exam_weights_inherited: true,
  exam_weights: [],
  weekly_plan_inherited: true,
  weekly_plan: [],
  enrollment_count: 0,
  teachers: [],
};

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { children: unknown }) => <a>{props.children}</a>,
  Navigate: () => <span>redirect</span>,
  useNavigate: () => vi.fn(),
  useParams: () => () => ({ id: "instance-1" }),
  useLocation: () => () => ({ pathname: "/instances/instance-1", search: {}, hash: "" }),
}));

vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "u-1", username: "admin", role: "manager", name: "Admin", surname: "User" }),
    loading: () => false,
    error: () => undefined,
    refresh: async () => undefined,
  }),
}));

vi.mock("@/stores/modules-context", () => ({
  useModules: () => ({
    enabled: () => null,
    loading: () => false,
    isEnabled: () => true,
    refresh: () => {},
  }),
}));

vi.mock("@/stores/preferences-context", () => ({
  useT: () => (key: string) => key,
}));

vi.mock("@/api/classes", () => ({
  getClassById: async () => ({ id: "class-1", name: "9-A", teacher: null }),
}));

vi.mock("@/api/courses", () => ({
  getCourseById: async () => ({ id: "course-1", title: "Matematik" }),
  getCourseSubjects: async () => ({ items: [], total: 0 }),
}));

vi.mock("@/api/limits", () => ({
  getLimits: async () => ({}),
}));

vi.mock("@/api/instances", () => ({
  getInstanceById: async () => instance,
  getInstanceEnrollments: async () => ({ items: [], total: 0 }),
  getInstanceExams: async () => ({ items: [], total: 0 }),
  patchInstanceById: async () => instance,
  postInstanceEnrollment: async () => ({ id: "enroll-1" }),
  postInstanceExam: async () => ({ id: "exam-1" }),
  deleteInstanceEnrollmentByUserId: async () => undefined,
}));

vi.mock("@/api/settings", () => ({
  getSettings: async () => ({ exam_kinds: [] }),
}));

vi.mock("@/api/exams", () => ({
  patchExamById: async () => ({ id: "exam-1" }),
}));

afterEach(() => {
  cleanup();
});

test("instance page renders instead of reading canManage before it exists", async () => {
  render(() => <InstanceDetailPage />);
  expect(await screen.findByText("weeklyPlan.tab")).toBeTruthy();
  expect(screen.getByText("Matematik")).toBeTruthy();
});
