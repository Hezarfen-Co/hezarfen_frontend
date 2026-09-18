import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import { CelebiLauncher } from "@/components/ai/celebi-launcher";
import { PreferencesProvider } from "@/stores/preferences-context";

const { authUser } = vi.hoisted(() => ({ authUser: { role: "student" as string } }));

vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "u-1", username: "demo", role: authUser.role }) }),
}));
vi.mock("@/stores/celebi-panel", () => ({ openCelebiPanel: () => undefined }));

function mount() {
  return render(() => (
    <PreferencesProvider>
      <CelebiLauncher />
    </PreferencesProvider>
  ));
}

afterEach(cleanup);

test("a student gets questions the assistant answers for students", () => {
  authUser.role = "student";
  const { container } = mount();
  expect(container.textContent).toContain("Bu hafta hangi ödevlerin teslimi var?");
  expect(container.textContent).toContain("Notlarımı nereden görürüm?");
  expect(container.textContent).not.toContain("Yoklama nasıl alınır?");
  expect(container.textContent).not.toContain("Yeni akademik dönem eklemek istiyorum");
});

test("a teacher gets the teacher questions, not the student ones", () => {
  authUser.role = "teacher";
  const { container } = mount();
  expect(container.textContent).toContain("Yoklama nasıl alınır?");
  expect(container.textContent).toContain("Sınavı nasıl puanlarım?");
  expect(container.textContent).not.toContain("Bu hafta hangi ödevlerin teslimi var?");
});

test.each(["manager", "admin"])("a %s gets the school-management questions", (role) => {
  authUser.role = role;
  const { container } = mount();
  expect(container.textContent).toContain("Yeni akademik dönem eklemek istiyorum");
  expect(container.textContent).toContain("Personel mesai kayıtlarını nereden yönetirim?");
  expect(container.textContent).not.toContain("Yoklama nasıl alınır?");
});
