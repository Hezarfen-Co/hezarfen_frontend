import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type InsightRun, type PersonRef, type StudentInsight } from "@/api/client";
import type * as insightsApiModule from "@/api/insights";
import { InsightRunsTable } from "@/components/insights/insight-runs-table";
import { buildRunReportMarkdown, buildRunReportModel } from "@/lib/insight-run-report";
import { PreferencesProvider } from "@/stores/preferences-context";

const insightsApi = vi.hoisted(() => ({
  getInsightByUserId: vi.fn(),
  postInsightRunReport: vi.fn(),
  getInsightRunReport: vi.fn(),
}));
const usersApi = vi.hoisted(() => ({ getUserSearch: vi.fn() }));
/** Who the drawer thinks is reading: generation is offered to manager+ only. */
const viewer = vi.hoisted(() => ({ role: "manager" as "manager" | "teacher" }));

// The URL builder stays real (the drawer and the download use it); only the
// two doors and the per-student read are stood in for.
vi.mock("@/api/insights", async () => ({
  ...(await vi.importActual<typeof insightsApiModule>("@/api/insights")),
  ...insightsApi,
}));
vi.mock("@/api/users", () => usersApi);
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "m-1", role: viewer.role }), loading: () => false }),
}));
// Kobalte's dropdown chrome is not what this test is about: flatten it to one
// plain button per action so the report path can be driven in jsdom.
vi.mock("@/components/ui/table-row-actions", () => ({
  TableRowActions: (props: { actions: { label: string; onSelect: () => void }[] }) => (
    <>
      {props.actions.map((action) => (
        <button type="button" onClick={() => action.onSelect()}>
          {action.label}
        </button>
      ))}
    </>
  ),
}));

const DAY_A = "2026-09-18";
const DAY_B = "2026-09-17";

const RUN_A: InsightRun = {
  run_day: DAY_A,
  started_at: Date.UTC(2026, 8, 18, 9, 37, 59),
  finished_at: Date.UTC(2026, 8, 18, 9, 37, 59),
  duration_ms: 532,
  status: "ok",
  students_total: 16,
  students_ok: 16,
  students_failed: 0,
  students_skipped: 0,
  rows_written: 16,
  budget_exceeded: false,
  budget_ms: 60_000,
  pending_students: [],
  failed_modules: [],
};

const RUN_B: InsightRun = {
  ...RUN_A,
  run_day: DAY_B,
  status: "partial",
  students_ok: 9,
  students_failed: 1,
  students_skipped: 6,
  rows_written: 9,
  // One pending student the roster can name, one it cannot: the second pins the
  // `—` fallback (the id itself stays in the technical disclosure).
  pending_students: ["s2", "ghost-id"],
  // Real stage vocabulary (discover_students / fetch / compute / store), plus one
  // unknown stage so the fallback is pinned too.
  failed_modules: ["fetch", "mystery_stage"],
};

const ROSTER: PersonRef[] = [
  { id: "s1", username: "arda.gunes", display_name: "Arda Güneş" },
  { id: "s2", username: "ayca.sahin", display_name: "Ayça Şahin" },
  { id: "s3", username: "burak.polat", display_name: "Burak Polat" },
];

const COMPUTED_AT = Date.UTC(2026, 8, 18, 9, 37, 59);

const INSIGHT_S1: StudentInsight = {
  user_id: "s1",
  summary: {
    marks: {
      classes: ["class-1"],
      courses: {
        "course-math": { n_marks: 0, average: null },
        "course-physics": { n_marks: 2, average: 71 },
      },
    },
    attendance: {
      overall: { n_obs: 4, rate: 0.75, present: 3, absent: 1 },
      limitation: "Devam oranı dönem başından bugüne kümülatiftir.",
    },
    study: { recent_28d: { n_stints: 0 }, limitation: "Çalışma oturumlarının ders bağı yoktur." },
    submission: { overall: { n: 5 }, limitation: "Teslim saati bilinmediği için erteleme yorumu yapılmaz." },
    confidence: "exploratory",
    computed_at: COMPUTED_AT,
    retain_until: COMPUTED_AT + 86_400_000,
  },
  attention: [
    {
      trigger: "mark_trend",
      fact: "Fizik notu son üç sınavda düşüyor.",
      course: "Fizik",
      window_from: COMPUTED_AT - 30 * 86_400_000,
      window_to: COMPUTED_AT,
      evidence: { delta: -12 },
    },
  ],
  cards: [
    {
      id: "c1",
      product: "O2",
      rule_id: "physics_slip",
      rule_version: 1,
      audience_role: "teacher",
      evidence: { limitation: "İki ölçüm arası fark tek başına eğilim sayılmaz." },
      confidence: "exploratory",
      created_at: COMPUTED_AT,
      expires_at: COMPUTED_AT + 86_400_000,
    },
  ],
  segments: [],
};

const INSIGHT_S2: StudentInsight = {
  user_id: "s2",
  summary: {
    marks: { classes: [], courses: { "course-math": { n_marks: 0, average: null } } },
    attendance: { overall: { n_obs: 0, rate: null }, limitation: "Devam ucu yalnız sayaç döndürüyor." },
    study: { recent_28d: { n_stints: 0 } },
    submission: { overall: { n: 0 } },
    confidence: "none",
    computed_at: COMPUTED_AT,
    retain_until: COMPUTED_AT + 86_400_000,
  },
  attention: [],
  cards: [],
  segments: [],
};

const INSIGHT_S3: StudentInsight = { user_id: "s3", summary: null, attention: [], cards: [], segments: [] };

const panel = () => within(screen.getByRole("region", { name: /^Çalıştırma günü / }));

async function openReport(runDay: string) {
  render(() => (
    <PreferencesProvider>
      <InsightRunsTable runs={[RUN_A, RUN_B]} />
    </PreferencesProvider>
  ));
  const row = screen.getByText(runDay).closest("tr") as HTMLElement;
  fireEvent.click(within(row).getByRole("button", { name: "Raporu görüntüle" }));
  await waitFor(() => expect(screen.getByText(`Çalıştırma günü ${runDay}`)).toBeTruthy());
}

describe("InsightRunReport", () => {
  beforeEach(() => {
    viewer.role = "manager";
    localStorage.setItem("hezarfen.locale", "tr");
    usersApi.getUserSearch.mockResolvedValue({ items: ROSTER, total: ROSTER.length, limit: 200, offset: 0 });
    insightsApi.getInsightByUserId.mockImplementation((userId: string) => {
      if (userId === "s1") return Promise.resolve(INSIGHT_S1);
      if (userId === "s2") return Promise.resolve(INSIGHT_S2);
      return Promise.resolve(INSIGHT_S3);
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("opens that run's report from the row action", async () => {
    await openReport(DAY_B);

    expect(screen.getByText(`Çalıştırma günü ${DAY_B}`)).toBeTruthy();
    // RUN_B's own ledger row, not RUN_A's: its pending students are named in the report.
    await waitFor(() => expect(panel().getByText(/2 öğrenci sıradaki çalıştırmaya kaldı: Ayça Şahin, —/)).toBeTruthy());
  });

  it("renders the run's counters from the ledger row", async () => {
    await openReport(DAY_A);

    await waitFor(() => expect(panel().getByText("İşlenen öğrenci")).toBeTruthy());
    expect(panel().getByText("16/16")).toBeTruthy();
    expect(panel().getByText("Yazılan kayıt")).toBeTruthy();
    expect(panel().getByText("16")).toBeTruthy();
    expect(panel().getByText("532 ms")).toBeTruthy();
    expect(panel().getByText("Sorun yok")).toBeTruthy();
  });

  it("reads every student's signals through the roster and per-student doors", async () => {
    await openReport(DAY_A);

    expect(usersApi.getUserSearch).toHaveBeenCalledWith("", undefined, "student", { limit: 200, offset: 0 });
    await waitFor(() => expect(insightsApi.getInsightByUserId).toHaveBeenCalledWith("s1"));
    expect(insightsApi.getInsightByUserId).toHaveBeenCalledWith("s2");
    expect(insightsApi.getInsightByUserId).toHaveBeenCalledWith("s3");
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());
    // The headline numbers come from the answers, not from the fixture's prose.
    expect(panel().getByText("71,0 (1/2)")).toBeTruthy();
    expect(panel().getByText("75%")).toBeTruthy();
    expect(panel().getByText("Sinyalleri yüklenen öğrenci: 3/3")).toBeTruthy();
  });

  it("states veri yok where a module produced nothing instead of a blank panel", async () => {
    await openReport(DAY_A);

    await waitFor(() => expect(panel().getByText(/Çalışma: 0\/3 öğrencide veri var/)).toBeTruthy());
    expect(panel().getByText(/Çalışma: 0\/3 öğrencide veri var → veri yok/)).toBeTruthy();
    expect(panel().getByText(/Notlar: 1\/3 öğrencide veri var/)).toBeTruthy();
    expect(panel().getByText("Çalışma oturumlarının ders bağı yoktur.")).toBeTruthy();
    // The student rows carry the same honesty.
    expect(panel().getAllByText("veri yok").length).toBeGreaterThan(0);
    expect(panel().getByText("Bu öğrenci için henüz analiz hesaplanmamış.")).toBeTruthy();
  });

  it("opens the student's own analysis drawer from a report row", async () => {
    await openReport(DAY_A);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    const row = panel().getByText("Arda Güneş").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Öğrenci analizini aç" }));

    // The drawer is the shared InsightDetail component, rendering the stored fact.
    await waitFor(() => expect(screen.getByText("Fizik notu son üç sınavda düşüyor.")).toBeTruthy());
    expect(screen.getAllByText("Öneriler").length).toBeGreaterThan(0);
  });

  it("copies the same document it shows to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await openReport(DAY_A);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "Kopyala" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const markdown = writeText.mock.calls[0][0] as string;
    expect(markdown).toContain("16/16");
    expect(markdown).toContain("16");
    expect(markdown).toContain("Arda Güneş");
    expect(markdown).toContain("71,0 (1/2)");
    expect(markdown).toContain("Çalışma: 0/3 öğrencide veri var → veri yok");
    expect(markdown).toContain("Bu öğrenci için henüz analiz hesaplanmamış.");
  });

  it("downloads the .md built from the same content", async () => {
    const blobs: Blob[] = [];
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: (blob: Blob) => {
        blobs.push(blob);
        return "blob:run-report";
      },
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await openReport(DAY_A);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "İndir (.md)" }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(blobs).toHaveLength(1);
    const markdown = await blobs[0].text();
    expect(markdown).toContain("16/16");
    expect(markdown).toContain("Ayça Şahin");
  });

  it("prints only the report document", async () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", { configurable: true, writable: true, value: print });
    await openReport(DAY_A);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    const printRoot = document.querySelector(".insight-report-print-root") as HTMLElement;
    expect(printRoot.textContent).toContain("Arda Güneş");
    expect(document.body.classList.contains("insight-report-printing")).toBe(true);

    fireEvent.click(panel().getByRole("button", { name: "Yazdır / PDF" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("labels the confidence tier and the failed stage instead of printing the raw vocabulary", async () => {
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("Keşifsel")).toBeTruthy());

    // The tier comes from the app's own dictionary (insights.confidence.*).
    expect(panel().queryByText("exploratory")).toBeNull();
    // The failed stage is a zeka pipeline stage name, labelled; the unknown one
    // keeps its technical name rather than getting a guessed label.
    const issues = panel().getByText(/Veri üretmeyen modüller:/).textContent ?? "";
    expect(issues).toContain("Veri toplama");
    expect(issues).toContain("mystery_stage");
    expect(issues).not.toContain("fetch");
    // The raw stage list survives in the technical disclosure.
    expect(panel().getByText(/"failed_modules"/)).toBeTruthy();
  });

  it("names the pending students in the export exactly as the panel does", async () => {
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText(/2 öğrenci sıradaki çalıştırmaya kaldı/)).toBeTruthy());

    const markdown = buildRunReportMarkdown(
      buildRunReportModel({
        run: RUN_B,
        roster: ROSTER,
        insights: { s1: INSIGHT_S1, s2: INSIGHT_S2, s3: INSIGHT_S3 },
        errors: {},
        coverageTotal: ROSTER.length,
        rosterError: null,
      }),
      "tr",
    );
    // Same line, same order, same em-dash as the panel (one helper builds both).
    expect(markdown).toContain("2 öğrenci sıradaki çalıştırmaya kaldı: Ayça Şahin, —");
    expect(markdown).toContain("Veri üretmeyen modüller: Veri toplama, mystery_stage");
    expect(markdown).toContain("Keşifsel");
    expect(markdown).not.toContain("exploratory");
  });

  it("builds the same Markdown without a DOM", () => {
    const model = buildRunReportModel({
      run: RUN_A,
      roster: ROSTER,
      insights: { s1: INSIGHT_S1, s2: INSIGHT_S2, s3: INSIGHT_S3 },
      errors: {},
      coverageTotal: ROSTER.length,
      rosterError: null,
    });

    const markdown = buildRunReportMarkdown(model, "tr");

    expect(markdown).toContain("16/16");
    expect(markdown).toContain("Yazılan kayıt");
    expect(markdown).toContain("| Arda Güneş |");
    expect(markdown).toContain("71,0 (1/2)");
    expect(markdown).toContain("75%");
    expect(markdown).toContain("Çalışma: 0/3 öğrencide veri var → veri yok");
    expect(markdown).toContain("Keşifsel");
    expect(markdown).toContain("```json");
  });

  it("asks the service for the rendered run day's report and reads it back before offering it", async () => {
    const receipt = {
      run_day: DAY_B,
      byte_size: 4096,
      truncated: false,
      notes: [],
      generated_at: COMPUTED_AT,
    };
    const pending = Promise.withResolvers<typeof receipt>();
    insightsApi.postInsightRunReport.mockImplementation(() => pending.promise);
    insightsApi.getInsightRunReport.mockResolvedValue(new Blob(["<html/>"], { type: "text/html" }));
    // The hand-over itself is the other test's subject; here it must not navigate.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "Okul raporu (HTML)" }));

    // The door is this run row's own day, and it is asked before the read.
    expect(insightsApi.postInsightRunReport).toHaveBeenCalledWith(DAY_B);
    expect(insightsApi.getInsightRunReport).not.toHaveBeenCalled();
    const busy = panel().getByRole("button", { name: "Rapor oluşturuluyor…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);

    pending.resolve(receipt);

    // Read-back first: the bytes are what prove there is a document to hand over.
    await waitFor(() => expect(insightsApi.getInsightRunReport).toHaveBeenCalledWith(DAY_B));
    await waitFor(() =>
      expect(panel().getByRole("button", { name: "Okul raporu (HTML)" })).toBeTruthy(),
    );
    expect((panel().getByRole("button", { name: "Okul raporu (HTML)" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("hands the stored document over as an anchor on its own door, under its own file name", async () => {
    const clicked: { href: string | null; download: string | null }[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.getAttribute("href"), download: this.getAttribute("download") });
      });
    insightsApi.postInsightRunReport.mockResolvedValue({
      run_day: DAY_B,
      byte_size: 4096,
      truncated: false,
      notes: [],
      generated_at: COMPUTED_AT,
    });
    insightsApi.getInsightRunReport.mockResolvedValue(new Blob(["<html/>"], { type: "text/html" }));
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "Okul raporu (HTML)" }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(clicked[0]).toEqual({
      href: `/api/insights/runs/${DAY_B}/report`,
      download: `okul-analiz-raporu-${DAY_B}.html`,
    });
  });

  it("says the report service is unavailable on a 503 and puts the control back", async () => {
    insightsApi.postInsightRunReport.mockRejectedValue(
      new ApiError(503, "no AI service is connected right now"),
    );
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "Okul raporu (HTML)" }));

    await waitFor(() =>
      expect(
        panel().getByText("Okul raporu servisi şu an kullanılamıyor. Sonra tekrar dene."),
      ).toBeTruthy(),
    );
    expect((panel().getByRole("button", { name: "Okul raporu (HTML)" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(insightsApi.getInsightRunReport).not.toHaveBeenCalled();
  });

  it("says the document is too large without telling the reader to pick a smaller file", async () => {
    insightsApi.postInsightRunReport.mockRejectedValue(new ApiError(413, "document_too_large"));
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "Okul raporu (HTML)" }));

    await waitFor(() =>
      expect(panel().getByText("Rapor belgesi sunucunun boyut sınırını aştı.")).toBeTruthy(),
    );
    expect(panel().queryByText(/Daha küçük bir dosya seç/)).toBeNull();
  });

  it("shows the server's own sentence when the service refuses the generation", async () => {
    insightsApi.postInsightRunReport.mockRejectedValue(
      new ApiError(409, "the school report was refused: no marks were stored for this run day"),
    );
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "Okul raporu (HTML)" }));

    await waitFor(() =>
      expect(
        panel().getByText("the school report was refused: no marks were stored for this run day"),
      ).toBeTruthy(),
    );
  });

  it("says the document could not be read back when the generation answered but stored nothing", async () => {
    insightsApi.postInsightRunReport.mockResolvedValue({
      run_day: DAY_B,
      byte_size: 0,
      truncated: false,
      notes: [],
      generated_at: COMPUTED_AT,
    });
    insightsApi.getInsightRunReport.mockRejectedValue(
      new ApiError(409, "no school report is stored for this run day"),
    );
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    fireEvent.click(panel().getByRole("button", { name: "Okul raporu (HTML)" }));

    await waitFor(() =>
      expect(panel().getByText("Rapor oluşturuldu ama belge okunamadı. Tekrar dene.")).toBeTruthy(),
    );
    // The server's own 409 text is not what the reader gets: nothing was refused.
    expect(panel().queryByText("no school report is stored for this run day")).toBeNull();
  });

  it("offers no generation control to a reader the door would refuse", async () => {
    viewer.role = "teacher";
    await openReport(DAY_B);
    await waitFor(() => expect(panel().getByText("71,0 (1/2)")).toBeTruthy());

    expect(panel().queryByRole("button", { name: "Okul raporu (HTML)" })).toBeNull();
    // The three controls that only read what is already on screen stay.
    expect(panel().getByRole("button", { name: "Kopyala" })).toBeTruthy();
    expect(panel().getByRole("button", { name: "İndir (.md)" })).toBeTruthy();
    expect(panel().getByRole("button", { name: "Yazdır / PDF" })).toBeTruthy();
    expect(insightsApi.postInsightRunReport).not.toHaveBeenCalled();
  });
});
