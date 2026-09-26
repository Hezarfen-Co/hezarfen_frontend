import { createSignal } from "solid-js";
import { Portal } from "solid-js/web";
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

test("freezes the meta.stickyLeft column and centres headers and left-aligns cells", () => {
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
  expect(roleCell.classList).toContain("text-left");
});

/** Stand-in IntersectionObserver whose callback a test fires by hand. */
function stubIntersectionObserver() {
  const callbacks: IntersectionObserverCallback[] = [];
  class FakeObserver {
    constructor(callback: IntersectionObserverCallback) {
      callbacks.push(callback);
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return () => {
    for (const callback of callbacks) callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  };
}

test("reveals rows in steps instead of paging", async () => {
  const reachEnd = stubIntersectionObserver();
  const rows = Array.from({ length: 120 }, (_, index) => ({ name: `Person ${index + 1}` }));
  try {
    render(() => (
      <PreferencesProvider>
        <DataTable columns={[columns[0]]} data={rows} enableColumnVisibility={false} />
      </PreferencesProvider>
    ));

    expect(screen.getByText("Person 50")).toBeTruthy();
    expect(screen.queryByText("Person 51")).toBeNull();
    expect(screen.getByText(/(Showing 50 of 120|120 kayıttan 50)/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    reachEnd();
    // jsdom lays nothing out, so the sentinel always reads as near the end
    // and each reveal chains into the next until the list is complete.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText("Person 120")).toBeTruthy();
  } finally {
    vi.unstubAllGlobals();
  }
});

test("without IntersectionObserver every row renders, with the total under the list", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  const rows = Array.from({ length: 60 }, (_, index) => ({ name: `Person ${index + 1}` }));
  try {
    render(() => (
      <PreferencesProvider>
        <DataTable columns={[columns[0]]} data={rows} enableColumnVisibility={false} />
      </PreferencesProvider>
    ));
    expect(screen.getByText("Person 60")).toBeTruthy();
    expect(screen.getByText(/^(Total|Toplam): 60$/)).toBeTruthy();
  } finally {
    vi.unstubAllGlobals();
  }
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
  expect(screen.getByText(/No results for “zzz”|“zzz” için sonuç yok/)).toBeTruthy();

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

test("a pick in a row's portalled menu does not also open the row", () => {
  const portalColumns: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Name" },
    {
      id: "actions",
      header: "Actions",
      cell: () => (
        <Portal>
          <div role="menuitem">Edit</div>
        </Portal>
      ),
    },
  ];
  const onRowClick = vi.fn();
  render(() => (
    <PreferencesProvider>
      <DataTable columns={portalColumns} data={[{ name: "Ada" }]} enableColumnVisibility={false} onRowClick={onRowClick} />
    </PreferencesProvider>
  ));

  fireEvent.click(screen.getAllByRole("menuitem", { name: "Edit" })[0]!);
  expect(onRowClick).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByText("Ada")[0]!);
  expect(onRowClick).toHaveBeenCalledOnce();
});

test("sortable headers expose their order through aria-sort", () => {
  const sortable: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "role", header: "Role", enableSorting: false },
  ];
  render(() => (
    <PreferencesProvider>
      <DataTable columns={sortable} data={[{ name: "Ada", role: "a" }, { name: "Bo", role: "b" }]} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));
  const [nameHeader, roleHeader] = screen.getAllByRole("columnheader");
  expect(nameHeader?.getAttribute("aria-sort")).toBe("none");
  expect(roleHeader?.hasAttribute("aria-sort")).toBe(false);
  fireEvent.click(within(nameHeader!).getByRole("button"));
  expect(nameHeader?.getAttribute("aria-sort")).toBe("ascending");
  fireEvent.click(within(nameHeader!).getByRole("button"));
  expect(nameHeader?.getAttribute("aria-sort")).toBe("descending");
});

test("an empty list narrowed by the caller's filters offers to clear them", () => {
  const onClearFilters = vi.fn();
  render(() => (
    <PreferencesProvider>
      <DataTable columns={columns} data={[]} empty="No people yet." enableColumnVisibility={false} filtersActive onClearFilters={onClearFilters} />
    </PreferencesProvider>
  ));
  expect(screen.queryByText("No people yet.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Clear filters|Filtreleri temizle/ }));
  expect(onClearFilters).toHaveBeenCalledOnce();
});

test("revealed rows hold when the caller hands over a fresh data array", async () => {
  const reachEnd = stubIntersectionObserver();
  const [tick, setTick] = createSignal(0);
  const people = Array.from({ length: 70 }, (_, i) => ({ name: `P${String(i).padStart(2, "0")}` }));
  try {
    render(() => (
      <PreferencesProvider>
        {/* A new array on every read, like a page that maps rows inline. */}
        <DataTable columns={[{ accessorKey: "name", header: "Name" }]} data={(tick(), people.map((row) => ({ ...row })))} enableColumnVisibility={false} />
      </PreferencesProvider>
    ));
    reachEnd();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText("P69")).toBeTruthy();
    setTick(1);
    expect(screen.getByText("P69")).toBeTruthy();
  } finally {
    vi.unstubAllGlobals();
  }
});
test("a toolbar holding only the column menu still gets its card", () => {
  const { container } = render(() => (
    <PreferencesProvider>
      <DataTable columns={[{ accessorKey: "name", header: "Name" }, { accessorKey: "role", header: "Role" }]} data={[{ name: "Ada", role: "a" }]} />
    </PreferencesProvider>
  ));
  const toolbar = container.querySelector(".space-y-3 > div");
  expect(toolbar?.className).toContain("rounded-xl");
});

test("page actions in the toolbar take the shared control height", () => {
  const { container } = render(() => (
    <PreferencesProvider>
      <DataTable
        columns={[{ accessorKey: "name", header: "Name" }, { accessorKey: "role", header: "Role" }]}
        data={[{ name: "Ada", role: "a" }]}
        actions={<button type="button">Add</button>}
      />
    </PreferencesProvider>
  ));
  const add = [...container.querySelectorAll("button")].find((el) => el.textContent === "Add");
  expect(add?.parentElement?.className).toContain("sm:[&_button]:h-8");
});

test("meta.headerInfo puts a labelled info icon beside the header that opens without sorting", async () => {
  const withInfo: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "role", header: "Average", meta: { headerInfo: "Filled in for small schools only." } },
  ];
  render(() => (
    <PreferencesProvider>
      <DataTable columns={withInfo} data={[{ name: "Ada", role: "b" }, { name: "Bo", role: "a" }]} enableColumnVisibility={false} />
    </PreferencesProvider>
  ));
  const info = screen.getByRole("button", { name: /About Average|Average hakkında bilgi/ });
  const header = info.closest("th");
  expect(header?.getAttribute("aria-sort")).toBe("none");
  // Beside the sort button, never inside it: a button in a button is invalid.
  expect(info.parentElement?.closest("button")).toBeNull();
  expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  expect(screen.queryByText("Filled in for small schools only.")).toBeNull();

  fireEvent.click(info);
  expect(header?.getAttribute("aria-sort")).toBe("none");
  expect(await screen.findByText("Filled in for small schools only.")).toBeTruthy();
  // No always-visible copy of the note is left in the table.
  expect(document.querySelector("table")?.textContent).not.toContain("Filled in for small schools only.");
});

test("an infinite table asks for the next page near its end and does not sort", async () => {
  const reachEnd = stubIntersectionObserver();
  const onLoadMore = vi.fn();
  const rows = Array.from({ length: 50 }, (_, index) => ({ name: `Person ${index + 1}` }));
  try {
    render(() => (
      <PreferencesProvider>
        <DataTable
          columns={[columns[0]]}
          data={rows}
          enableColumnVisibility={false}
          infinite={{ hasMore: true, loading: false, total: 120, onLoadMore }}
        />
      </PreferencesProvider>
    ));
    expect(screen.getByText("Person 50")).toBeTruthy();
    expect(screen.getByText(/(Showing 50 of 120|120 kayıttan 50)/)).toBeTruthy();
    expect(screen.getByRole("columnheader").getAttribute("aria-sort")).not.toBe("ascending");
    reachEnd();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
});
