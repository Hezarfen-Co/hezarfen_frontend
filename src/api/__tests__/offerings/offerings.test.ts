import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteOfferingById,
  deleteOfferingExamWeightByKind,
  deleteOfferingSubjectById,
  deleteOfferingWeeklySlotById,
  getOfferingById,
  getOfferingExamWeights,
  getOfferingSubjects,
  getOfferingWeeklyPlan,
  getOfferings,
  patchOfferingById,
  patchOfferingExamWeight,
  postOffering,
  postOfferingSubject,
  postOfferingWeeklySlot,
} from "../../offerings";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("offerings API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getOfferings GETs /offerings narrowed by course and grade level (0 included)", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getOfferings({ course: "co1", grade_level: 0, limit: 20 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings?limit=20&course=co1&grade_level=0");
    expect(init?.method).toBe("GET");
  });

  it("getOfferingById GETs /offerings/o1", async () => {
    mockFetchSuccess({ id: "x1" });
    await getOfferingById("o1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1");
    expect(init?.method).toBe("GET");
  });

  it("postOffering POSTs /offerings", async () => {
    mockFetchSuccess({ id: "x1" });
    await postOffering({ course: "co1", grade_level: 9, default_ders_saati: 4 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ course: "co1", grade_level: 9, default_ders_saati: 4 }));
  });

  it("patchOfferingById PATCHes /offerings/o1 and sends null to clear back to inherit", async () => {
    mockFetchSuccess({ id: "x1" });
    await patchOfferingById("o1", { title: null, default_counts_toward_karne: false });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ title: null, default_counts_toward_karne: false }));
  });

  it("deleteOfferingById DELETEs /offerings/o1", async () => {
    mockFetch204();
    await deleteOfferingById("o1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1");
    expect(init?.method).toBe("DELETE");
  });

  it("getOfferingSubjects GETs /offerings/o1/subjects", async () => {
    mockFetchSuccess([]);
    await getOfferingSubjects("o1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/subjects");
    expect(init?.method).toBe("GET");
  });

  it("postOfferingSubject POSTs /offerings/o1/subjects", async () => {
    mockFetchSuccess({ id: "x1" });
    await postOfferingSubject("o1", "s1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/subjects");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ subject: "s1" }));
  });

  it("deleteOfferingSubjectById DELETEs /offerings/o1/subjects/s1", async () => {
    mockFetch204();
    await deleteOfferingSubjectById("o1", "s1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/subjects/s1");
    expect(init?.method).toBe("DELETE");
  });

  it("getOfferingWeeklyPlan GETs /offerings/o1/weekly-plan", async () => {
    mockFetchSuccess([]);
    await getOfferingWeeklyPlan("o1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/weekly-plan");
    expect(init?.method).toBe("GET");
  });

  it("postOfferingWeeklySlot POSTs /offerings/o1/weekly-plan", async () => {
    mockFetchSuccess({ id: "x1" });
    await postOfferingWeeklySlot("o1", { weekday: 1, starts_at: 540, ends_at: 580, topic: null });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/weekly-plan");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ weekday: 1, starts_at: 540, ends_at: 580, topic: null }));
  });

  it("deleteOfferingWeeklySlotById DELETEs /offerings/o1/weekly-plan/sl1", async () => {
    mockFetch204();
    await deleteOfferingWeeklySlotById("o1", "sl1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/weekly-plan/sl1");
    expect(init?.method).toBe("DELETE");
  });

  it("getOfferingExamWeights GETs /offerings/o1/exam-weights", async () => {
    mockFetchSuccess({ weights: [] });
    await getOfferingExamWeights("o1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/exam-weights");
    expect(init?.method).toBe("GET");
  });

  it("patchOfferingExamWeight PATCHs /offerings/o1/exam-weights", async () => {
    mockFetchSuccess({ weights: [] });
    await patchOfferingExamWeight("o1", { kind: "midterm", weight: 40 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/exam-weights");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ kind: "midterm", weight: 40 }));
  });

  it("deleteOfferingExamWeightByKind encodes the kind in the path", async () => {
    mockFetch204();
    await deleteOfferingExamWeightByKind("o1", "ara sınav");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/offerings/o1/exam-weights/ara%20s%C4%B1nav");
    expect(init?.method).toBe("DELETE");
  });
});
