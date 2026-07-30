import { fireEvent, render, screen } from "@solidjs/testing-library";
import type { ColumnDef } from "@tanstack/solid-table";
import { DataTable } from "@/components/ui/data-table";
import { PreferencesProvider } from "@/stores/preferences-context";

type Row = { name: string; role?: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { id: "update", header: "Role", cell: () => "Role" },
  { id: "actions", header: "Actions", cell: () => "…" },
];

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

test("resizes data columns with the keyboard and keeps actions fixed", () => {
  render(() => (
    <PreferencesProvider>
      <DataTable columns={columns} data={[{ name: "Ada" }]} storageKey="people" enableColumnVisibility={false} />
    </PreferencesProvider>
  ));

  const separator = screen.getAllByRole("separator", { name: "Sütun genişliğini ayarla" })[0];
  fireEvent.keyDown(separator, { key: "ArrowRight" });

  const saved = JSON.parse(localStorage.getItem("hezarfen.table.people") ?? "{}");
  expect(saved.sizing.name).toBe(158);
  expect(screen.getAllByRole("separator")).toHaveLength(2);
});

test("keeps only the rightmost action column sticky", () => {
  render(() => (
    <PreferencesProvider>
      <DataTable columns={columns} data={[{ name: "Ada" }]} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));

  const actionsHeader = screen.getByRole("columnheader", { name: "Actions" });
  expect(actionsHeader.classList).toContain("table-sticky-head");
  expect(actionsHeader.classList).toContain("z-30");
  const roleHeader = screen.getAllByRole("columnheader").find((header) => header.textContent?.startsWith("Role"));
  expect(roleHeader?.classList).not.toContain("table-sticky-head");
});

test("paginates tables by default", () => {
  const rows = Array.from({ length: 11 }, (_, index) => ({ name: `Person ${index + 1}` }));
  render(() => (
    <PreferencesProvider>
      <DataTable columns={[columns[0]]} data={rows} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));

  expect(screen.getByText("Person 10")).toBeTruthy();
  expect(screen.queryByText("Person 11")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Person 11")).toBeTruthy();
});

test("shows the pagination footer on a single page", () => {
  render(() => (
    <PreferencesProvider>
      <DataTable columns={[columns[0]]} data={[{ name: "Ada" }]} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));

  expect(screen.getByText("1 / 1")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
});
