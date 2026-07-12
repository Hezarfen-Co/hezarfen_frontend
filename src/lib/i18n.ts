// Two-language UI: English and Turkish, picked from what the device asks for
// and switchable in one tap (persisted). `t("key")` returns the entry in the
// current language — a plain string, or a function for parameterized lines —
// and re-runs reactively because it reads the `lang` signal.
//
// Server-sent error messages pass through untranslated: the backend speaks
// English, and inventing translations for unknown strings would lie to users.

import { createSignal } from "solid-js";
import type {
  AttendanceStatus,
  ExamKind,
  LiveStudent,
  QuestionKind,
  Role,
} from "./types";

export type Lang = "en" | "tr";

const STORAGE_KEY = "hezarfen-lang";

function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "tr") return stored;
  return navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
}

const [lang, setLangSignal] = createSignal<Lang>(initialLang());
export { lang };

// The document language drives CSS text-transform casing rules — Turkish
// uppercases i → İ only when the browser knows the text is Turkish.
document.documentElement.lang = lang();

export function setLang(next: Lang): void {
  setLangSignal(next);
  document.documentElement.lang = next;
  localStorage.setItem(STORAGE_KEY, next);
}

/** BCP-47 tag for date formatting; undefined lets English follow the OS. */
export const locale = (): string | undefined =>
  lang() === "tr" ? "tr-TR" : undefined;

const en = {
  // navigation & shell
  navHome: "Home",
  navNotes: "Notes",
  navEvents: "Events",
  navCourses: "Courses",
  navExams: "Exams",
  navMarks: "Marks",
  navUsers: "Users",
  logout: "Log out",
  profileLink: "Profile",
  otherLanguage: "Türkçe",

  // shared bits
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  edit: "Edit",
  remove: "Remove",
  apply: "Apply",
  you: " (you)",
  title: "Title",
  description: "Description",
  status: "Status",
  reallyDelete: "Really delete?",
  reallyRemove: "Really remove?",
  somethingWrong: "something went wrong",
  retryIn: (s: number) => `retry in ${s}s`,
  networkError: "network error — is the backend up?",
  unscheduled: "Unscheduled",
  until: (time: string) => `Until ${time}`,

  // login
  loginWelcome: "Welcome back — log in to continue.",
  registerWelcome: "Create an account to get started.",
  username: "Username",
  password: "Password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  atLeastChars: (n: number) => `At least ${n} characters.`,
  logIn: "Log in",
  createAccount: "Create account",
  switchToRegister: "New here? Register",
  switchToLogin: "Have an account? Log in",

  // home
  greeting: (name: string, hour: number) =>
    `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, ${name}`,
  statNotes: "Notes",
  statUpcoming: "Upcoming events",
  statMyCourses: "My courses",
  statAverage: "Average",
  upcomingEvents: "Upcoming events",
  myCourses: "My courses",
  viewAll: "View all",
  nothingScheduled: "Nothing scheduled.",
  notEnrolledYet: "Not enrolled in any course yet.",

  // notes
  notesTitle: "Notes",
  notesSub: "Your personal scratchpad — visible only to you.",
  newNote: "New note",
  content: "Content",
  writeSomething: "Write something…",
  addNote: "Add note",
  noNotesYet: "No notes yet — write your first one.",
  deleteNote: "Delete",

  // events
  eventsTitle: "Events",
  eventsSub: "What's happening — open one to see or mark attendance.",
  newEvent: "New event",
  starts: "Starts",
  ends: "Ends",
  addEvent: "Add event",
  noEventsYet: "No events yet.",
  attendance: "Attendance",
  iAm: (status: AttendanceStatus) =>
    ({ present: "I'm here", absent: "I'm absent", late: "I'm late", excused: "I'm excused" })[status],
  attendanceWord: (status: AttendanceStatus) =>
    ({ present: "present", absent: "absent", late: "late", excused: "excused" })[status],
  person: "Person",
  markUser: "Mark user",
  nobodyMarkedYet: "Nobody marked yet.",
  userCol: "User",
  deleteEvent: "Delete event",
  reallyDeleteEvent: "Really delete event?",
  eventMissing: "This event does not exist.",
  eventLoadFailed: "Failed to load the event.",

  // courses
  coursesTitle: "Courses",
  coursesSub: "Everything on offer — your enrollments are tagged.",
  newCourse: "New course",
  addCourse: "Add course",
  noCoursesYet: "No courses yet.",
  enrolledBadge: "enrolled",
  deleteCourse: "Delete course",
  reallyDeleteCourse: "Really delete course?",
  courseMissing: "This course does not exist.",
  courseLoadFailed: "Failed to load the course.",
  roster: "Roster",
  student: "Student",
  enrolledBy: "Enrolled by",
  enroll: "Enroll",
  unenroll: "Unenroll",
  nobodyEnrolledYet: "Nobody enrolled yet.",

  // exams
  examsTitle: "Exams",
  examsSubAll: "All exams across courses.",
  examsSubCreate: "New ones are created inside a course.",
  coursePrefix: "Course:",
  newExam: "New exam",
  addExam: "Add exam",
  noExamsYet: "No exams yet.",
  kind: "Kind",
  weight: "Weight",
  kindWord: (kind: ExamKind) =>
    ({ homework: "homework", quiz: "quiz", midterm: "midterm", final: "final", project: "project", oral: "oral" })[kind],
  weightBadge: (n: number) => `counts ×${n}`,
  weightTitle: "how many times this exam counts toward the course average",
  deleteExam: "Delete exam",
  reallyDeleteExam: "Really delete exam?",
  examMissing: "This exam does not exist.",
  examLoadFailed: "Failed to load the exam.",
  myResult: "My result",
  notGradedYet: "Not graded yet.",
  statistics: "Statistics",
  gradedStat: "Graded",
  averageStat: "Average",
  minStat: "Min",
  maxStat: "Max",
  results: "Results",
  mark0100: "Mark (0–100)",
  gradeAction: "Grade",
  noResultsYet: "No results yet.",

  // exam scheduling
  timing: "Timing",
  timingNone: "No timer — held outside the app",
  timingSync: "Live — everyone at the same time",
  timingAsync: "Flexible — own timer inside a window",
  opens: "Opens",
  closes: "Closes",
  minutesPerStudent: "Minutes per student",
  syncHint: "Students sit it together: everyone's time runs out when the exam closes.",
  asyncHint: "Each student's own timer starts when they enter, inside the open window.",
  endsAfterStarts: "The closing time must be after the opening time",

  // sitting card
  examTime: "Exam time",
  phaseWord: (phase: "upcoming" | "open" | "closed") =>
    ({ upcoming: "Opens soon", open: "Open now", closed: "Closed" })[phase],
  minutesEach: (n: number) => `${n} minutes each`,
  turnedInAt: (time: string) => `Turned in ✓ ${time}`,
  seeMyAnswers: "See my answers",
  timeRanOut: "Time ran out — everything saved up to the end still counts.",
  continueExam: "Continue exam",
  answeredOf: (a: number, b: number) => `${a} / ${b} answered`,
  timeLeftShort: (countdown: string) => `${countdown} left`,
  enterExam: "Enter exam",
  startTimerConfirm: (n: number) => `Start now? Your ${n} minutes begin`,
  opensAt: (time: string) => `Opens ${time}.`,
  examOver: "This exam is over.",

  // exam room
  notEnteredYet: "You haven't entered this exam yet.",
  backToExam: "Back to the exam",
  turnIn: "Turn in",
  turnInNow: "Turn in now?",
  turnInUnanswered: (n: number) => `Turn in with ${n} unanswered?`,
  turnedInBanner: (time: string) =>
    `Turned in ✓ ${time} — you can still read your answers below.`,
  timeUpBanner: "Time is up. Everything saved before the end still counts.",
  noQuestionsRoom: "No questions here — your teacher grades this exam by hand.",
  writeAnswerHere: "Write your answer here…",
  savingState: "Saving…",
  savedState: "Saved ✓",
  notSavedState: "Not saved!",
  turnedInChip: "Turned in",
  timeUpChip: "Time up",
  pts: (n: number) => `${n} pts`,
  savingFailed: "saving failed",

  // question authoring
  questionsTitle: "Questions",
  totalPoints: (n: number) => `${n} points`,
  addQuestion: "Add question",
  noQuestionsYet: "No questions yet — students will see an empty exam.",
  questionLabel: "Question",
  answerType: "Answer type",
  answerTypeChoice: "Pick one option",
  answerTypeText: "Written answer",
  points: "Points",
  questionKindWord: (kind: QuestionKind) =>
    ({ choice: "choice", text: "written" })[kind],
  tickRightAnswer: "Tick the circle next to the right answer.",
  optionN: (n: number) => `Option ${n}`,
  optionIsRight: (n: number) => `Option ${n} is the right answer`,
  removeOption: "Remove this option",
  addOption: "Add option",
  saveQuestion: "Save question",

  // live monitor
  liveMonitor: "Live monitor",
  countEnrolled: (n: number) => `${n} enrolled`,
  countWriting: (n: number) => `${n} writing`,
  countTurnedIn: (n: number) => `${n} turned in`,
  countNotStarted: (n: number) => `${n} not started`,
  countTimeUp: (n: number) => `${n} time up`,
  countGraded: (n: number) => `${n} graded`,
  liveStatusWord: (status: LiveStudent["status"]) =>
    ({ not_started: "Not started", in_progress: "Writing", submitted: "Turned in", expired: "Time up" })[status],
  answeredCol: "Answered",
  timeLeftCol: "Time left",
  lastSaveCol: "Last save",
  markCol: "Mark",
  review: "Review",
  nobodyEnrolledCourse: "Nobody is enrolled in this course yet.",
  sheetTitle: (name: string) => `${name}'s answers`,
  noAnswer: "No answer.",
  rightAnswerIs: (text: string) => ` ✗ (right: ${text})`,
  autoScoreLine: (earned: number, possible: number) =>
    `Auto-score over choice questions: ${earned} / ${possible} points — a suggestion, the mark below is yours to give.`,
  noQuestionsSheet: "This exam has no questions.",
  agoSeconds: (s: number) => `${s}s ago`,
  agoMinutes: (m: number) => `${m}m ago`,

  // marks
  marksTitle: "My marks",
  marksSub: "Graded exams per course, weighted averages included.",
  marksLoadFailed: "Failed to load your marks.",
  overallAverage: "Overall average",
  courseAverageTitle: "weighted course average",
  overallAverageTitle: "mean of the course averages",
  studentLookup: "Student lookup",
  showMarks: "Show marks",
  reportFor: (name: string) => `Report for ${name}`,
  notEnrolledAny: "Not enrolled in any course.",
  nothingGradedYet: "Nothing graded yet.",
  examCol: "Exam",

  // profile & users
  personalInfo: "Personal info",
  leaveEmptyToClear: "Leave a field empty to clear it.",
  nameField: "Name",
  surnameField: "Surname",
  emailField: "Email",
  phoneField: "Phone",
  birthDateField: "Birth date",
  savedDot: "Saved.",
  phoneTitle: (min: number, max: number) =>
    `${min} to ${max} digits; +, spaces, dashes, and parentheses are allowed`,
  usersTitle: "Users",
  usersSub: "Every account, with roles and personal records.",
  adminsOnly: "Admins only.",
  idCol: "Id",
  contactCol: "Contact",
  bornCol: "Born",
  roleCol: "Role",
  roleWord: (role: Role) =>
    ({ student: "student", teacher: "teacher", manager: "manager", admin: "admin" })[role],
  saveProfile: "Save profile",
  noUsers: "No users.",

  // user picker
  typeAName: "Type a name…",
  nobodyFound: "Nobody found.",
  pickFromList: "Pick a person from the list",

  // not found
  pageFlewAway: "This page flew away.",
  backHome: "Back home",
};

type Dict = typeof en;

const tr: Dict = {
  // navigation & shell
  navHome: "Ana sayfa",
  navNotes: "Not defteri",
  navEvents: "Etkinlikler",
  navCourses: "Dersler",
  navExams: "Sınavlar",
  navMarks: "Karnem",
  navUsers: "Kullanıcılar",
  logout: "Çıkış yap",
  profileLink: "Profilim",
  otherLanguage: "English",

  // shared bits
  save: "Kaydet",
  cancel: "Vazgeç",
  close: "Kapat",
  edit: "Düzenle",
  remove: "Kaldır",
  apply: "Uygula",
  you: " (sen)",
  title: "Başlık",
  description: "Açıklama",
  status: "Durum",
  reallyDelete: "Silinsin mi?",
  reallyRemove: "Kaldırılsın mı?",
  somethingWrong: "bir şeyler ters gitti",
  retryIn: (s: number) => `${s} sn sonra tekrar dene`,
  networkError: "ağ hatası — sunucu çalışıyor mu?",
  unscheduled: "Tarihsiz",
  until: (time: string) => `Bitiş: ${time}`,

  // login
  loginWelcome: "Tekrar hoş geldin — devam etmek için giriş yap.",
  registerWelcome: "Başlamak için bir hesap oluştur.",
  username: "Kullanıcı adı",
  password: "Şifre",
  showPassword: "Şifreyi göster",
  hidePassword: "Şifreyi gizle",
  atLeastChars: (n: number) => `En az ${n} karakter.`,
  logIn: "Giriş yap",
  createAccount: "Hesap oluştur",
  switchToRegister: "Yeni misin? Kayıt ol",
  switchToLogin: "Hesabın var mı? Giriş yap",

  // home
  greeting: (name: string, hour: number) =>
    hour < 12 ? `Günaydın ${name}` : hour < 18 ? `İyi günler ${name}` : `İyi akşamlar ${name}`,
  statNotes: "Not defteri",
  statUpcoming: "Yaklaşan etkinlik",
  statMyCourses: "Derslerim",
  statAverage: "Ortalamam",
  upcomingEvents: "Yaklaşan etkinlikler",
  myCourses: "Derslerim",
  viewAll: "Tümünü gör",
  nothingScheduled: "Planlanmış bir şey yok.",
  notEnrolledYet: "Henüz bir derse kayıtlı değilsin.",

  // notes
  notesTitle: "Not defteri",
  notesSub: "Kişisel defterin — sadece sen görürsün.",
  newNote: "Yeni not",
  content: "İçerik",
  writeSomething: "Bir şeyler yaz…",
  addNote: "Not ekle",
  noNotesYet: "Henüz not yok — ilkini yaz.",
  deleteNote: "Sil",

  // events
  eventsTitle: "Etkinlikler",
  eventsSub: "Neler oluyor — yoklamayı görmek ya da işaretlemek için birine gir.",
  newEvent: "Yeni etkinlik",
  starts: "Başlangıç",
  ends: "Bitiş",
  addEvent: "Etkinlik ekle",
  noEventsYet: "Henüz etkinlik yok.",
  attendance: "Yoklama",
  iAm: (status: AttendanceStatus) =>
    ({ present: "Buradayım", absent: "Yokum", late: "Geç kaldım", excused: "İzinliyim" })[status],
  attendanceWord: (status: AttendanceStatus) =>
    ({ present: "geldi", absent: "gelmedi", late: "geç", excused: "izinli" })[status],
  person: "Kişi",
  markUser: "Kişiyi işaretle",
  nobodyMarkedYet: "Henüz kimse işaretlenmedi.",
  userCol: "Kullanıcı",
  deleteEvent: "Etkinliği sil",
  reallyDeleteEvent: "Etkinlik silinsin mi?",
  eventMissing: "Böyle bir etkinlik yok.",
  eventLoadFailed: "Etkinlik yüklenemedi.",

  // courses
  coursesTitle: "Dersler",
  coursesSub: "Tüm dersler — kayıtlı oldukların işaretli.",
  newCourse: "Yeni ders",
  addCourse: "Ders ekle",
  noCoursesYet: "Henüz ders yok.",
  enrolledBadge: "kayıtlısın",
  deleteCourse: "Dersi sil",
  reallyDeleteCourse: "Ders silinsin mi?",
  courseMissing: "Böyle bir ders yok.",
  courseLoadFailed: "Ders yüklenemedi.",
  roster: "Sınıf listesi",
  student: "Öğrenci",
  enrolledBy: "Kaydeden",
  enroll: "Derse ekle",
  unenroll: "Dersten çıkar",
  nobodyEnrolledYet: "Henüz kimse kayıtlı değil.",

  // exams
  examsTitle: "Sınavlar",
  examsSubAll: "Bütün derslerin sınavları.",
  examsSubCreate: "Yeni sınav ders sayfasında açılır.",
  coursePrefix: "Ders:",
  newExam: "Yeni sınav",
  addExam: "Sınav ekle",
  noExamsYet: "Henüz sınav yok.",
  kind: "Tür",
  weight: "Ağırlık",
  kindWord: (kind: ExamKind) =>
    ({ homework: "ödev", quiz: "küçük sınav", midterm: "ara sınav", final: "dönem sonu", project: "proje", oral: "sözlü" })[kind],
  weightBadge: (n: number) => `×${n} sayılır`,
  weightTitle: "bu sınav ders ortalamasına kaç kez sayılır",
  deleteExam: "Sınavı sil",
  reallyDeleteExam: "Sınav silinsin mi?",
  examMissing: "Böyle bir sınav yok.",
  examLoadFailed: "Sınav yüklenemedi.",
  myResult: "Sonucum",
  notGradedYet: "Henüz notlanmadı.",
  statistics: "İstatistik",
  gradedStat: "Notlanan",
  averageStat: "Ortalama",
  minStat: "En düşük",
  maxStat: "En yüksek",
  results: "Sonuçlar",
  mark0100: "Not (0–100)",
  gradeAction: "Notla",
  noResultsYet: "Henüz sonuç yok.",

  // exam scheduling
  timing: "Zamanlama",
  timingNone: "Zamansız — uygulama dışında yapılır",
  timingSync: "Canlı — herkes aynı anda",
  timingAsync: "Esnek — açık aralıkta kendi süresi",
  opens: "Açılış",
  closes: "Kapanış",
  minutesPerStudent: "Öğrenci başına dakika",
  syncHint: "Herkes birlikte yazar: süre, sınav kapanınca herkes için biter.",
  asyncHint: "Her öğrencinin süresi, açık aralık içinde girdiği anda başlar.",
  endsAfterStarts: "Kapanış, açılıştan sonra olmalı",

  // sitting card
  examTime: "Sınav zamanı",
  phaseWord: (phase: "upcoming" | "open" | "closed") =>
    ({ upcoming: "Yakında açılır", open: "Şimdi açık", closed: "Kapandı" })[phase],
  minutesEach: (n: number) => `herkese ${n} dakika`,
  turnedInAt: (time: string) => `Teslim edildi ✓ ${time}`,
  seeMyAnswers: "Cevaplarımı gör",
  timeRanOut: "Süre doldu — sona kadar kaydedilenler geçerli.",
  continueExam: "Sınava devam et",
  answeredOf: (a: number, b: number) => `${a} / ${b} cevaplandı`,
  timeLeftShort: (countdown: string) => `${countdown} kaldı`,
  enterExam: "Sınava gir",
  startTimerConfirm: (n: number) => `Başlasın mı? ${n} dakikan şimdi başlar`,
  opensAt: (time: string) => `${time} açılır.`,
  examOver: "Bu sınav bitti.",

  // exam room
  notEnteredYet: "Bu sınava henüz girmedin.",
  backToExam: "Sınav sayfasına dön",
  turnIn: "Teslim et",
  turnInNow: "Teslim edilsin mi?",
  turnInUnanswered: (n: number) => `${n} soru boş — teslim edilsin mi?`,
  turnedInBanner: (time: string) =>
    `Teslim edildi ✓ ${time} — cevaplarını aşağıda görebilirsin.`,
  timeUpBanner: "Süre doldu. Bitmeden kaydedilen her şey geçerli.",
  noQuestionsRoom: "Burada soru yok — öğretmenin bu sınavı elden notlayacak.",
  writeAnswerHere: "Cevabını buraya yaz…",
  savingState: "Kaydediliyor…",
  savedState: "Kaydedildi ✓",
  notSavedState: "Kaydedilemedi!",
  turnedInChip: "Teslim edildi",
  timeUpChip: "Süre doldu",
  pts: (n: number) => `${n} puan`,
  savingFailed: "kaydedilemedi",

  // question authoring
  questionsTitle: "Sorular",
  totalPoints: (n: number) => `${n} puan`,
  addQuestion: "Soru ekle",
  noQuestionsYet: "Henüz soru yok — öğrenciler boş sınav görür.",
  questionLabel: "Soru",
  answerType: "Cevap türü",
  answerTypeChoice: "Şıklı (tek doğru)",
  answerTypeText: "Yazılı cevap",
  points: "Puan",
  questionKindWord: (kind: QuestionKind) =>
    ({ choice: "şıklı", text: "yazılı" })[kind],
  tickRightAnswer: "Doğru cevabın yanındaki yuvarlağı işaretle.",
  optionN: (n: number) => `Seçenek ${n}`,
  optionIsRight: (n: number) => `Doğru cevap ${n}. seçenek`,
  removeOption: "Bu seçeneği kaldır",
  addOption: "Seçenek ekle",
  saveQuestion: "Soruyu kaydet",

  // live monitor
  liveMonitor: "Canlı izleme",
  countEnrolled: (n: number) => `${n} kayıtlı`,
  countWriting: (n: number) => `${n} yazıyor`,
  countTurnedIn: (n: number) => `${n} teslim etti`,
  countNotStarted: (n: number) => `${n} başlamadı`,
  countTimeUp: (n: number) => `${n} süresi doldu`,
  countGraded: (n: number) => `${n} notlandı`,
  liveStatusWord: (status: LiveStudent["status"]) =>
    ({ not_started: "Başlamadı", in_progress: "Yazıyor", submitted: "Teslim etti", expired: "Süresi doldu" })[status],
  answeredCol: "Cevaplanan",
  timeLeftCol: "Kalan süre",
  lastSaveCol: "Son kayıt",
  markCol: "Not",
  review: "İncele",
  nobodyEnrolledCourse: "Bu derse henüz kimse kayıtlı değil.",
  sheetTitle: (name: string) => `${name} — cevaplar`,
  noAnswer: "Cevap yok.",
  rightAnswerIs: (text: string) => ` ✗ (doğrusu: ${text})`,
  autoScoreLine: (earned: number, possible: number) =>
    `Şıklı sorularda otomatik puan: ${earned} / ${possible} — sadece bir öneri, aşağıdaki notu sen verirsin.`,
  noQuestionsSheet: "Bu sınavda soru yok.",
  agoSeconds: (s: number) => `${s} sn önce`,
  agoMinutes: (m: number) => `${m} dk önce`,

  // marks
  marksTitle: "Karnem",
  marksSub: "Ders ders notların, ağırlıklı ortalamalarınla birlikte.",
  marksLoadFailed: "Karnen yüklenemedi.",
  overallAverage: "Genel ortalama",
  courseAverageTitle: "ağırlıklı ders ortalaması",
  overallAverageTitle: "ders ortalamalarının ortalaması",
  studentLookup: "Öğrenci ara",
  showMarks: "Karneyi gör",
  reportFor: (name: string) => `${name} — karne`,
  notEnrolledAny: "Hiçbir derse kayıtlı değil.",
  nothingGradedYet: "Henüz not girilmedi.",
  examCol: "Sınav",

  // profile & users
  personalInfo: "Kişisel bilgiler",
  leaveEmptyToClear: "Boş bıraktığın alan silinir.",
  nameField: "Ad",
  surnameField: "Soyad",
  emailField: "E-posta",
  phoneField: "Telefon",
  birthDateField: "Doğum tarihi",
  savedDot: "Kaydedildi.",
  phoneTitle: (min: number, max: number) =>
    `${min}–${max} rakam; +, boşluk, tire ve parantez kullanılabilir`,
  usersTitle: "Kullanıcılar",
  usersSub: "Bütün hesaplar: roller ve kişisel kayıtlar.",
  adminsOnly: "Sadece adminler.",
  idCol: "Kimlik",
  contactCol: "İletişim",
  bornCol: "Doğum",
  roleCol: "Rol",
  roleWord: (role: Role) =>
    ({ student: "öğrenci", teacher: "öğretmen", manager: "müdür", admin: "admin" })[role],
  saveProfile: "Profili kaydet",
  noUsers: "Kullanıcı yok.",

  // user picker
  typeAName: "Bir isim yaz…",
  nobodyFound: "Kimse bulunamadı.",
  pickFromList: "Listeden birini seç",

  // not found
  pageFlewAway: "Bu sayfa uçup gitmiş.",
  backHome: "Ana sayfaya dön",
};

/**
 * The current-language entry for `key`: a string for plain lines, a function
 * for parameterized ones (call it: `t("pts")(10)`). Reactive — any JSX or
 * memo reading it re-renders on language switch.
 */
export function t<K extends keyof Dict>(key: K): Dict[K] {
  return (lang() === "tr" ? tr : en)[key];
}
