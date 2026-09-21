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
  // Plain percentages: Chrome reads a %-and-px calc() on a table column as
  // auto and splits the table evenly, whatever each column's size says.
  expect(columnTracks[0]?.style.width).toBe("50%");
  expect(columnTracks[1]?.style.width).toBe("50%");
  expect(columnTracks[2]?.style.width).toBe("110px");
  const roleHeader = screen.getAllByRole("columnheader").find((header) => header.textContent?.startsWith("Role"));
  expect(roleHeader?.classList).not.toContain("table-sticky-head-right");
});

test("freezes the meta.stickyLeft column and keeps the table centered", () => {
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
  // List tables use one consistent centered alignment, including numeric columns.
  expect(roleHeader?.classList).toContain("text-center");
  expect(roleCell.classList).toContain("text-center");
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

test("halves the page on a phone", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const rows = Array.from({ length: 11 }, (_, index) => ({ name: `Person ${index + 1}` }));
  try {
    render(() => (
      <PreferencesProvider>
        <DataTable columns={[columns[0]]} data={rows} enableColumnVisibility={false} />
      </PreferencesProvider>
    ));

    expect(screen.getByText("Person 5")).toBeTruthy();
    expect(screen.queryByText("Person 6")).toBeNull();
    expect(screen.getByText("1 / 3")).toBeTruthy();
  } finally {
    vi.unstubAllGlobals();
  }
});

test("a single page keeps the row count but drops the page buttons", () => {
  render(() => (
    <PreferencesProvider>
      <DataTable columns={[columns[0]]} data={[{ name: "Ada" }]} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));

  expect(screen.getByText("1-1 / 1")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
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

test("a server-paged table offers no header sort, since it could only sort one page", () => {
  const sortable: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name" }];
  const { unmount } = render(() => (
    <PreferencesProvider>
      <DataTable columns={sortable} data={[{ name: "Ada" }]} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));
  expect(screen.getByRole("button", { name: /Name/ })).toBeTruthy();
  unmount();

  render(() => (
    <PreferencesProvider>
      <DataTable
        columns={sortable}
        data={[{ name: "Ada" }]}
        enableColumnVisibility={false}
        manualPagination={{ pageIndex: 0, pageSize: 10, total: 40, onPageChange: () => {} }}
      />
    </PreferencesProvider>
  ));
  expect(screen.queryByRole("button", { name: /^Name/ })).toBeNull();
});

test("on a phone-width screen rows render as labelled cards instead of a sideways table", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  const cardColumns: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "role", header: "Role" },
    { id: "actions", header: "Actions", cell: () => <button type="button">Menu</button> },
  ];
  const onRowClick = vi.fn();
  render(() => (
    <PreferencesProvider>
      <DataTable columns={cardColumns} data={[{ name: "Ada", role: "teacher" }]} enableColumnVisibility={false} onRowClick={onRowClick} />
    </PreferencesProvider>
  ));

  expect(screen.queryByRole("table")).toBeNull();
  const card = screen.getByRole("listitem");
  expect(within(card).getByText("Ada")).toBeTruthy();
  expect(within(card).getByText("Role")).toBeTruthy();
  expect(within(card).getByText("teacher")).toBeTruthy();

  fireEvent.click(within(card).getByRole("button", { name: "Menu" }));
  expect(onRowClick).not.toHaveBeenCalled();
  fireEvent.click(within(card).getByText("teacher"));
  expect(onRowClick).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
