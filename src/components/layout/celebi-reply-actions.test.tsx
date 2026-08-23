import { render, screen } from "@solidjs/testing-library";
import { CelebiReplyActions } from "@/components/layout/celebi-reply-actions";
import { PreferencesProvider } from "@/stores/preferences-context";

const noop = () => {};

function mount(props: Parameters<typeof CelebiReplyActions>[0]) {
  return render(() => (
    <PreferencesProvider>
      <CelebiReplyActions {...props} />
    </PreferencesProvider>
  ));
}

test("renders nothing when the answer carries neither half", () => {
  const { container } = mount({ onNavigate: noop, onPick: noop });
  expect(container.textContent).toBe("");
});

test("navigates with the route the answer offered", () => {
  const routes: string[] = [];
  mount({
    navigation: { route: "/exams", label: "Sınavlar" },
    onNavigate: (route) => routes.push(route),
    onPick: noop,
  });
  screen.getByText("Sınavlar").click();
  expect(routes).toEqual(["/exams"]);
});

test("drops a navigation that would leave the app", () => {
  mount({
    navigation: { route: "//evil.example", label: "Sınavlar" },
    onNavigate: noop,
    onPick: noop,
  });
  expect(screen.queryByText("Sınavlar")).toBeNull();
});

test("asks the picked suggestion, and shows at most three", () => {
  const asked: string[] = [];
  mount({
    suggestions: ["Bugün dersim var mı?", "  ", "Sınavlarım ne zaman?", "Yoklamam nasıl?", "Fazlası"],
    onNavigate: noop,
    onPick: (text) => asked.push(text),
  });
  expect(screen.queryByText("Fazlası")).toBeNull();
  screen.getByText("Sınavlarım ne zaman?").click();
  expect(asked).toEqual(["Sınavlarım ne zaman?"]);
});
