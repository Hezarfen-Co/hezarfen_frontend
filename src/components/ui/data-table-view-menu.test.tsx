import { fireEvent, render, screen } from "@solidjs/testing-library";
import { DataTableViewMenu } from "@/components/ui/data-table-view-menu";
import { PreferencesProvider } from "@/stores/preferences-context";

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => undefined));
afterEach(() => vi.restoreAllMocks());

test("opens the columns menu from its trigger", async () => {
  render(() => (
    <PreferencesProvider>
      <DataTableViewMenu
        columns={[{ id: "email", label: "E-posta", visible: true, toggle: () => undefined }]}
        density="compact"
        onDensityChange={() => undefined}
      />
    </PreferencesProvider>
  ));

  fireEvent.pointerDown(screen.getByRole("button", { name: /sütunlar|columns/i }));

  expect(await screen.findByText("E-posta")).toBeTruthy();
});
