import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import type { StudentInsight } from "@/api/client";
import { InsightDetail } from "@/components/insights/insight-detail";
import { isRecord, type UnknownRecord } from "@/lib/is-record";
import { PreferencesProvider } from "@/stores/preferences-context";

/**
 * The drawer renders ZEKA's raw payloads. These tests pin the line the drawer
 * must not cross: a school manager sees Turkish labels and titles, never a raw
 * key or a uuid — while the whole payload stays reachable in the collapsed
 * technical disclosure underneath.
 */

const STUDENT_ID = "01a0b1b0-9d58-77f7-966f-5bfa87cb7e9d";
const COURSE_ID = "01a0b1b0-9d58-77f7-966f-5bfa87cb7e9e";
const CLASS_ID = "01a0b1b0-9d58-77f7-966f-5bfa87cb7e9f";
const HOMEWORK_ID = "01a0b1b0-9d58-77f7-966f-5bfa87cb7ea0";

const NOW = 1_758_000_000_000;
const WEEK = 7 * 86_400_000;

const insight: StudentInsight = {
  user_id: STUDENT_ID,
  summary: {
    confidence: "exploratory",
    computed_at: NOW,
    retain_until: NOW + 30 * 86_400_000,
    attendance: {
      overall: {
        present: 51,
        absent: 8,
        late: 2,
        excused: 4,
        n_obs: 61,
        rate: 0.86,
        rate_suppressed: false,
        relative_gap: -0.04,
      },
      courses: {
        [COURSE_ID]: {
          course: COURSE_ID,
          present: 18,
          absent: 6,
          late: 1,
          excused: 2,
          custom_total: 0,
          n_obs: 25,
          rate: 0.76,
          rate_suppressed: false,
          cohort_median: 0.92,
          cohort_n: 24,
          relative_gap: -0.16,
        },
      },
      weekday_pattern: null,
      weekday_pattern_reason:
        "Devam ucu yalnız sayaç döndürüyor; oturum tarihi yok. Haftanın günü deseni için course_session.starts_at gerekir.",
      trend: {
        available: false,
        reason:
          "İki pencere karşılaştırması için satır düzeyinde zaman damgası gerekir; devam verisinde tarih yok.",
        delta: null,
      },
      limitation:
        "Devam oranı dönem başından bugüne kümülatiftir, son 30 gün değildir; raporlu (excused) devamsızlık orana girmez.",
    },
    marks: {
      classes: [CLASS_ID],
      courses: {
        [COURSE_ID]: {
          course: COURSE_ID,
          course_title: "Matematik",
          n_marks: 2,
          average: 72.5,
          mean: 72.5,
          median: 72.5,
          min: 60,
          max: 85,
          trend: {
            available: false,
            reason: "eğilim için en az 6 not gerekir",
            n: 2,
            slope_per_30d: null,
            recent_mean: null,
            previous_mean: null,
            delta: null,
            dropped: false,
            rising: false,
          },
          placement: {
            band: "insufficient_data",
            confidence: "none",
            z: null,
            class_average: null,
            class_sd: null,
            cohort_n: 0,
            progress: "2/3",
            reason: "veri toplanıyor",
          },
        },
      },
      within_student_contrast: {
        available: false,
        reason: "kontrast için bantlanmış en az 3 ders gerekir",
        n_courses: 1,
        course: null,
        course_title: null,
        z: null,
        others_median_z: null,
        delta: null,
        flagged: false,
      },
      limitation:
        "Konu (subject) kırılımı bu sürümde yok: köprü ham sınav cevabı vermiyor.",
    },
    study: {
      recent_28d: {
        n_stints: 3,
        active_days: 2,
        total_focus_ms: 5_400_000,
        median_stint_ms: 1_800_000,
        regularity: null,
        regularity_suppressed: true,
        burstiness: 1.5,
        burstiness_limitation:
          "Gün-arası yığılmayı ölçer; sınav/ödev öncesi yığılmayı ÖLÇMEZ.",
        night_share: 0.33,
        night_window_tr: "[22:00, 02:00)",
      },
      previous_28d: { n_stints: 1, active_days: 1, total_focus_ms: 1_800_000 },
      change: { active_days_delta: 1, stints_delta: 2, focus_ms_delta: 3_600_000 },
      streak_local: 2,
      heatmap: null,
      heatmap_progress: "3/5",
      pre_deadline_share: 0.5,
      pre_exam_share: null,
      pre_exam_reason: "Sınav takvimi Source arayüzünde yok; sınav öncesi yığılma hesaplanamaz.",
      limitation: "Çalışma oturumlarının ders bağı yoktur.",
    },
    submission: {
      overall: {
        n: 9,
        n_submitted: 7,
        n_on_time: 5,
        n_late: 2,
        n_missing: 2,
        n_marked_missing: 1,
        on_time_rate_by_last_touch: 0.71,
        late_rate: 0.29,
        missing_rate: 0.22,
        rates_suppressed: false,
      },
      recent_30d: { n: 4, n_submitted: 3, n_late: 1, n_missing: 1, rates_suppressed: true },
      previous_30d: { n: 5, n_submitted: 4, n_late: 1, n_missing: 1, rates_suppressed: false },
      upcoming: [
        {
          homework: HOMEWORK_ID,
          course: COURSE_ID,
          title: "Türev alıştırmaları",
          due_at: NOW + 2 * 86_400_000,
          hours_left: 30.5,
          submitted: false,
          remind_at: NOW + 86_400_000,
          high_priority: true,
        },
      ],
      procrastination: {
        available: false,
        reason: "Erteleme profili submitted_at gerektirir; öğrenci ödev raporu teslim anını taşımıyor.",
        median_lead_ms: null,
        last_minute: null,
        last_24h_share: null,
      },
      counted_on_time_available: false,
      measure: "last_touch",
      limitation: "Teslim saati bilinmediği için erteleme yorumu yapılmaz.",
    },
  },
  attention: [
    {
      trigger: "attendance",
      fact: "Derslere katılım oranı %76; aynı şubedeki arkadaşlarının ortancasından 16 puan düşük.",
      course: COURSE_ID,
      window_from: NOW - WEEK,
      window_to: NOW,
      evidence: {
        rate: 0.76,
        relative_gap: -0.16,
        n_obs: 25,
        rule_basis: "level",
        measure: "level_vs_cohort_median",
        limitation: "Dönem kümülatifi; son 30 gün penceresi yok.",
      },
    },
  ],
  cards: [
    {
      id: "card-1",
      product: "O1",
      rule_id: "O1.review_band",
      rule_version: 1,
      scope: null,
      audience_role: "student",
      course: COURSE_ID,
      evidence: {
        course: COURSE_ID,
        course_title: "Matematik",
        n_marks: 4,
        average: 48.5,
        class_average: 66.2,
        class_sd: 14.1,
        z: -1.25,
        cohort_n: 24,
        band: "review",
        rule: "z < -0.8 (MODULLER.md §2.3 adım 4)",
      },
      confidence: "exploratory",
      created_at: NOW,
      expires_at: NOW + WEEK,
    },
    {
      id: "card-2",
      product: "O2",
      rule_id: "O2.segment_cognitive_gap",
      rule_version: 1,
      scope: "bilissel_talep=var",
      audience_role: "student",
      course: null,
      evidence: {
        dimension: "dikkat_tuzagi",
        label: "var",
        fact: "Dikkat tuzağı sorularında doğruluk, öğrencinin genel düzeyinin altında.",
        n_answers: 20,
        n_correct: 9,
        accuracy: 0.45,
        overall_accuracy: 0.6,
        overall_n_answers: 100,
        contrast: -0.15,
        reference_mean_contrast: -0.02,
        reference_n_students: 180,
        relative_contrast: -0.13,
        gate_n_answers: 12,
        rule: "relative_contrast <= -0.08 ve n_answers >= 12",
      },
      confidence: "exploratory",
      created_at: NOW,
      expires_at: NOW + WEEK,
    },
  ],
  segments: [
    {
      dimension: "dikkat_tuzagi",
      label: "var",
      n_answers: 20,
      n_correct: 9,
      accuracy: 0.45,
      overall_n_answers: 100,
      overall_accuracy: 0.6,
      contrast: -0.15,
      confidence: "exploratory",
      computed_at: NOW,
    },
  ],
};

const renderDrawer = (props: { mode?: "full" | "cards" } = {}) =>
  render(() => (
    <PreferencesProvider>
      <InsightDetail insight={insight} mode={props.mode} />
    </PreferencesProvider>
  ));

const renderInsight = (value: StudentInsight) =>
  render(() => (
    <PreferencesProvider>
      <InsightDetail insight={value} />
    </PreferencesProvider>
  ));

/** The fixture's single course with its `trend` member swapped. */
const marksWith = (trend: UnknownRecord): StudentInsight => {
  const summary = insight.summary ?? { confidence: "none", computed_at: NOW, retain_until: NOW + WEEK };
  const marks = isRecord(summary.marks) ? summary.marks : {};
  const courses = isRecord(marks.courses) ? marks.courses : {};
  const course = isRecord(courses[COURSE_ID]) ? courses[COURSE_ID] : {};
  return {
    ...insight,
    summary: { ...summary, marks: { ...marks, courses: { ...courses, [COURSE_ID]: { ...course, trend } } } },
  };
};

describe("InsightDetail", () => {
  afterEach(cleanup);

  it("labels every module member in Turkish instead of echoing payload keys", () => {
    renderDrawer();
    const human = screen.getByTestId("insight-human").textContent ?? "";

    for (const label of [
      "Devam oranı",
      "Şube ortancasına göre fark",
      "Ağırlıklı ortalama",
      "En yüksek",
      "Not sayısı",
      "Şubedeki konumu",
      "Yeterli veri yok",
    ]) {
      expect(human, `label ${label}`).toContain(label);
    }
    expect(human).toContain("Dersler arası denge");
    expect(human).toContain("Yaklaşan teslimler");
    expect(human).toContain("Matematik");
    expect(human).toContain("Türev alıştırmaları");
    expect(human).toContain("Öncelikli");

    for (const rawKey of [
      "Class es",
      "Course ses",
      "Trend Available",
      "Weekday Pattern",
      "Overall - Absent",
      "class_average",
      "cohort_n",
      "rate_suppressed",
      "n_marks",
      "within_student_contrast",
    ]) {
      expect(human, `raw key ${rawKey}`).not.toContain(rawKey);
    }
  });

  it("shows courses, classes and homework by name, never by id", () => {
    renderDrawer();
    const human = screen.getByTestId("insight-human").textContent ?? "";

    for (const id of [STUDENT_ID, COURSE_ID, CLASS_ID, HOMEWORK_ID]) {
      expect(human, `uuid ${id}`).not.toContain(id);
    }
    // The class list has no titles in the payload, so it is reported as a
    // count instead of a uuid column.
    expect(human).toContain("Kayıtlı şube sayısı");
  });

  it("renders the service's honest reasons as sentences", () => {
    renderDrawer();
    const human = screen.getByTestId("insight-human").textContent ?? "";

    expect(human).toContain("eğilim için en az 6 not gerekir");
    expect(human).toContain("Veri toplanıyor (2/3)");
    expect(human).toContain("kontrast için bantlanmış en az 3 ders gerekir");
    expect(human).toContain("Isı haritası için 3/5 oturum");
    expect(human).toContain("Erteleme profili submitted_at gerektirir");
    expect(human).toContain("Dönem kümülatifi; son 30 gün penceresi yok.");
    // A rate-space difference is percentage points: -0.16 is "-16 puan", not
    // "-0,2 puan" — the raw number must never leak through unconverted.
    expect(human).toContain("-16 puan");
    expect(human).toContain("-4 puan");
  });

  it("keeps the whole raw payload in the collapsed technical disclosure", () => {
    renderDrawer();
    const disclosure = screen.getByTestId("insight-technical") as HTMLDetailsElement;

    expect(disclosure.open).toBe(false);
    expect(disclosure.textContent).toContain(STUDENT_ID);
    expect(disclosure.textContent).toContain(COURSE_ID);
    expect(disclosure.textContent).toContain(CLASS_ID);
    expect(disclosure.textContent).toContain(HOMEWORK_ID);
    for (const rawKey of ["class_average", "cohort_n", "within_student_contrast", "rate_suppressed"]) {
      expect(disclosure.textContent, `raw key ${rawKey}`).toContain(rawKey);
    }

    fireEvent.click(disclosure.querySelector("summary")!);
    expect(disclosure.open).toBe(true);
  });

  it("claims school-wide only when the payload has no course at all", () => {
    const base = insight.attention[0];
    render(() => (
      <PreferencesProvider>
        <InsightDetail
          insight={{
            ...insight,
            attention: [
              { ...base, course: null, fact: "Okul geneli devamsızlık artışı." },
              { ...base, course: "01a0b1b0-9d58-77f7-966f-5bfa87cb7e11", fact: "Dersi çözülemeyen madde." },
            ],
          }}
        />
      </PreferencesProvider>
    ));
    const human = screen.getByTestId("insight-human").textContent ?? "";

    expect(human).toContain("Okul geneli devamsızlık artışı.");
    expect(human).toContain("Ders adı çözümlenemedi");
    // Exactly one item may read as school-wide: a course id whose title did not
    // resolve is not evidence of a school-wide fact.
    expect((human.match(/Okul geneli/g) ?? []).length).toBe(1);
    expect(human).not.toContain("01a0b1b0-9d58-77f7-966f-5bfa87cb7e11");
  });

  it("maps the segment vocabulary everywhere, never the machine name", () => {
    renderDrawer();
    const human = screen.getByTestId("insight-human").textContent ?? "";

    // Segments section and the O2 card's evidence must agree on the label.
    expect(human).toContain("Dikkat tuzağı");
    expect(human).toContain("Bilişsel talep: var");
    expect(human).not.toContain("dikkat_tuzagi");
    expect(human).not.toContain("bilissel_talep");

    expect(screen.getByTestId("insight-technical").textContent).toContain("dikkat_tuzagi");
  });

  it("explains a withheld slope instead of dropping its row silently", () => {
    const reason = "not dizisi 7 günden kısa olduğu için eğim hesaplanmadı";
    renderInsight(
      marksWith({
        available: true,
        reason,
        n: 8,
        slope_per_30d: null,
        recent_mean: 70,
        previous_mean: 66,
        delta: 4,
        dropped: false,
        rising: false,
      }),
    );
    const human = screen.getByTestId("insight-human").textContent ?? "";

    expect(human).toContain(reason);
    expect(human).not.toContain("/ 30 gün");
  });

  it("shows the slope row when the trend computed one", () => {
    renderInsight(
      marksWith({
        available: true,
        reason: null,
        n: 8,
        slope_per_30d: 3.4,
        recent_mean: 70,
        previous_mean: 66,
        delta: 4,
        dropped: false,
        rising: false,
      }),
    );
    const human = screen.getByTestId("insight-human").textContent ?? "";

    expect(human).toContain("+3,4 puan / 30 gün");
    expect(human).not.toContain("eğim hesaplanmadı");
  });

  it("keeps the cards-only mode free of the drawer's full-view sections", () => {
    renderDrawer({ mode: "cards" });
    const human = screen.getByTestId("insight-human").textContent ?? "";

    expect(human).toContain("Ders konumu");
    expect(screen.queryByTestId("insight-technical")).toBeNull();
    expect(human).not.toContain("Devam oranı");
    expect(human).not.toContain(STUDENT_ID);
  });
});
