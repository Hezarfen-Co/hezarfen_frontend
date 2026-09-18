import { formatMessage, type Locale } from "@/i18n/messages";

/**
 * The school run report's own copy.
 *
 * It lives here rather than in `src/i18n/messages.ts` on purpose: two lanes
 * write insight surfaces in the same batch, and a second writer on the shared
 * dictionary is how one lane's keys get dropped by the other's commit. Same
 * shape as the shared dictionary (every key, both locales, `{name}` vars), so
 * a later tidy-up can fold it in mechanically.
 */
export type RunReportKey =
  | "open"
  | "title"
  | "subtitle"
  | "panelDescription"
  | "copy"
  | "copied"
  | "copyFailed"
  | "download"
  | "downloaded"
  | "print"
  | "runSection"
  | "schoolSection"
  | "studentsSection"
  | "technical"
  | "technicalHint"
  | "runDay"
  | "startedAt"
  | "finishedAt"
  | "status"
  | "processed"
  | "skipped"
  | "failed"
  | "rowsWritten"
  | "duration"
  | "budget"
  | "budgetExceeded"
  | "budgetWithin"
  | "issues"
  | "noIssues"
  | "pendingStudents"
  | "failedModules"
  | "coverage"
  | "coverageNote"
  | "loadAll"
  | "loadingSignals"
  | "loadMoreRoster"
  | "rosterEmpty"
  | "rosterFailed"
  | "student"
  | "confidence"
  | "attention"
  | "cards"
  | "segments"
  | "marksAverage"
  | "marksCourses"
  | "attendanceRate"
  | "computedAt"
  | "noData"
  | "noSummary"
  | "noModules"
  | "loadFailed"
  | "notLoaded"
  | "openStudent"
  | "studentAnalysis"
  | "moduleMarks"
  | "moduleAttendance"
  | "moduleStudy"
  | "moduleSubmission"
  | "moduleCovered"
  | "modulesEmpty"
  | "documentTitle";

const tr: Record<RunReportKey, string> = {
  open: "Raporu görüntüle",
  title: "Okul analiz raporu",
  subtitle: "Bu çalıştırmanın ürettiği sonuçlar",
  panelDescription: "Çalıştırma günü {day}",
  copy: "Kopyala",
  copied: "Rapor panoya kopyalandı.",
  copyFailed: "Rapor panoya kopyalanamadı.",
  download: "İndir (.md)",
  downloaded: "Rapor indirildi.",
  print: "Yazdır / PDF",
  runSection: "Çalıştırma özeti",
  schoolSection: "Okul geneli",
  studentsSection: "Öğrenci dökümü",
  technical: "Teknik ayrıntı",
  technicalHint: "Ham alanlar; insan görünümünde gizli tutulur.",
  runDay: "Çalıştırma günü",
  startedAt: "Başlangıç",
  finishedAt: "Bitiş",
  status: "Durum",
  processed: "İşlenen öğrenci",
  skipped: "Atlanan",
  failed: "Hatalı",
  rowsWritten: "Yazılan kayıt",
  duration: "Süre",
  budget: "Süre bütçesi",
  budgetExceeded: "Bütçe doldu; sıradaki öğrenciler sonraki çalıştırmaya kaldı.",
  budgetWithin: "Bütçe içinde tamamlandı.",
  issues: "Sorunlar",
  noIssues: "Sorun yok",
  pendingStudents: "{count} öğrenci sıradaki çalıştırmaya kaldı",
  failedModules: "Veri üretmeyen modüller: {modules}",
  coverage: "Sinyalleri yüklenen öğrenci: {loaded}/{total}",
  coverageNote: "Okul geneli sayılar yalnızca sinyalleri yüklenmiş öğrencileri kapsar.",
  loadAll: "Kalan {count} öğrenciyi yükle",
  loadingSignals: "Öğrenci sinyalleri yükleniyor…",
  loadMoreRoster: "Öğrenci listesinin devamını yükle",
  rosterEmpty: "Bu okulda listelenecek öğrenci yok; kapsanacak kimse bulunamadı.",
  rosterFailed: "Öğrenci listesi okunamadı: {message}",
  student: "Öğrenci",
  confidence: "Güven",
  attention: "Uyarı",
  cards: "Öneri",
  segments: "Soru grubu",
  marksAverage: "Not ortalaması",
  marksCourses: "Not girilen ders",
  attendanceRate: "Devam oranı",
  computedAt: "Hesaplandığı an",
  noData: "veri yok",
  noSummary: "Bu öğrenci için henüz analiz hesaplanmamış.",
  noModules: "Analiz hesaplandı ama dört modülün hiçbiri veri üretmedi.",
  loadFailed: "Analiz okunamadı: {message}",
  notLoaded: "Yüklenmedi",
  openStudent: "Öğrenci analizini aç",
  studentAnalysis: "Öğrenci analizi",
  moduleMarks: "Notlar",
  moduleAttendance: "Yoklama",
  moduleStudy: "Çalışma",
  moduleSubmission: "Teslim",
  moduleCovered: "{label}: {withData}/{total} öğrencide veri var",
  modulesEmpty: "Hiçbir modül veri üretmedi; bu öğrenciler için hesaplanacak kaynak yok.",
  documentTitle: "Okul analiz raporu — {day}",
};

const en: Record<RunReportKey, string> = {
  open: "View report",
  title: "School analysis report",
  subtitle: "What this run produced",
  panelDescription: "Run day {day}",
  copy: "Copy",
  copied: "Report copied to the clipboard.",
  copyFailed: "Could not copy the report.",
  download: "Download (.md)",
  downloaded: "Report downloaded.",
  print: "Print / PDF",
  runSection: "Run summary",
  schoolSection: "School overview",
  studentsSection: "Student breakdown",
  technical: "Technical detail",
  technicalHint: "Raw fields, kept out of the human view.",
  runDay: "Run day",
  startedAt: "Started",
  finishedAt: "Finished",
  status: "Status",
  processed: "Students processed",
  skipped: "Skipped",
  failed: "Failed",
  rowsWritten: "Rows written",
  duration: "Duration",
  budget: "Time budget",
  budgetExceeded: "The budget ran out; the remaining students wait for the next run.",
  budgetWithin: "Finished within budget.",
  issues: "Issues",
  noIssues: "No issues",
  pendingStudents: "{count} students left for the next run",
  failedModules: "Modules that produced nothing: {modules}",
  coverage: "Students with signals loaded: {loaded}/{total}",
  coverageNote: "School overview numbers cover only the students whose signals are loaded.",
  loadAll: "Load the remaining {count} students",
  loadingSignals: "Loading student signals…",
  loadMoreRoster: "Load more of the student list",
  rosterEmpty: "This school has no students to list, so nobody could be covered.",
  rosterFailed: "Could not read the student list: {message}",
  student: "Student",
  confidence: "Confidence",
  attention: "Attention",
  cards: "Recommendation",
  segments: "Question group",
  marksAverage: "Marks average",
  marksCourses: "Courses with marks",
  attendanceRate: "Attendance rate",
  computedAt: "Computed at",
  noData: "no data",
  noSummary: "No analysis has been computed for this student yet.",
  noModules: "The analysis ran but none of the four modules produced anything.",
  loadFailed: "Could not read the analysis: {message}",
  notLoaded: "Not loaded",
  openStudent: "Open student analysis",
  studentAnalysis: "Student analysis",
  moduleMarks: "Marks",
  moduleAttendance: "Attendance",
  moduleStudy: "Study",
  moduleSubmission: "Submission",
  moduleCovered: "{label}: {withData}/{total} students have data",
  modulesEmpty: "No module produced anything; there is nothing to compute from for these students.",
  documentTitle: "School analysis report — {day}",
};

export const RUN_REPORT_MESSAGES: Record<Locale, Record<RunReportKey, string>> = { en, tr };

export function runReportText(
  locale: Locale,
  key: RunReportKey,
  vars?: Record<string, string | number>,
): string {
  const text = RUN_REPORT_MESSAGES[locale][key] ?? RUN_REPORT_MESSAGES.en[key] ?? key;
  return formatMessage(text, vars);
}
