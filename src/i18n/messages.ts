export type Locale = "en" | "tr";

export type MessageKey =
  | "app.name"
  | "app.tagline"
  | "nav.home"
  | "nav.notes"
  | "nav.events"
  | "nav.exams"
  | "nav.courses"
  | "nav.marks"
  | "nav.users"
  | "nav.guide"
  | "nav.logout"
  | "nav.menu"
  | "nav.close"
  | "nav.collapse"
  | "nav.expand"
  | "nav.account"
  | "nav.preferences"
  | "common.loading"
  | "common.cancel"
  | "common.save"
  | "common.create"
  | "common.edit"
  | "common.delete"
  | "common.update"
  | "common.remove"
  | "common.back"
  | "common.search"
  | "common.or"
  | "common.tryAgain"
  | "common.notFound"
  | "common.goHome"
  | "common.learnMore"
  | "common.gotIt"
  | "confirm.review"
  | "confirm.summary"
  | "confirm.confirmDelete"
  | "confirm.confirmUpdate"
  | "confirm.deleteTitle"
  | "confirm.updateTitle"
  | "confirm.deleteNote"
  | "confirm.updateNote"
  | "confirm.deleteEvent"
  | "confirm.updateEvent"
  | "confirm.deleteExam"
  | "confirm.updateExam"
  | "confirm.removeAttendance"
  | "confirm.removeResult"
  | "confirm.updateRole"
  | "confirm.gradeStudent"
  | "common.prev"
  | "common.next"
  | "common.pageOf"
  | "common.creator"
  | "common.searchPlaceholder"
  | "common.all"
  | "common.saveAttendance"
  | "theme.light"
  | "theme.dark"
  | "theme.toggle"
  | "lang.en"
  | "lang.tr"
  | "lang.label"
  | "auth.login"
  | "auth.register"
  | "auth.username"
  | "auth.password"
  | "auth.noAccount"
  | "auth.hasAccount"
  | "auth.loginTitle"
  | "auth.loginSubtitle"
  | "auth.registerTitle"
  | "auth.registerSubtitle"
  | "auth.usernameHint"
  | "auth.passwordHint"
  | "auth.welcomeBack"
  | "auth.createStudent"
  | "dashboard.greeting"
  | "dashboard.subtitle"
  | "dashboard.overview"
  | "dashboard.quickActions"
  | "dashboard.action.note"
  | "dashboard.action.noteHint"
  | "dashboard.action.event"
  | "dashboard.action.eventHint"
  | "dashboard.action.course"
  | "dashboard.action.courseHint"
  | "dashboard.action.exam"
  | "dashboard.action.examHint"
  | "dashboard.action.attend"
  | "dashboard.action.attendHint"
  | "dashboard.action.marks"
  | "dashboard.action.marksHint"
  | "dashboard.stats.notes"
  | "dashboard.stats.events"
  | "dashboard.stats.exams"
  | "dashboard.stats.role"
  | "dashboard.stats.average"
  | "dashboard.stats.averageHint"
  | "dashboard.myExams"
  | "dashboard.emptyExamsTitle"
  | "dashboard.emptyExamsCta"
  | "dashboard.recentNotes"
  | "dashboard.upcomingEvents"
  | "dashboard.noNotes"
  | "dashboard.noEvents"
  | "dashboard.emptyNotesTitle"
  | "dashboard.emptyEventsTitle"
  | "dashboard.emptyNotesCta"
  | "dashboard.emptyEventsCta"
  | "dashboard.viewAll"
  | "dashboard.getStarted"
  | "dashboard.helpTitle"
  | "dashboard.helpBody"
  | "dashboard.continueGuide"
  | "notes.title"
  | "notes.subtitle"
  | "notes.new"
  | "notes.empty"
  | "notes.noContent"
  | "notes.helpTitle"
  | "notes.helpBody"
  | "events.title"
  | "events.subtitle"
  | "events.create"
  | "events.empty"
  | "events.starts"
  | "events.ends"
  | "events.markSelf"
  | "events.markOther"
  | "events.attendance"
  | "events.noAttendance"
  | "events.userId"
  | "events.status"
  | "events.helpTitle"
  | "events.helpBody"
  | "events.clearStart"
  | "events.clearEnd"
  | "exams.title"
  | "exams.subtitle"
  | "exams.create"
  | "exams.empty"
  | "exams.kind"
  | "exams.yourResult"
  | "exams.notGraded"
  | "exams.gradeStudent"
  | "exams.results"
  | "exams.noResults"
  | "exams.helpTitle"
  | "exams.helpBody"
  | "admin.title"
  | "admin.subtitle"
  | "admin.username"
  | "admin.id"
  | "admin.role"
  | "admin.helpTitle"
  | "admin.helpBody"
  | "guide.title"
  | "guide.subtitle"
  | "guide.step1.title"
  | "guide.step1.body"
  | "guide.step2.title"
  | "guide.step2.body"
  | "guide.step3.title"
  | "guide.step3.body"
  | "guide.step4.title"
  | "guide.step4.body"
  | "guide.step5.title"
  | "guide.step5.body"
  | "guide.step6.title"
  | "guide.step6.body"
  | "guide.rolesTitle"
  | "courses.helpTitle"
  | "courses.helpBody"
  | "marks.helpTitle"
  | "marks.helpBody"
  | "guide.rolesBody"
  | "guide.tipsTitle"
  | "form.title"
  | "form.content"
  | "form.description"
  | "form.mark"
  | "form.studentId"
  | "form.titleRequired"
  | "form.titleMax"
  | "form.contentMax"
  | "form.descriptionMax"
  | "form.timeOrder"
  | "form.markRange"
  | "events.markedBy"
  | "exams.gradedBy"
  | "status.present"
  | "status.absent"
  | "status.late"
  | "status.excused"
  | "guide.tip1"
  | "guide.tip2"
  | "guide.tip3"
  | "guide.tip4"
  | "auth.featureModules"
  | "auth.featurePrefs"
  | "app.workspace"
  | "role.student"
  | "role.teacher"
  | "role.manager"
  | "role.admin"
  | "courses.title"
  | "courses.subtitle"
  | "courses.create"
  | "courses.empty"
  | "courses.enrolled"
  | "courses.roster"
  | "courses.enroll"
  | "courses.exams"
  | "courses.addExam"
  | "courses.weight"
  | "courses.delete"
  | "marks.title"
  | "marks.subtitle"
  | "marks.overall"
  | "marks.courseAvg"
  | "marks.empty"
  | "marks.lookup"
  | "marks.show"
  | "marks.forUser"
  | "marks.exam"
  | "marks.weight"
  | "marks.mark"
  | "exams.mustBelongCourse";

type Dict = Record<MessageKey, string>;

const en: Dict = {
  "app.name": "Hezarfen",
  "app.tagline": "Your campus workspace — notes, events, exams in one calm place.",
  "nav.home": "Home",
  "nav.notes": "Notes",
  "nav.events": "Events",
  "nav.exams": "Exams",
  "nav.courses": "Courses",
  "nav.marks": "Report card",
  "nav.users": "Users",
  "nav.guide": "Guide",
  "nav.logout": "Log out",
  "nav.menu": "Menu",
  "nav.close": "Close",
  "nav.collapse": "Collapse sidebar",
  "nav.expand": "Expand sidebar",
  "nav.account": "Account",
  "nav.preferences": "Preferences",
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.create": "Create",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.update": "Update",
  "common.remove": "Remove",
  "common.back": "Back",
  "common.search": "Search",
  "common.or": "or",
  "common.tryAgain": "Try again",
  "common.notFound": "Page not found",
  "common.goHome": "Go home",
  "common.learnMore": "Learn more",
  "common.gotIt": "Got it",
  "confirm.review": "Please review the details before continuing.",
  "confirm.summary": "Summary",
  "confirm.confirmDelete": "Yes, delete",
  "confirm.confirmUpdate": "Yes, update",
  "confirm.deleteTitle": "Confirm delete",
  "confirm.updateTitle": "Confirm update",
  "confirm.deleteNote": "Delete note “{title}”?",
  "confirm.updateNote": "Update note “{title}”?",
  "confirm.deleteEvent": "Delete event “{title}”?",
  "confirm.updateEvent": "Update event “{title}”?",
  "confirm.deleteExam": "Delete exam “{title}”?",
  "confirm.updateExam": "Update exam “{title}”?",
  "confirm.removeAttendance": "Remove attendance for user {user}?",
  "confirm.removeResult": "Remove grade for user {user}?",
  "confirm.updateRole": "Change role of {user} from {from} to {to}?",
  "confirm.gradeStudent": "Grade user {user} with mark {mark}/100?",
  "common.prev": "Previous",
  "common.next": "Next",
  "common.pageOf": "{page} / {total}",
  "common.creator": "Created by",
  "common.searchPlaceholder": "Search…",
  "common.all": "All",
  "common.saveAttendance": "Save my attendance",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.toggle": "Toggle theme",
  "lang.en": "English",
  "lang.tr": "Türkçe",
  "lang.label": "Language",
  "auth.login": "Log in",
  "auth.register": "Create account",
  "auth.username": "Username",
  "auth.password": "Password",
  "auth.noAccount": "New here?",
  "auth.hasAccount": "Already registered?",
  "auth.loginTitle": "Welcome back",
  "auth.loginSubtitle": "Sign in to continue to your workspace.",
  "auth.registerTitle": "Join Hezarfen",
  "auth.registerSubtitle": "New accounts start as student. Teachers and admins are assigned later.",
  "auth.usernameHint": "3–32 characters",
  "auth.passwordHint": "6–128 characters",
  "auth.welcomeBack": "Good to see you again",
  "auth.createStudent": "Create student account",
  "dashboard.greeting": "Hello, {name}",
  "dashboard.subtitle": "Here’s what’s happening across your workspace.",
  "dashboard.overview": "Overview",
  "dashboard.quickActions": "Quick actions",
  "dashboard.action.note": "New note",
  "dashboard.action.noteHint": "Capture something quickly",
  "dashboard.action.event": "Create event",
  "dashboard.action.eventHint": "Schedule a session",
  "dashboard.action.course": "New course",
  "dashboard.action.courseHint": "Open a class",
  "dashboard.action.exam": "Add exam",
  "dashboard.action.examHint": "Under a course",
  "dashboard.action.attend": "Mark attendance",
  "dashboard.action.attendHint": "Open events list",
  "dashboard.action.marks": "My report card",
  "dashboard.action.marksHint": "See averages",
  "dashboard.stats.notes": "Notes",
  "dashboard.stats.events": "Events",
  "dashboard.stats.exams": "Exams",
  "dashboard.stats.role": "Your role",
  "dashboard.stats.average": "Average",
  "dashboard.stats.averageHint": "Overall report card",
  "dashboard.myExams": "My exams",
  "dashboard.emptyExamsTitle": "No exams yet",
  "dashboard.emptyExamsCta": "Browse exams",
  "dashboard.recentNotes": "Recent notes",
  "dashboard.upcomingEvents": "Events snapshot",
  "dashboard.noNotes": "No notes yet — capture your first idea.",
  "dashboard.noEvents": "No events scheduled right now.",
  "dashboard.emptyNotesTitle": "Your notebook is empty",
  "dashboard.emptyEventsTitle": "No events yet",
  "dashboard.emptyNotesCta": "Write a note",
  "dashboard.emptyEventsCta": "Browse events",
  "dashboard.viewAll": "View all",
  "dashboard.getStarted": "Get started",
  "dashboard.helpTitle": "How this home works",
  "dashboard.helpBody":
    "Home shows live counts and shortcuts for notes, events, courses, exams, and your report card. Open Guide (bottom of the sidebar) for the full walkthrough.",
  "dashboard.continueGuide": "Open the guide",
  "notes.title": "Notes",
  "notes.subtitle": "Private scratchpad for class ideas and reminders.",
  "notes.new": "New note",
  "notes.empty": "Nothing here yet. Write your first note on the left.",
  "notes.noContent": "No content",
  "notes.helpTitle": "About notes",
  "notes.helpBody":
    "Notes are private to you only. Title max 200 characters, content max 10,000. Delete and update open a confirmation dialog with a short summary before they run.",
  "events.title": "Events",
  "events.subtitle": "Sessions, meetups, and attendance in one list.",
  "events.create": "Create event",
  "events.empty": "No events yet.",
  "events.starts": "Starts",
  "events.ends": "Ends",
  "events.markSelf": "Mark my attendance",
  "events.markOther": "Mark another person",
  "events.attendance": "Attendance roster",
  "events.noAttendance": "No attendance rows yet.",
  "events.userId": "User id",
  "events.status": "Status",
  "events.helpTitle": "About events",
  "events.helpBody":
    "Students mark themselves present / absent / late / excused with the big status buttons, then save attendance. Teachers create events and can mark others by user id. Managers can edit any event.",
  "events.clearStart": "Will clear start time",
  "events.clearEnd": "Will clear end time",
  "exams.title": "Exams",
  "exams.subtitle": "All exams across courses — create them under a course.",
  "exams.create": "Create exam",
  "exams.empty": "No exams published yet.",
  "exams.kind": "Kind",
  "exams.yourResult": "Your result",
  "exams.notGraded": "Not graded yet",
  "exams.gradeStudent": "Grade a student",
  "exams.results": "Results table",
  "exams.noResults": "No results yet.",
  "exams.helpTitle": "About exams",
  "exams.helpBody":
    "Exams belong to a course. Teachers add them from the course page with a kind and weight (1–100). Students only see their own mark (or “not graded yet”). Weighted averages appear on the report card.",
  "admin.title": "People & roles",
  "admin.subtitle": "Promote or demote accounts. You can’t change your own role.",
  "admin.username": "Username",
  "admin.id": "Id",
  "admin.role": "Role",
  "admin.helpTitle": "Role hierarchy",
  "admin.helpBody":
    "student < teacher < manager < admin. Higher roles inherit lower permissions. Registration always creates a student. Only admins list users and change roles.",
  "guide.title": "Product guide",
  "guide.subtitle": "Campus flow: courses → exams → report card, plus notes and events.",
  "guide.step1.title": "1. Home overview",
  "guide.step1.body":
    "Live counts and shortcuts for notes, events, courses, exams, and your report card.",
  "guide.step2.title": "2. Notes",
  "guide.step2.body":
    "Private scratchpad. Create, edit, delete — delete/update ask for confirmation with a short summary.",
  "guide.step3.title": "3. Events & attendance",
  "guide.step3.body":
    "Open an event, pick present/absent/late/excused, save attendance. Teachers can mark others.",
  "guide.step4.title": "4. Courses",
  "guide.step4.body":
    "Teachers create a course, enroll students, then add weighted exams inside that course.",
  "guide.step5.title": "5. Exams",
  "guide.step5.body":
    "List all exams here. New exams are created from a course page (not from this list).",
  "guide.step6.title": "6. Report card",
  "guide.step6.body":
    "Your weighted course averages and overall average. Teachers can look up any student.",
  "guide.rolesTitle": "Who can do what?",
  "guide.rolesBody":
    "Student: notes, events attendance, view courses/exams, own results & report card. Teacher: create courses/events, enroll, add exams, grade. Manager: manage any course/event. Admin: user roles.",
  "guide.tipsTitle": "Tips",
  "courses.helpTitle": "About courses",
  "courses.helpBody":
    "A course is the classroom container. Teachers enroll students and add weighted exams here. Deleting a course removes its exams, results, and enrollments.",
  "marks.helpTitle": "About the report card",
  "marks.helpBody":
    "Course average = Σ(mark × weight) / Σ(weight) over graded exams. Overall average is the mean of non-null course averages. Ungraded exams are skipped, not zeroed.",
  "form.title": "Title",
  "form.content": "Content",
  "form.description": "Description",
  "form.mark": "Mark",
  "form.studentId": "Student user id",
  "form.titleRequired": "Title is required",
  "form.titleMax": "Title must be at most 200 characters",
  "form.contentMax": "Content must be at most 10 000 characters",
  "form.descriptionMax": "Description must be at most 2 000 characters",
  "form.timeOrder": "End time must be on or after start time",
  "form.markRange": "Mark must be an integer from 0 to 100",
  "events.markedBy": "Marked by",
  "exams.gradedBy": "Graded by",
  "status.present": "Present",
  "status.absent": "Absent",
  "status.late": "Late",
  "status.excused": "Excused",
  "guide.tip1": "TR / EN and theme live in the avatar dropdown (submenus with icons).",
  "guide.tip2": "Guide is pinned at the bottom of the sidebar, above @Hezarfen - 2026.",
  "guide.tip3": "“?” help panels start closed — open only when you need them.",
  "guide.tip4": "Create exams under a course; read averages on the report card.",
  "auth.featureModules": "Courses · Exams · Report card",
  "auth.featurePrefs": "TR / EN · light / dark",
  "app.workspace": "@Hezarfen - 2026",
  "role.student": "Student",
  "role.teacher": "Teacher",
  "role.manager": "Manager",
  "role.admin": "Admin",
  "courses.title": "Courses",
  "courses.subtitle": "Classes, enrollment, and course exams live here.",
  "courses.create": "New course",
  "courses.empty": "No courses yet.",
  "courses.enrolled": "Enrolled",
  "courses.roster": "Roster",
  "courses.enroll": "Enroll student",
  "courses.exams": "Course exams",
  "courses.addExam": "Add exam",
  "courses.weight": "Weight",
  "courses.delete": "Delete course",
  "marks.title": "Report card",
  "marks.subtitle": "Weighted averages across enrolled courses.",
  "marks.overall": "Overall average",
  "marks.courseAvg": "Course average",
  "marks.empty": "Not enrolled in any course yet.",
  "marks.lookup": "Look up a student",
  "marks.show": "Show marks",
  "marks.forUser": "Report for {user}",
  "marks.exam": "Exam",
  "marks.weight": "Weight",
  "marks.mark": "Mark",
  "exams.mustBelongCourse": "Exams are created under a course. Open a course to add one.",
};

const tr: Dict = {
  "app.name": "Hezarfen",
  "app.tagline": "Kampüs çalışma alanın — notlar, etkinlikler ve sınavlar tek yerde.",
  "nav.home": "Ana sayfa",
  "nav.notes": "Notlar",
  "nav.events": "Etkinlikler",
  "nav.exams": "Sınavlar",
  "nav.courses": "Dersler",
  "nav.marks": "Karnem",
  "nav.users": "Kullanıcılar",
  "nav.guide": "Rehber",
  "nav.logout": "Çıkış yap",
  "nav.menu": "Menü",
  "nav.close": "Kapat",
  "nav.collapse": "Kenar çubuğunu daralt",
  "nav.expand": "Kenar çubuğunu genişlet",
  "nav.account": "Hesap",
  "nav.preferences": "Tercihler",
  "common.loading": "Yükleniyor…",
  "common.cancel": "Vazgeç",
  "common.save": "Kaydet",
  "common.create": "Oluştur",
  "common.edit": "Düzenle",
  "common.delete": "Sil",
  "common.update": "Güncelle",
  "common.remove": "Kaldır",
  "common.back": "Geri",
  "common.search": "Ara",
  "common.or": "veya",
  "common.tryAgain": "Tekrar dene",
  "common.notFound": "Sayfa bulunamadı",
  "common.goHome": "Ana sayfaya dön",
  "common.learnMore": "Daha fazla",
  "common.gotIt": "Anladım",
  "confirm.review": "Devam etmeden önce işlem özetini kontrol edin.",
  "confirm.summary": "İşlem özeti",
  "confirm.confirmDelete": "Evet, sil",
  "confirm.confirmUpdate": "Evet, güncelle",
  "confirm.deleteTitle": "Silmeyi onayla",
  "confirm.updateTitle": "Güncellemeyi onayla",
  "confirm.deleteNote": "“{title}” notu silinsin mi?",
  "confirm.updateNote": "“{title}” notu güncellensin mi?",
  "confirm.deleteEvent": "“{title}” etkinliği silinsin mi?",
  "confirm.updateEvent": "“{title}” etkinliği güncellensin mi?",
  "confirm.deleteExam": "“{title}” sınavı silinsin mi?",
  "confirm.updateExam": "“{title}” sınavı güncellensin mi?",
  "confirm.removeAttendance": "{user} kullanıcısının yoklaması kaldırılsın mı?",
  "confirm.removeResult": "{user} kullanıcısının notu kaldırılsın mı?",
  "confirm.updateRole": "{user} rolü {from} → {to} olarak değiştirilsin mi?",
  "confirm.gradeStudent": "{user} kullanıcısına {mark}/100 notu verilsin mi?",
  "common.prev": "Önceki",
  "common.next": "Sonraki",
  "common.pageOf": "{page} / {total}",
  "common.creator": "Oluşturan",
  "common.searchPlaceholder": "Ara…",
  "common.all": "Tümü",
  "common.saveAttendance": "Yoklamamı kaydet",
  "theme.light": "Açık",
  "theme.dark": "Koyu",
  "theme.toggle": "Tema",
  "lang.en": "English",
  "lang.tr": "Türkçe",
  "lang.label": "Dil",
  "auth.login": "Giriş yap",
  "auth.register": "Hesap oluştur",
  "auth.username": "Kullanıcı adı",
  "auth.password": "Şifre",
  "auth.noAccount": "Yeni misin?",
  "auth.hasAccount": "Zaten kayıtlı mısın?",
  "auth.loginTitle": "Tekrar hoş geldin",
  "auth.loginSubtitle": "Çalışma alanına devam etmek için giriş yap.",
  "auth.registerTitle": "Hezarfen’e katıl",
  "auth.registerSubtitle": "Yeni hesaplar öğrenci olarak başlar. Öğretmen ve admin rolleri sonradan verilir.",
  "auth.usernameHint": "3–32 karakter",
  "auth.passwordHint": "6–128 karakter",
  "auth.welcomeBack": "Seni yeniden görmek güzel",
  "auth.createStudent": "Öğrenci hesabı oluştur",
  "dashboard.greeting": "Merhaba, {name}",
  "dashboard.subtitle": "Çalışma alanındaki güncel durum burada.",
  "dashboard.overview": "Özet",
  "dashboard.quickActions": "Hızlı işlemler",
  "dashboard.action.note": "Yeni not",
  "dashboard.action.noteHint": "Hızlıca bir şey kaydet",
  "dashboard.action.event": "Etkinlik oluştur",
  "dashboard.action.eventHint": "Oturum planla",
  "dashboard.action.course": "Yeni ders",
  "dashboard.action.courseHint": "Sınıf aç",
  "dashboard.action.exam": "Sınav ekle",
  "dashboard.action.examHint": "Dersin içinden",
  "dashboard.action.attend": "Yoklama işaretle",
  "dashboard.action.attendHint": "Etkinlik listesine git",
  "dashboard.action.marks": "Karnem",
  "dashboard.action.marksHint": "Ortalamaları gör",
  "dashboard.stats.notes": "Notlar",
  "dashboard.stats.events": "Etkinlikler",
  "dashboard.stats.exams": "Sınavlar",
  "dashboard.stats.role": "Rolün",
  "dashboard.stats.average": "Ortalama",
  "dashboard.stats.averageHint": "Genel karne",
  "dashboard.myExams": "Sınavlarım",
  "dashboard.emptyExamsTitle": "Henüz sınav yok",
  "dashboard.emptyExamsCta": "Sınavlara git",
  "dashboard.recentNotes": "Son notlar",
  "dashboard.upcomingEvents": "Etkinlik özeti",
  "dashboard.noNotes": "Henüz not yok — ilk fikrini kaydet.",
  "dashboard.noEvents": "Şu an planlanmış etkinlik yok.",
  "dashboard.emptyNotesTitle": "Defterin boş",
  "dashboard.emptyEventsTitle": "Henüz etkinlik yok",
  "dashboard.emptyNotesCta": "Not yaz",
  "dashboard.emptyEventsCta": "Etkinliklere git",
  "dashboard.viewAll": "Tümünü gör",
  "dashboard.getStarted": "Başla",
  "dashboard.helpTitle": "Ana sayfa nasıl çalışır?",
  "dashboard.helpBody":
    "Ana sayfa not, etkinlik, ders, sınav ve karne kısayollarını gösterir. Tam tur için sidebar’ın altındaki Rehber’i aç.",
  "dashboard.continueGuide": "Rehberi aç",
  "notes.title": "Notlar",
  "notes.subtitle": "Ders fikirleri ve hatırlatmalar için özel defter.",
  "notes.new": "Yeni not",
  "notes.empty": "Henüz bir şey yok. Soldan ilk notunu yaz.",
  "notes.noContent": "İçerik yok",
  "notes.helpTitle": "Notlar hakkında",
  "notes.helpBody":
    "Notlar yalnızca sana aittir. Başlık en fazla 200, içerik 10.000 karakter. Silme ve güncelleme özetli onay penceresi ister.",
  "events.title": "Etkinlikler",
  "events.subtitle": "Oturumlar, buluşmalar ve yoklama tek listede.",
  "events.create": "Etkinlik oluştur",
  "events.empty": "Henüz etkinlik yok.",
  "events.starts": "Başlangıç",
  "events.ends": "Bitiş",
  "events.markSelf": "Yoklamamı işaretle",
  "events.markOther": "Başkasını işaretle",
  "events.attendance": "Yoklama listesi",
  "events.noAttendance": "Henüz yoklama kaydı yok.",
  "events.userId": "Kullanıcı id",
  "events.status": "Durum",
  "events.helpTitle": "Etkinlikler hakkında",
  "events.helpBody":
    "Öğrenciler büyük durum butonlarıyla var/yok/geç/mazeretli seçip yoklamayı kaydeder. Öğretmenler etkinlik oluşturur ve başkasını işaretleyebilir. Yöneticiler her etkinliği düzenleyebilir.",
  "events.clearStart": "Başlangıç saati temizlenecek",
  "events.clearEnd": "Bitiş saati temizlenecek",
  "exams.title": "Sınavlar",
  "exams.subtitle": "Tüm derslerin sınavları — yeni sınav ders içinden eklenir.",
  "exams.create": "Sınav oluştur",
  "exams.empty": "Henüz yayınlanmış sınav yok.",
  "exams.kind": "Tür",
  "exams.yourResult": "Sonucun",
  "exams.notGraded": "Henüz notlanmadı",
  "exams.gradeStudent": "Öğrenci notla",
  "exams.results": "Sonuç tablosu",
  "exams.noResults": "Henüz sonuç yok.",
  "exams.helpTitle": "Sınavlar hakkında",
  "exams.helpBody":
    "Sınavlar bir derse aittir. Öğretmenler ders sayfasından tür ve ağırlık (1–100) ile ekler. Öğrenciler yalnızca kendi notunu görür. Ağırlıklı ortalamalar Karnem’dedir.",
  "admin.title": "Kişiler ve roller",
  "admin.subtitle": "Hesapları yükselt / düşür. Kendi rolünü değiştiremezsin.",
  "admin.username": "Kullanıcı adı",
  "admin.id": "Id",
  "admin.role": "Rol",
  "admin.helpTitle": "Rol hiyerarşisi",
  "admin.helpBody":
    "öğrenci < öğretmen < yönetici < admin. Üst roller alt yetkileri miras alır. Kayıt her zaman öğrenci oluşturur. Rolleri yalnız admin değiştirir.",
  "guide.title": "Ürün rehberi",
  "guide.subtitle": "Kampüs akışı: ders → sınav → karne; artı notlar ve etkinlikler.",
  "guide.step1.title": "1. Ana sayfa",
  "guide.step1.body":
    "Not, etkinlik, ders, sınav ve karne için canlı sayılar ve kısayollar.",
  "guide.step2.title": "2. Notlar",
  "guide.step2.body":
    "Özel defter. Oluştur, düzenle, sil — silme/güncelleme özetli onay ister.",
  "guide.step3.title": "3. Etkinlik ve yoklama",
  "guide.step3.body":
    "Etkinliği aç, var/yok/geç/mazeretli seç, yoklamayı kaydet. Öğretmen başkasını işaretleyebilir.",
  "guide.step4.title": "4. Dersler",
  "guide.step4.body":
    "Öğretmen ders oluşturur, öğrenci kaydeder, dersin içine ağırlıklı sınav ekler.",
  "guide.step5.title": "5. Sınavlar",
  "guide.step5.body":
    "Tüm sınavlar burada listelenir. Yeni sınav bu listeden değil, ders sayfasından eklenir.",
  "guide.step6.title": "6. Karnem",
  "guide.step6.body":
    "Ders ortalamaları ve genel ortalama. Öğretmen herhangi bir öğrencinin karnesine bakabilir.",
  "guide.rolesTitle": "Kim ne yapabilir?",
  "guide.rolesBody":
    "Öğrenci: notlar, yoklama, ders/sınav görüntüleme, kendi sonucu ve karne. Öğretmen: ders/etkinlik, kayıt, sınav, not. Yönetici: her ders/etkinlik. Admin: roller.",
  "guide.tipsTitle": "İpuçları",
  "courses.helpTitle": "Dersler hakkında",
  "courses.helpBody":
    "Ders, sınıf kabıdır. Öğretmen öğrenci kaydeder ve buradan ağırlıklı sınav ekler. Dersi silmek sınavları, sonuçları ve kayıtları da siler.",
  "marks.helpTitle": "Karne hakkında",
  "marks.helpBody":
    "Ders ortalaması = Σ(not × ağırlık) / Σ(ağırlık). Genel ortalama, dolu ders ortalamalarının aritmetik ortalamasıdır. Notlanmamış sınavlar sıfır sayılmaz, atlanır.",
  "form.title": "Başlık",
  "form.content": "İçerik",
  "form.description": "Açıklama",
  "form.mark": "Not",
  "form.studentId": "Öğrenci kullanıcı id",
  "form.titleRequired": "Başlık gerekli",
  "form.titleMax": "Başlık en fazla 200 karakter olmalı",
  "form.contentMax": "İçerik en fazla 10 000 karakter olmalı",
  "form.descriptionMax": "Açıklama en fazla 2 000 karakter olmalı",
  "form.timeOrder": "Bitiş, başlangıçtan önce olamaz",
  "form.markRange": "Not 0–100 arası tam sayı olmalı",
  "events.markedBy": "İşaretleyen",
  "exams.gradedBy": "Notlayan",
  "status.present": "Var",
  "status.absent": "Yok",
  "status.late": "Geç",
  "status.excused": "Mazeretli",
  "guide.tip1": "Dil ve tema avatar menüsünde (ikonlu alt menüler).",
  "guide.tip2": "Rehber, sidebar’ın altında @Hezarfen - 2026’nın hemen üstünde.",
  "guide.tip3": "“?” panelleri kapalı gelir — ihtiyaç olunca aç.",
  "guide.tip4": "Sınavı dersin içinde oluştur; ortalamayı Karnem’de oku.",
  "auth.featureModules": "Dersler · Sınavlar · Karne",
  "auth.featurePrefs": "TR / EN · açık / koyu",
  "app.workspace": "@Hezarfen - 2026",
  "role.student": "Öğrenci",
  "role.teacher": "Öğretmen",
  "role.manager": "Yönetici",
  "role.admin": "Admin",
  "courses.title": "Dersler",
  "courses.subtitle": "Sınıflar, kayıt ve ders sınavları burada.",
  "courses.create": "Yeni ders",
  "courses.empty": "Henüz ders yok.",
  "courses.enrolled": "Kayıtlı",
  "courses.roster": "Sınıf listesi",
  "courses.enroll": "Öğrenci kaydet",
  "courses.exams": "Ders sınavları",
  "courses.addExam": "Sınav ekle",
  "courses.weight": "Ağırlık",
  "courses.delete": "Dersi sil",
  "marks.title": "Karnem",
  "marks.subtitle": "Kayıtlı derslerdeki ağırlıklı ortalamalar.",
  "marks.overall": "Genel ortalama",
  "marks.courseAvg": "Ders ortalaması",
  "marks.empty": "Henüz hiçbir derse kayıtlı değilsin.",
  "marks.lookup": "Öğrenci ara",
  "marks.show": "Karnesini göster",
  "marks.forUser": "{user} karnesi",
  "marks.exam": "Sınav",
  "marks.weight": "Ağırlık",
  "marks.mark": "Not",
  "exams.mustBelongCourse": "Sınavlar ders altında oluşturulur. Eklemek için bir ders aç.",
};

export const messages: Record<Locale, Dict> = { en, tr };

export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}
