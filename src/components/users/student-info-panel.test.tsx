import { render, screen } from "@solidjs/testing-library";
import type { User } from "@/api/client";
import { StudentInfoPanel } from "@/components/users/student-info-panel";
import { PreferencesProvider } from "@/stores/preferences-context";

let currentUser: User;
const getMyStudents = vi.fn();
const getUserById = vi.fn();

vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => currentUser }),
}));
vi.mock("@/api/parents", () => ({ getMyStudents: (...args: unknown[]) => getMyStudents(...args) }));
vi.mock("@/api/users", () => ({
  getUserById: (...args: unknown[]) => getUserById(...args),
  getUserSearch: vi.fn(),
}));
vi.mock("@/components/ui/side-panel", () => ({
  SidePanel: (props: { children: unknown }) => <div>{props.children as never}</div>,
}));

const student: User = {
  id: "student-1",
  username: "ada",
  role: "student",
  name: "Ada",
  surname: "Yılmaz",
  display_name: "Ada Yılmaz",
  email: "ada@example.com",
  phone: "+90 555 123 45 67",
  birth_date: "2013-01-02",
  gender: "female",
  address: "Çamlık Mahallesi, İzmir",
  emergency_contact_name: "Ayşe Yılmaz",
  emergency_contact_phone: "+90 555 222 33 44",
  bio: "Satranç kulübü",
  student_number: "1234",
  theme: null,
  language: null,
  palette_color: null,
};

function renderPanel(source: "self" | "parent") {
  return render(() => (
    <PreferencesProvider>
      <StudentInfoPanel
        open
        onOpenChange={() => {}}
        source={source}
        student={{ id: student.id, username: student.username, displayName: student.display_name }}
      />
    </PreferencesProvider>
  ));
}

afterEach(() => {
  getMyStudents.mockReset();
  getUserById.mockReset();
});

describe("StudentInfoPanel record details", () => {
  it("shows the complete available student record, including dates and gender", async () => {
    currentUser = student;
    renderPanel("self");

    expect(await screen.findByText("Çamlık Mahallesi, İzmir")).toBeTruthy();
    for (const value of ["Ada", "Yılmaz", "January 2, 2013", "Female", "ada@example.com", "Ayşe Yılmaz", "1234"]) {
      expect(screen.getByText(value)).toBeTruthy();
    }
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("shows the linked parent's own record without inventing private student details", async () => {
    currentUser = {
      ...student,
      id: "parent-1",
      username: "ayse",
      role: "parent",
      name: "Ayşe",
      surname: "Yılmaz",
      birth_date: "1985-05-06",
      address: "Veli adresi",
      student_number: null,
    };
    getMyStudents.mockResolvedValue({ items: [{ id: student.id, username: student.username, student_number: "1234" }] });
    renderPanel("parent");

    expect(await screen.findByText("Veli adresi")).toBeTruthy();
    expect(screen.getByText("1234")).toBeTruthy();
    expect(screen.getByText("May 6, 1985")).toBeTruthy();
    expect(screen.queryByText("January 2, 2013")).toBeNull();
    expect(getUserById).not.toHaveBeenCalled();
  });
});
