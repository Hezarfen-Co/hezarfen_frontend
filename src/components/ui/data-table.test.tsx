import { fireEvent, render, screen, within } from "@solidjs/testing-library";
import type { ColumnDef } from "@tanstack/solid-table";
import { DataTable } from "@/components/ui/data-table";
import { DataSection } from "@/components/ui/data-section";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesProvider } from "@/stores/preferences-context";

type Row = { name: string; role?: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { id: "update", header: "Role", cell: () => "Role" },
  {
    id: "actions",
    header: "Actions",
    meta: { headerClass: "w-14", cellClass: "w-40 text-right" },
    cell: () => "…",
  },
];

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

test("keeps only the rightmost action column sticky and fixed at 110x45", () => {
  render(() => (
    <PreferencesProvider>
      <DataTable columns={columns} data={[{ name: "Ada" }]} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));

  const actionsHeader = screen.getByRole("columnheader", { name: "Actions" });
  expect(actionsHeader.classList).toContain("table-sticky-head-right");
  expect(actionsHeader.classList).toContain("table-action-cell");
  expect(actionsHeader.classList).toContain("h-[45px]");
  expect(actionsHeader.classList).toContain("w-[110px]");
  expect(actionsHeader.classList).not.toContain("w-14");
  expect(actionsHeader.style.width).toBe("110px");
  expect(actionsHeader.classList).toContain("z-30");
  const actionsCell = screen.getByRole("cell", { name: "…" });
  expect(actionsCell.classList).toContain("table-action-cell");
  expect(actionsCell.classList).toContain("h-[45px]");
  expect(actionsCell.classList).toContain("w-[110px]");
  expect(actionsCell.classList).not.toContain("w-40");
  expect(actionsCell.classList).toContain("text-center");
  expect(actionsCell.classList).not.toContain("text-right");
  expect(actionsCell.style.width).toBe("110px");
  const columnTracks = document.querySelectorAll("col");
  expect(columnTracks[0]?.style.width).toBe("calc(50% - 55px)");
  expect(columnTracks[1]?.style.width).toBe("calc(50% - 55px)");
  expect(columnTracks[2]?.style.width).toBe("110px");
  const roleHeader = screen.getAllByRole("columnheader").find((header) => header.textContent?.startsWith("Role"));
  expect(roleHeader?.classList).not.toContain("table-sticky-head-right");
});

test("freezes the meta.stickyLeft column and aligns head + cell together", () => {
  const alignedColumns: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Name", meta: { stickyLeft: true } },
    { accessorKey: "role", header: "Role", meta: { align: "right" } },
  ];
  render(() => (
    <PreferencesProvider>
      <DataTable columns={alignedColumns} data={[{ name: "Ada", role: "Admin" }]} enableColumnVisibility={false} enableSorting={false} />
    </PreferencesProvider>
  ));

  const headers = screen.getAllByRole("columnheader");
  const nameHeader = headers.find((header) => header.textContent?.startsWith("Name"));
  expect(nameHeader?.classList).toContain("table-sticky-head-left");
  expect(nameHeader?.classList).toContain("left-0");

  const roleHeader = headers.find((header) => header.textContent?.startsWith("Role"));
  const roleCell = screen.getByRole("cell", { name: "Admin" });
  // Same alignment class on head and cell so columns never drift apart.
  expect(roleHeader?.classList).toContain("text-right");
  expect(roleCell.classList).toContain("text-right");
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

test("a display column renders its own cell instead of the empty dash", () => {
  // A column with no accessorFn has no value to be empty, so the empty-cell
  // fallback must not swallow its render function.
  render(() => (
    <PreferencesProvider>
      <DataTable
        columns={[
          { accessorKey: "name", header: "Name" },
          { id: "label", header: "Label", cell: (c) => `#${c.row.original.name}` },
        ] as ColumnDef<Row>[]}
        data={[{ name: "ada" }]}
      />
    </PreferencesProvider>
  ));

  expect(screen.getByText("#ada")).toBeTruthy();
});

test("the header action toolbar of every shared host can shrink below its max-content width", () => {
  // `shrink-0` plus the flex default `min-width: auto` pinned the toolbar to
  // its max-content width, so a wide action row pushed the whole document
  // past a 390px viewport instead of wrapping inside the constrained parent.
  render(() => (
    <>
      <PreferencesProvider>
        <DataTable
          columns={[columns[0]]}
          data={[{ name: "Ada" }]}
          enableColumnVisibility={false}
          actions={<button type="button">Export</button>}
        />
      </PreferencesProvider>
      <DataSection title="Card" actions={<button type="button">Export</button>} />
      <PageHeader title="Page" actions={<button type="button">Export</button>} />
    </>
  ));

  const toolbars = screen.getAllByText("Export").map((action) => action.parentElement as HTMLElement);
  expect(toolbars).toHaveLength(3);
  for (const toolbar of toolbars) {
    expect(toolbar.classList).toContain("flex-wrap");
    expect(toolbar.classList).toContain("min-w-0");
    expect(toolbar.classList).not.toContain("shrink-0");
  }
});

test("a search that matches nothing says so and clears back to the list", () => {
  render(() => (
    <PreferencesProvider>
      <DataTable
        columns={columns}
        data={[{ name: "Ada" }]}
        empty="No people yet."
        enableColumnVisibility={false}
        searchPredicate={(row, query) => row.name.toLowerCase().includes(query.toLowerCase())}
      />
    </PreferencesProvider>
  ));

  fireEvent.input(screen.getByRole("textbox"), { target: { value: "zzz" } });
  expect(screen.queryByText("No people yet.")).toBeNull();
  expect(screen.getByText(/Nothing matches|eşleşen kayıt yok/)).toBeTruthy();

  fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: /Clear search|Aramayı temizle/ }));
  expect(screen.getByText("Ada")).toBeTruthy();
});
