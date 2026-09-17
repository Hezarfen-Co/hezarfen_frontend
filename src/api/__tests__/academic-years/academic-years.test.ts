import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteAcademicYearById,
  getAcademicYearById,
  getAcademicYears,
  patchAcademicYearById,
  postAcademicYear,
  postAcademicYearArchive,
  postAcademicYearRollover,
} from "../../academic-years";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("academic years API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getAcademicYears GETs /academic-years with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "y1" }], total: 1 });

    const result = await getAcademicYears({ limit: 10 });
    expect(result.items).toEqual([{ id: "y1" }]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/academic-years?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getAcademicYearById GETs /academic-years/:id", async () => {
    mockFetchSuccess({ id: "y1" });

    await getAcademicYearById("y1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/academic-years/y1");
  });

  it("postAcademicYear POSTs /academic-years with the body", async () => {
    mockFetchSuccess({ id: "y1" });
    const body = {
      name: "2026-2027",
      starts_at: 1780000000000,
      ends_at: 1810000000000,
      grade_promotions: [{ from_grade: "5", to_grade: "6" }],
    };

    await postAcademicYear(body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/academic-years");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("patchAcademicYearById PATCHes /academic-years/:id", async () => {
    mockFetchSuccess({ id: "y1" });
    const body = { name: "2027-2028" };

    await patchAcademicYearById("y1", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/academic-years/y1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("deleteAcademicYearById DELETEs /academic-years/:id", async () => {
    mockFetch204();

    await deleteAcademicYearById("y1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/academic-years/y1");
    expect(init?.method).toBe("DELETE");
  });

  it("postAcademicYearArchive POSTs /academic-years/:id/archive", async () => {
    mockFetchSuccess({ id: "y1", archived_at: 1 });

    await postAcademicYearArchive("y1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/academic-years/y1/archive");
    expect(init?.method).toBe("POST");
  });

  it("postAcademicYearRollover POSTs /academic-years/:id/rollover with from_year", async () => {
    mockFetchSuccess({ year: "y2", classes: 12, students: 312, graduated: ["12"] });

    const result = await postAcademicYearRollover("y2", "y1");
    expect(result.classes).toBe(12);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/academic-years/y2/rollover");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ from_year: "y1" }));
  });
});
