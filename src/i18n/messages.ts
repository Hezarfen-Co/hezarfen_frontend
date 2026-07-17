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
  | "nav.attendance"
  | "nav.work"
  | "nav.staffWork"
  | "nav.users"
  | "nav.studentMarks"
  | "nav.studentAttendance"
  | "nav.settings"
  | "nav.terms"
  | "nav.guide"
  | "nav.logout"
  | "nav.admin"
  | "nav.menu"
  | "nav.close"
  | "nav.collapse"
  | "nav.expand"
  | "nav.account"
  | "nav.preferences"
  | "nav.group.students"
  | "nav.group.classes"
  | "nav.group.grades"
  | "nav.group.reports"
  | "nav.group.settings"
  | "common.loading"
  | "common.cancel"
  | "common.save"
  | "common.create"
  | "common.edit"
  | "common.delete"
  | "common.update"
  | "common.remove"
  | "common.back"
  | "common.view"
  | "common.actions"
  | "common.moreFilters"
  | "common.lessFilters"
  | "common.search"
  | "common.or"
  | "common.tryAgain"
  | "common.notFound"
  | "common.accessDenied"
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
  | "confirm.deleteNoteFile"
  | "confirm.updateNote"
  | "confirm.deleteEvent"
  | "confirm.updateEvent"
  | "confirm.deleteExam"
  | "confirm.deleteSession"
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
  | "common.created"
  | "common.deleted"
  | "common.saved"
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
  | "auth.confirmPassword"
  | "auth.passwordMismatch"
  | "auth.loginTitle"
  | "auth.loginSubtitle"
  | "auth.registerTitle"
  | "auth.registerSubtitle"
  | "auth.usernameHint"
  | "auth.passwordHint"
  | "auth.showPassword"
  | "auth.hidePassword"
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
  | "dashboard.stats.courses"
  | "dashboard.stats.role"
  | "dashboard.stats.average"
  | "dashboard.stats.averageHint"
  | "dashboard.commandCenter"
  | "dashboard.observationOnly"
  | "dashboard.today"
  | "dashboard.reportCard"
  | "dashboard.ready"
  | "dashboard.attention"
  | "dashboard.timeline"
  | "dashboard.activeNow"
  | "dashboard.upcoming"
  | "dashboard.nextEvent"
  | "dashboard.courseLoad"
  | "dashboard.latestWindow"
  | "dashboard.noAttention"
  | "dashboard.allClear"
  | "dashboard.roleLinks"
  | "dashboard.activityGraph"
  | "dashboard.activityGraphDesc"
  | "dashboard.records"
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
  | "dashboard.upcomingEmpty"
  | "dashboard.soon"
  | "dashboard.viewAll"
  | "dashboard.getStarted"
  | "dashboard.helpTitle"
  | "dashboard.helpBody"
  | "dashboard.continueGuide"
  | "dashboard.portal.sections"
  | "dashboard.portal.coursesDesc"
  | "dashboard.portal.examsDesc"
  | "dashboard.portal.eventsDesc"
  | "dashboard.portal.marksDesc"
  | "dashboard.portal.notesDesc"
  | "dashboard.portal.usersDesc"
  | "dashboard.portal.attendanceDesc"
  | "dashboard.portal.workDesc"
  | "dashboard.portal.studentMarksDesc"
  | "dashboard.portal.settingsDesc"
  | "dashboard.portal.termsDesc"
  | "notes.title"
  | "notes.subtitle"
  | "notes.new"
  | "notes.empty"
  | "notes.noContent"
  | "notes.files"
  | "notes.filesHelp"
  | "notes.addFile"
  | "notes.downloadFile"
  | "notes.noFiles"
  | "notes.fileLimit"
  | "notes.fileTooLarge"
  | "notes.fileUploadPartial"
  | "notes.previewUnsupported"
  | "notes.unknownFileType"
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
  | "events.myAttendance"
  | "events.myAttendanceHelp"
  | "events.studentAttendance"
  | "events.studentAttendanceHelp"
  | "events.saveStudentAttendance"
  | "events.attendance"
  | "events.attendanceRecords"
  | "events.attendanceRecordsHelp"
  | "events.noAttendance"
  | "events.attendee"
  | "events.selectAttendee"
  | "events.noAttendees"
  | "events.userId"
  | "events.status"
  | "events.audience"
  | "events.audience.school"
  | "events.audience.role"
  | "events.audience.course"
  | "events.audience.registration"
  | "events.selectCourse"
  | "events.capacity"
  | "events.capacityOptional"
  | "events.audienceCourseRequired"
  | "events.audienceCapacityInvalid"
  | "events.helpTitle"
  | "events.helpBody"
  | "events.clearStart"
  | "events.clearEnd"
  | "events.upcoming"
  | "events.past"
  | "exams.title"
  | "exams.subtitle"
  | "exams.create"
  | "exams.searchPlaceholder"
  | "exams.selectCourse"
  | "exams.empty"
  | "exams.kind"
  | "exams.kind.homework"
  | "exams.kind.quiz"
  | "exams.kind.midterm"
  | "exams.kind.final"
  | "exams.kind.project"
  | "exams.kind.oral"
  | "exams.yourResult"
  | "exams.notGraded"
  | "exams.gradeStudent"
  | "exams.gradeAfterExam"
  | "exams.results"
  | "exams.noResults"
  | "exams.details"
  | "exams.schedule"
  | "exams.examStatistics"
  | "exams.examQuestions"
  | "exams.studentResults"
  | "exams.window"
  | "exams.unscheduled"
  | "exams.mode"
  | "exams.mode.unscheduled"
  | "exams.mode.sync"
  | "exams.mode.async"
  | "exams.mode.open"
  | "exams.durationMinutes"
  | "exams.durationOptional"
  | "exams.durationRequired"
  | "exams.durationRange"
  | "exams.maxAttempts"
  | "exams.maxAttemptsRange"
  | "exams.retakes"
  | "exams.allowRejoin"
  | "exams.allowRejoinHelp"
  | "exams.startTime"
  | "exams.endTime"
  | "exams.scheduleRequired"
  | "questions.title"
  | "questions.add"
  | "questions.edit"
  | "questions.empty"
  | "questions.text"
  | "questions.kind"
  | "questions.points"
  | "questions.choices"
  | "questions.choicesHint"
  | "questions.addChoice"
  | "questions.choicePlaceholder"
  | "questions.correctAnswer"
  | "questions.correct"
  | "questions.correctHint"
  | "questions.kind.choice"
  | "questions.kind.text"
  | "questions.textRequired"
  | "questions.pointsRange"
  | "questions.choicesRange"
  | "questions.correctRange"
  | "attempt.title"
  | "attempt.openRoom"
  | "attempt.start"
  | "attempt.resume"
  | "attempt.finish"
  | "attempt.status"
  | "attempt.remaining"
  | "attempt.attempt"
  | "attempt.left"
  | "attempt.progress"
  | "attempt.deadline"
  | "attempt.notStarted"
  | "attempt.unscheduled"
  | "attempt.saved"
  | "attempt.savedAt"
  | "attempt.serverNow"
  | "attempt.mark"
  | "attempt.saveAnswer"
  | "attempt.submitted"
  | "attempt.expired"
  | "attempt.closed"
  | "attempt.inProgress"
  | "attempt.absent"
  | "exams.helpTitle"
  | "exams.helpBody"
  | "admin.title"
  | "admin.subtitle"
  | "admin.username"
  | "admin.id"
  | "admin.role"
  | "admin.directory"
  | "admin.helpTitle"
  | "admin.helpBody"
  | "admin.noUsers"
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
  | "form.year"
  | "form.month"
  | "form.day"
  | "form.datePlaceholder"
  | "form.mark"
  | "form.studentId"
  | "form.selectStudent"
  | "form.noStudents"
  | "form.titleRequired"
  | "form.titleMax"
  | "form.contentMax"
  | "form.descriptionMax"
  | "form.timeOrder"
  | "form.timePast"
  | "form.weightRange"
  | "form.markRange"
  | "events.markedBy"
  | "exams.gradedBy"
  | "status.present"
  | "status.absent"
  | "status.late"
  | "status.excused"
  | "status.presentDetail"
  | "status.absentDetail"
  | "status.lateDetail"
  | "status.excusedDetail"
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
  | "courses.listTitle"
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
  | "courses.kind"
  | "courses.kind.course"
  | "courses.kind.study"
  | "marks.title"
  | "marks.subtitle"
  | "marks.overall"
  | "marks.courseAvg"
  | "marks.empty"
  | "marks.lookup"
  | "marks.userIdentity"
  | "marks.show"
  | "marks.forUser"
  | "marks.exam"
  | "marks.weight"
  | "marks.mark"
  | "exams.mustBelongCourse"
  | "exams.missingCourse"
  | "exams.statistics"
  | "exams.graded"
  | "exams.average"
  | "exams.min"
  | "exams.max"
  | "exams.finished"
  | "exams.active"
  | "exams.upcoming"
  | "exams.liveMonitor"
  | "exams.liveMonitorDesc"
  | "exams.finalState"
  | "exams.finalStateDesc"
  | "exams.liveRoster"
  | "exams.notStarted"
  | "exams.lastActivity"
  | "exams.answerSheet"
  | "exams.autoScore"
  | "exams.earned"
  | "exams.possible"
  | "exams.isCorrect"
  | "exams.textAnswer"
  | "exams.nameless"
  | "exams.emptyRoster"
  | "exams.selectStudent"
  | "exams.viewSheet"
  | "profile.title"
  | "profile.subtitle"
  | "profile.name"
  | "profile.surname"
  | "profile.email"
  | "profile.phone"
  | "profile.birthDate"
  | "profile.edit"
  | "profile.saved"
  | "profile.emailInvalid"
  | "profile.phoneInvalid"
  | "profile.dateInvalid"
  | "profile.clearField"
  | "ws.connecting"
  | "ws.connected"
  | "ws.disconnected"
  | "ws.error"
  | "ws.ping"
  | "course.removeStudent"
  | "course.removeStudentConfirm"
  | "events.userIdRequired"
  | "settings.title"
  | "settings.subtitle"
  | "settings.saved"
  | "settings.examKinds"
  | "settings.examKindsHelp"
  | "settings.attendanceStatuses"
  | "settings.attendanceHelp"
  | "settings.gradeBands"
  | "settings.gradeBandsHelp"
  | "settings.name"
  | "settings.weight"
  | "settings.status"
  | "settings.min"
  | "settings.label"
  | "settings.addRow"
  | "settings.locked"
  | "settings.unsaved"
  | "settings.empty"
  | "settings.maxFileSize"
  | "settings.maxFileSizeHelp"
  | "settings.maxFileSizeInvalid"
  | "terms.title"
  | "terms.subtitle"
  | "terms.create"
  | "terms.edit"
  | "terms.empty"
  | "terms.term"
  | "terms.unassigned"
  | "terms.dateRequired"
  | "sessions.title"
  | "sessions.subtitle"
  | "sessions.topic"
  | "sessions.add"
  | "sessions.edit"
  | "sessions.empty"
  | "sessions.untitled"
  | "sessions.teacher"
  | "sessions.rollCall"
  | "sessions.emptyRoster"
  | "sessions.startRequired"
  | "sessions.endInvalid"
  | "attendance.title"
  | "attendance.subtitle"
  | "attendance.events"
  | "attendance.sessions"
  | "attendance.rate"
  | "attendance.courseBreakdown"
  | "attendance.emptyCourses"
  | "attendance.lookup"
  | "attendance.show"
  | "attendance.forUser"
  | "work.title"
  | "work.subtitle"
  | "work.checkIn"
  | "work.checkOut"
  | "work.checkedIn"
  | "work.notCheckedIn"
  | "work.ready"
  | "work.since"
  | "work.entries"
  | "work.empty"
  | "work.duration"
  | "work.open"
  | "work.closed"
  | "work.status"
  | "work.staffTitle"
  | "work.staffSubtitle"
  | "work.show"
  | "work.forUser"
  | "work.correct"
  | "work.correctHelp"
  | "work.cannotEditOpen"
  | "work.timesRequired"
  | "work.deleteSummary"
  | "work.teacherIdentity"
  | "work.noTeachers"
  | "lookup.searchHint"
  | "work.userNotFound";

type Dict = Record<MessageKey, string>;

const en: Dict = {
  "app.name": "Hezarfen",
  "app.tagline": "Your campus workspace — notes, events, exams in one calm place.",
  "nav.home": "Home",
  "nav.notes": "Notebook",
  "nav.events": "Events",
  "nav.exams": "Exams",
  "nav.courses": "Education",
  "nav.marks": "Report card",
  "nav.attendance": "Attendance",
  "nav.work": "Work log",
  "nav.staffWork": "Staff work",
  "nav.users": "Users",
  "nav.studentMarks": "Student marks",
  "nav.studentAttendance": "Student attendance",
  "nav.settings": "Settings",
  "nav.terms": "Terms",
  "nav.guide": "Guide",
  "nav.admin": "Admin",
  "nav.logout": "Log out",
  "nav.menu": "Menu",
  "nav.close": "Close",
  "nav.collapse": "Collapse sidebar",
  "nav.expand": "Expand sidebar",
  "nav.account": "Account",
  "nav.preferences": "Preferences",
  "nav.group.students": "Students",
  "nav.group.classes": "Education",
  "nav.group.grades": "My space",
  "nav.group.reports": "Reports",
  "nav.group.settings": "Settings",
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.create": "Create",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.update": "Update",
  "common.remove": "Remove",
  "common.back": "Back",
  "common.view": "View",
  "common.actions": "Actions",
  "common.moreFilters": "More filters",
  "common.lessFilters": "Less filters",
  "common.search": "Search",
  "common.or": "or",
  "common.tryAgain": "Try again",
  "common.notFound": "Page not found",
  "common.accessDenied": "You do not have access to this content.",
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
  "confirm.deleteNoteFile": "Delete file “{title}”?",
  "confirm.updateNote": "Update note “{title}”?",
  "confirm.deleteEvent": "Delete event “{title}”?",
  "confirm.updateEvent": "Update event “{title}”?",
  "confirm.deleteExam": "Delete exam “{title}”?",
  "confirm.deleteSession": "Delete session “{title}”?",
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
  "common.created": "Created.",
  "common.deleted": "Deleted.",
  "common.saved": "Saved.",
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
  "auth.confirmPassword": "Confirm password",
  "auth.passwordMismatch": "Passwords do not match",
  "auth.loginTitle": "Welcome back",
  "auth.loginSubtitle": "Sign in to continue to your workspace.",
  "auth.registerTitle": "Join Hezarfen",
  "auth.registerSubtitle": "New accounts start as student. Teachers and admins are assigned later.",
  "auth.usernameHint": "3–32 characters",
  "auth.passwordHint": "6–128 characters",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
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
  "dashboard.action.course": "New education item",
  "dashboard.action.courseHint": "Open a course or study session",
  "dashboard.action.exam": "Add exam",
  "dashboard.action.examHint": "Under a course",
  "dashboard.action.attend": "Mark attendance",
  "dashboard.action.attendHint": "Open events list",
  "dashboard.action.marks": "My report card",
  "dashboard.action.marksHint": "See averages",
  "dashboard.stats.notes": "Notes",
  "dashboard.stats.events": "Events",
  "dashboard.stats.exams": "Exams",
  "dashboard.stats.courses": "Education",
  "dashboard.stats.role": "Your role",
  "dashboard.stats.average": "Average",
  "dashboard.stats.averageHint": "Overall report card",
  "dashboard.commandCenter": "Command center",
  "dashboard.observationOnly": "Read-only overview of what needs attention.",
  "dashboard.today": "Today",
  "dashboard.reportCard": "Report card",
  "dashboard.ready": "Ready",
  "dashboard.attention": "Needs attention",
  "dashboard.timeline": "Upcoming timeline",
  "dashboard.activeNow": "Active now",
  "dashboard.upcoming": "Upcoming",
  "dashboard.nextEvent": "Next event",
  "dashboard.courseLoad": "Course load",
  "dashboard.latestWindow": "Latest window",
  "dashboard.noAttention": "Nothing needs attention right now.",
  "dashboard.allClear": "All clear",
  "dashboard.roleLinks": "Workspace overview",
  "dashboard.activityGraph": "Activity graph",
  "dashboard.activityGraphDesc": "Events, exams, and education at a glance.",
  "dashboard.records": "records",
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
  "dashboard.upcomingEmpty": "Nothing here.",
  "dashboard.soon": "Soon",
  "dashboard.viewAll": "View all",
  "dashboard.getStarted": "Get started",
  "dashboard.helpTitle": "Need a hand?",
  "dashboard.helpBody": "Stuck on a page or looking for the next step? Open the short app guide.",
  "dashboard.continueGuide": "Guide",
  "dashboard.portal.sections": "Sections",
  "dashboard.portal.coursesDesc": "Browse courses, study sessions, and materials.",
  "dashboard.portal.examsDesc": "Course exams, deadlines, and results.",
  "dashboard.portal.eventsDesc": "Events with student attendance records.",
  "dashboard.portal.marksDesc": "Your grades and overall report card.",
  "dashboard.portal.notesDesc": "Private scratchpad for quick ideas.",
  "dashboard.portal.usersDesc": "Manage user accounts and roles.",
  "dashboard.portal.attendanceDesc": "Review student attendance records.",
  "dashboard.portal.workDesc": "Track your work hours and shifts.",
  "dashboard.portal.studentMarksDesc": "View and grade student results.",
  "dashboard.portal.settingsDesc": "System preferences and configuration.",
  "dashboard.portal.termsDesc": "Manage academic terms and periods.",
  "notes.title": "Notebook",
  "notes.subtitle": "Private scratchpad for class ideas and reminders.",
  "notes.new": "New note",
  "notes.empty": "Nothing here yet. Write your first note.",
  "notes.noContent": "No content",
  "notes.files": "Attachments",
  "notes.filesHelp": "Up to 10 files. Max {size} each.",
  "notes.addFile": "Add file",
  "notes.downloadFile": "Download",
  "notes.noFiles": "No files attached.",
  "notes.fileLimit": "This note already has 10 files.",
  "notes.fileTooLarge": "File is too large. Max {size}.",
  "notes.fileUploadPartial": "Note saved, but {count} file(s) could not be uploaded.",
  "notes.previewUnsupported": "Preview is not available for this file type. Download the file to open it.",
  "notes.unknownFileType": "Unknown file type",
  "notes.helpTitle": "About notes",
  "notes.helpBody":
    "Notes are private to you only. Title max 200 characters, content max 10,000. Delete and update open a confirmation dialog with a short summary before they run.",
  "events.title": "Events",
  "events.subtitle": "Events and student attendance records in one list.",
  "events.create": "Create event",
  "events.empty": "No events yet.",
  "events.starts": "Starts",
  "events.ends": "Ends",
  "events.markSelf": "Mark my attendance",
  "events.markOther": "Mark another person",
  "events.myAttendance": "My attendance",
  "events.myAttendanceHelp": "Choose your event status and save it.",
  "events.studentAttendance": "Student attendance",
  "events.studentAttendanceHelp": "Select a student, choose a status, then save the record.",
  "events.saveStudentAttendance": "Save attendance",
  "events.attendance": "Attendance roster",
  "events.attendanceRecords": "Attendance records",
  "events.attendanceRecordsHelp": "Saved student attendance for this event, including who recorded each row.",
  "events.noAttendance": "No attendance rows yet.",
  "events.attendee": "Student",
  "events.selectAttendee": "Search student",
  "events.noAttendees": "No students found",
  "events.userId": "Student id",
  "events.status": "Status",
  "events.audience": "Audience",
  "events.audience.school": "Whole school",
  "events.audience.role": "Role",
  "events.audience.course": "Course roster",
  "events.audience.registration": "Registration list",
  "events.selectCourse": "Select course",
  "events.capacity": "Capacity",
  "events.capacityOptional": "Optional seat cap",
  "events.audienceCourseRequired": "Select a course for this audience.",
  "events.audienceCapacityInvalid": "Capacity must be at least 1.",
  "events.helpTitle": "About events",
  "events.helpBody":
    "Teachers and managers record attendance for students only. Managers can edit any event.",
  "events.clearStart": "Will clear start time",
  "events.clearEnd": "Will clear end time",
  "events.upcoming": "Upcoming",
  "events.past": "Past",
  "exams.title": "Exams",
  "exams.subtitle": "All exams across courses and study sessions — create them under an education item.",
  "exams.create": "Create exam",
  "exams.searchPlaceholder": "Search exams…",
  "exams.selectCourse": "Select course",
  "exams.empty": "No exams published yet.",
  "exams.kind": "Kind",
  "exams.kind.homework": "Homework",
  "exams.kind.quiz": "Quiz",
  "exams.kind.midterm": "Midterm",
  "exams.kind.final": "Final",
  "exams.kind.project": "Project",
  "exams.kind.oral": "Oral",
  "exams.yourResult": "Your result",
  "exams.notGraded": "Not graded yet",
  "exams.gradeStudent": "Grade a student",
  "exams.gradeAfterExam": "Available after the exam ends",
  "exams.results": "Results table",
  "exams.noResults": "No results yet.",
  "exams.details": "Exam Details",
  "exams.schedule": "Schedule",
  "exams.examStatistics": "Exam Statistics",
  "exams.examQuestions": "Exam Questions",
  "exams.studentResults": "Student Grades",
  "exams.window": "Window",
  "exams.unscheduled": "Unscheduled",
  "exams.mode": "Mode",
  "exams.mode.unscheduled": "Unscheduled / offline grading",
  "exams.mode.sync": "Sync: one fixed window",
  "exams.mode.async": "Async: personal time budget",
  "exams.mode.open": "Open: anytime",
  "exams.durationMinutes": "Duration (minutes)",
  "exams.durationOptional": "Duration (minutes, optional)",
  "exams.durationRequired": "Async exams need a duration",
  "exams.durationRange": "Duration must be from 1 minute to 24 hours",
  "exams.maxAttempts": "Max attempts",
  "exams.maxAttemptsRange": "Max attempts must be 1 or higher",
  "exams.retakes": "Retakes",
  "exams.allowRejoin": "Allow rejoin",
  "exams.allowRejoinHelp": "If off, a student who leaves the exam room cannot return to answer.",
  "exams.startTime": "Start time",
  "exams.endTime": "End time",
  "exams.scheduleRequired": "Scheduled exams need start and end times",
  "questions.title": "Questions",
  "questions.add": "Add question",
  "questions.edit": "Edit question",
  "questions.empty": "No questions yet.",
  "questions.text": "Question text",
  "questions.kind": "Question kind",
  "questions.points": "Points",
  "questions.choices": "Choices",
  "questions.choicesHint": "One choice per line, 2–10 choices.",
  "questions.addChoice": "Add choice",
  "questions.choicePlaceholder": "Choice {index}",
  "questions.correctAnswer": "Correct answer",
  "questions.correct": "Mark correct",
  "questions.correctHint": "Zero-based: first choice is 0.",
  "questions.kind.choice": "Choice",
  "questions.kind.text": "Text",
  "questions.textRequired": "Question text is required",
  "questions.pointsRange": "Points must be an integer from 1 to 100",
  "questions.choicesRange": "Choice questions need 2–10 choices, each at most 500 characters",
  "questions.correctRange": "Correct index must point to one of the choices",
  "attempt.title": "Exam room",
  "attempt.openRoom": "Open exam room",
  "attempt.start": "Start exam",
  "attempt.resume": "Resume exam",
  "attempt.finish": "Finish exam",
  "attempt.status": "Status",
  "attempt.remaining": "Remaining",
  "attempt.attempt": "Attempt",
  "attempt.left": "Left",
  "attempt.progress": "Progress",
  "attempt.deadline": "Deadline",
  "attempt.notStarted": "Start the scheduled exam to see questions.",
  "attempt.unscheduled": "This exam is not scheduled for online sitting.",
  "attempt.saved": "Saved",
  "attempt.savedAt": "Saved at",
  "attempt.serverNow": "Server time",
  "attempt.mark": "Mark",
  "attempt.saveAnswer": "Save answer",
  "attempt.submitted": "Submitted",
  "attempt.expired": "Expired",
  "attempt.closed": "This attempt is closed. Answers are read-only.",
  "attempt.inProgress": "In progress",
  "attempt.absent": "No-show",
  "exams.helpTitle": "About exams",
  "exams.helpBody":
    "Exams belong to an education item. Teachers add them from that detail page with a kind; weighting is defined by the exam kind. Students only see their own mark (or “not graded yet”). Weighted averages appear on the report card.",
  "admin.title": "People & roles",
  "admin.subtitle": "Promote or demote accounts. You can’t change your own role.",
  "admin.username": "Username",
  "admin.id": "Id",
  "admin.role": "Role",
  "admin.directory": "Directory",
  "admin.helpTitle": "Role hierarchy",
  "admin.helpBody":
    "student < teacher < manager < admin. Higher roles inherit lower permissions. Registration always creates a student. Only admins list users and change roles.",
  "admin.noUsers": "No users registered yet.",
  "guide.title": "Product guide",
  "guide.subtitle": "Campus flow: education → exams → report card, plus notes and events.",
  "guide.step1.title": "1. Home overview",
  "guide.step1.body":
    "Live counts and shortcuts for notes, events, courses, exams, and your report card.",
  "guide.step2.title": "2. Notes",
  "guide.step2.body":
    "Private scratchpad. Create, edit, delete — delete/update ask for confirmation with a short summary.",
  "guide.step3.title": "3. Events & attendance",
  "guide.step3.body":
    "Teachers and managers open an event, select a student, then save present/absent/late/excused attendance.",
  "guide.step4.title": "4. Education",
  "guide.step4.body":
    "Teachers create a course or study session, enroll students, then add exams by kind inside it.",
  "guide.step5.title": "5. Exams",
  "guide.step5.body":
    "List all exams here. New exams are created from an education detail page, not from this list.",
  "guide.step6.title": "6. Report card",
  "guide.step6.body":
    "Your weighted course averages and overall average. Teachers can look up any student.",
  "guide.rolesTitle": "Who can do what?",
  "guide.rolesBody":
    "Student: notes, events attendance, view courses/exams, own results & report card. Teacher: create courses/events, enroll, add exams, grade. Manager: manage any course/event. Admin: user roles.",
  "guide.tipsTitle": "Tips",
  "courses.helpTitle": "About education",
  "courses.helpBody":
    "Education items can be courses or study sessions. Teachers enroll students and add exams here; exam kind weights drive averages. Deleting one removes its exams, results, and enrollments.",
  "marks.helpTitle": "About the report card",
  "marks.helpBody":
    "Course average uses the weight defined on each exam kind over graded exams. Overall average is the mean of non-null course averages. Ungraded exams are skipped, not zeroed.",
  "form.title": "Title",
  "form.content": "Content",
  "form.description": "Description",
  "form.year": "Year",
  "form.month": "Month",
  "form.day": "Day",
  "form.datePlaceholder": "DD/MM/YYYY",
  "form.mark": "Mark",
  "form.studentId": "Student user id",
  "form.selectStudent": "Select student",
  "form.noStudents": "No available students",
  "form.titleRequired": "Title is required",
  "form.titleMax": "Title must be at most 200 characters",
  "form.contentMax": "Content must be at most 10 000 characters",
  "form.descriptionMax": "Description must be at most 2 000 characters",
  "form.timeOrder": "End time must be on or after start time",
  "form.timePast": "Start and end times must be in the future",
  "form.weightRange": "Weight must be an integer from 1 to 100",
  "form.markRange": "Mark must be an integer from 0 to 100",
  "events.markedBy": "Recorded by",
  "exams.gradedBy": "Graded by",
  "status.present": "Present",
  "status.absent": "Absent",
  "status.late": "Late",
  "status.excused": "Excused",
  "status.presentDetail": "In class",
  "status.absentDetail": "Not attended",
  "status.lateDetail": "Joined late",
  "status.excusedDetail": "Excused absence",
  "guide.tip1": "TR / EN and theme live in the avatar dropdown (submenus with icons).",
  "guide.tip2": "Open the guide from your account menu or the home dashboard when you need a refresher.",
  "guide.tip3": "“?” help panels start closed — open only when you need them.",
  "guide.tip4": "Create exams under a course; read averages on the report card.",
  "auth.featureModules": "Education · Exams · Report card",
  "auth.featurePrefs": "TR / EN · light / dark",
  "app.workspace": "@Hezarfen - 2026",
  "role.student": "Student",
  "role.teacher": "Teacher",
  "role.manager": "Manager",
  "role.admin": "ADMIN",
  "courses.title": "Education",
  "courses.listTitle": "Courses and study sessions",
  "courses.subtitle": "Courses, study sessions, enrollment, and exams live here.",
  "courses.create": "New education item",
  "courses.empty": "No courses yet.",
  "courses.enrolled": "Enrolled",
  "courses.roster": "Roster",
  "courses.enroll": "Enroll student",
  "courses.exams": "Course exams",
  "courses.addExam": "Add exam",
  "courses.weight": "Weight",
  "courses.delete": "Delete course",
  "courses.kind": "Course type",
  "courses.kind.course": "Course",
  "courses.kind.study": "Study",
  "marks.title": "Report card",
  "marks.subtitle": "Weighted averages across enrolled courses.",
  "marks.overall": "Overall average",
  "marks.courseAvg": "Course average",
  "marks.empty": "Not enrolled in any course yet.",
  "marks.lookup": "Look up a student",
  "marks.userIdentity": "User ID",
  "marks.show": "Show marks",
  "marks.forUser": "Report for {user}",
  "marks.exam": "Exam",
  "marks.weight": "Weight",
  "marks.mark": "Mark",
  "exams.mustBelongCourse": "Exams are created under a course. Open a course to add one.",
  "exams.missingCourse": "Course unavailable",
  "exams.statistics": "Statistics",
  "exams.graded": "Graded",
  "exams.average": "Average",
  "exams.min": "Min",
  "exams.max": "Max",
  "exams.finished": "Finished",
  "exams.active": "Active",
  "exams.upcoming": "Upcoming",
  "exams.liveMonitor": "Live Monitor",
  "exams.liveMonitorDesc": "Real-time exam roster, progress, and marks.",
  "exams.finalState": "Final State",
  "exams.finalStateDesc": "Final exam results, progress, and marks.",
  "exams.liveRoster": "Live Roster",
  "exams.notStarted": "Not started",
  "exams.lastActivity": "Last activity",
  "exams.answerSheet": "Answer Sheet",
  "exams.autoScore": "Auto-score",
  "exams.earned": "Earned",
  "exams.possible": "Possible",
  "exams.isCorrect": "Correct",
  "exams.textAnswer": "Text answer",
  "exams.nameless": "Unnamed",
  "exams.emptyRoster": "No enrolled students yet.",
  "exams.selectStudent": "Select a student from the roster",
  "exams.viewSheet": "View answers",
  "profile.title": "My Profile",
  "profile.subtitle": "Personal information (optional).",
  "profile.name": "Name",
  "profile.surname": "Surname",
  "profile.email": "Email",
  "profile.phone": "Phone",
  "profile.birthDate": "Birth date",
  "profile.edit": "Edit profile",
  "profile.saved": "Profile saved",
  "profile.emailInvalid": "Enter a valid email address (e.g. name@example.com)",
  "profile.phoneInvalid": "Enter a valid phone number (7-15 digits, optional +)",
  "profile.dateInvalid": "Enter a real YYYY-MM-DD date, not in the future",
  "profile.clearField": "Clear",
  "ws.connecting": "Connecting…",
  "ws.connected": "Connected",
  "ws.disconnected": "Disconnected",
  "ws.error": "Connection error",
  "ws.ping": "Ping",
  "course.removeStudent": "Remove student",
  "course.removeStudentConfirm": "Are you sure you want to remove",
  "events.userIdRequired": "Please select a student first.",
  "settings.title": "School settings",
  "settings.subtitle": "Manage exam kinds, attendance statuses, and grade bands.",
  "settings.saved": "Settings saved.",
  "settings.examKinds": "Exam kinds",
  "settings.examKindsHelp": "Kinds and weights used in course averages.",
  "settings.attendanceStatuses": "Attendance statuses",
  "settings.attendanceHelp": "Core statuses stay locked; add custom statuses as needed.",
  "settings.gradeBands": "Grade bands",
  "settings.gradeBandsHelp": "Optional labels for mark ranges. Include a 0 band when using labels.",
  "settings.name": "Name",
  "settings.weight": "Weight",
  "settings.status": "Status",
  "settings.min": "Minimum",
  "settings.label": "Label",
  "settings.addRow": "Add row",
  "settings.locked": "Locked",
  "settings.unsaved": "Unsaved changes",
  "settings.empty": "No rows yet.",
  "settings.maxFileSize": "Max note file size",
  "settings.maxFileSizeHelp": "Per-file upload cap for note attachments, in MiB. Backend accepts 0.001-25 MiB.",
  "settings.maxFileSizeInvalid": "Enter a valid file size.",
  "terms.title": "Academic terms",
  "terms.subtitle": "Manage calendar terms and assign courses to them.",
  "terms.create": "Create term",
  "terms.edit": "Edit term",
  "terms.empty": "No terms yet.",
  "terms.term": "Term",
  "terms.unassigned": "Unassigned",
  "terms.dateRequired": "Start and end dates are required.",
  "sessions.title": "Lesson sessions",
  "sessions.subtitle": "Create lessons and take course roll call.",
  "sessions.topic": "Topic",
  "sessions.add": "Add session",
  "sessions.edit": "Edit session",
  "sessions.empty": "No lesson sessions yet.",
  "sessions.untitled": "Untitled lesson",
  "sessions.teacher": "Teacher",
  "sessions.rollCall": "Roll call",
  "sessions.emptyRoster": "No enrolled students yet.",
  "sessions.startRequired": "Session start date and time are required.",
  "sessions.endInvalid": "Enter both end date and end time, or leave both empty.",
  "attendance.title": "Attendance report",
  "attendance.subtitle": "Event attendance and lesson roll-call rates.",
  "attendance.events": "Events",
  "attendance.sessions": "Lesson sessions",
  "attendance.rate": "Rate",
  "attendance.courseBreakdown": "Course breakdown",
  "attendance.emptyCourses": "No lesson attendance rows yet.",
  "attendance.lookup": "Look up a student's attendance report.",
  "attendance.show": "Show attendance",
  "attendance.forUser": "Attendance for {user}",
  "work.title": "Work log",
  "work.subtitle": "Check in and out with server-stamped work entries.",
  "work.checkIn": "Check in",
  "work.checkOut": "Check out",
  "work.checkedIn": "Checked in",
  "work.notCheckedIn": "Not checked in",
  "work.ready": "Ready to start a work stint.",
  "work.since": "Since {time}",
  "work.entries": "Recent entries",
  "work.empty": "No work entries yet.",
  "work.duration": "Duration",
  "work.open": "Open",
  "work.closed": "Closed",
  "work.status": "Status",
  "work.staffTitle": "Staff work logs",
  "work.staffSubtitle": "Look up a teacher, correct closed stints, or delete entries.",
  "work.teacherIdentity": "Teacher",
  "work.noTeachers": "No teachers found.",
  "lookup.searchHint": "Type at least 2 characters to search.",
  "work.userNotFound": "No work log found for this user.",
  "work.show": "Show log",
  "work.forUser": "Log for {user}",
  "work.correct": "Correct entry",
  "work.correctHelp": "Only closed stints can be corrected.",
  "work.cannotEditOpen": "Open stints cannot be corrected. Check out or delete them first.",
  "work.timesRequired": "Enter check-in and check-out date and time.",
  "work.deleteSummary": "Delete work entry from {time}?",
};

const tr: Dict = {
  "app.name": "Hezarfen",
  "app.tagline": "Kampüs çalışma alanın — notlar, etkinlikler ve sınavlar tek yerde.",
  "nav.home": "Ana sayfa",
  "nav.notes": "Defter",
  "nav.events": "Etkinlikler",
  "nav.exams": "Sınavlar",
  "nav.courses": "Eğitim",
  "nav.marks": "Karnem",
  "nav.attendance": "Yoklama",
  "nav.work": "Mesai",
  "nav.staffWork": "Personel mesai",
  "nav.users": "Kullanıcılar",
  "nav.studentMarks": "Öğrenci notları",
  "nav.studentAttendance": "Öğrenci yoklaması",
  "nav.settings": "Ayarlar",
  "nav.terms": "Dönemler",
  "nav.guide": "Rehber",
  "nav.admin": "Yönetim",
  "nav.logout": "Çıkış yap",
  "nav.menu": "Menü",
  "nav.close": "Kapat",
  "nav.collapse": "Kenar çubuğunu daralt",
  "nav.expand": "Kenar çubuğunu genişlet",
  "nav.account": "Hesap",
  "nav.preferences": "Tercihler",
  "nav.group.students": "Öğrenciler",
  "nav.group.classes": "Eğitim",
  "nav.group.grades": "Benim Alanım",
  "nav.group.reports": "Raporlar",
  "nav.group.settings": "Ayarlar",
  "common.loading": "Yükleniyor…",
  "common.cancel": "Vazgeç",
  "common.save": "Kaydet",
  "common.create": "Oluştur",
  "common.edit": "Düzenle",
  "common.delete": "Sil",
  "common.update": "Güncelle",
  "common.remove": "Kaldır",
  "common.back": "Geri",
  "common.view": "Görüntüle",
  "common.actions": "İşlem",
  "common.moreFilters": "Daha fazla filtre",
  "common.lessFilters": "Daha az filtre",
  "common.search": "Ara",
  "common.or": "veya",
  "common.tryAgain": "Tekrar dene",
  "common.notFound": "Sayfa bulunamadı",
  "common.accessDenied": "Bu içeriğe erişimin yok.",
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
  "confirm.deleteNoteFile": "“{title}” dosyası silinsin mi?",
  "confirm.updateNote": "“{title}” notu güncellensin mi?",
  "confirm.deleteEvent": "“{title}” etkinliği silinsin mi?",
  "confirm.updateEvent": "“{title}” etkinliği güncellensin mi?",
  "confirm.deleteExam": "“{title}” sınavı silinsin mi?",
  "confirm.deleteSession": "“{title}” oturumu silinsin mi?",
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
  "common.created": "Oluşturuldu.",
  "common.deleted": "Silindi.",
  "common.saved": "Kaydedildi.",
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
  "auth.confirmPassword": "Şifreyi onayla",
  "auth.passwordMismatch": "Şifreler eşleşmiyor",
  "auth.loginTitle": "Tekrar hoş geldin",
  "auth.loginSubtitle": "Çalışma alanına devam etmek için giriş yap.",
  "auth.registerTitle": "Hezarfen’e katıl",
  "auth.registerSubtitle": "Yeni hesaplar öğrenci olarak başlar. Öğretmen ve admin rolleri sonradan verilir.",
  "auth.usernameHint": "3–32 karakter",
  "auth.passwordHint": "6–128 karakter",
  "auth.showPassword": "Şifreyi göster",
  "auth.hidePassword": "Şifreyi gizle",
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
  "dashboard.action.course": "Yeni eğitim kaydı",
  "dashboard.action.courseHint": "Ders veya etüt aç",
  "dashboard.action.exam": "Sınav ekle",
  "dashboard.action.examHint": "Dersin içinden",
  "dashboard.action.attend": "Yoklama işaretle",
  "dashboard.action.attendHint": "Etkinlik listesine git",
  "dashboard.action.marks": "Karnem",
  "dashboard.action.marksHint": "Ortalamaları gör",
  "dashboard.stats.notes": "Notlar",
  "dashboard.stats.events": "Etkinlikler",
  "dashboard.stats.exams": "Sınavlar",
  "dashboard.stats.courses": "Eğitim",
  "dashboard.stats.role": "Rolün",
  "dashboard.stats.average": "Ortalama",
  "dashboard.stats.averageHint": "Genel karne",
  "dashboard.commandCenter": "Komuta merkezi",
  "dashboard.observationOnly": "Dikkat isteyenlerin salt okunur özeti.",
  "dashboard.today": "Bugün",
  "dashboard.reportCard": "Karne",
  "dashboard.ready": "Hazır",
  "dashboard.attention": "Dikkat isteyenler",
  "dashboard.timeline": "Yaklaşan akış",
  "dashboard.activeNow": "Şu an aktif",
  "dashboard.upcoming": "Yaklaşan",
  "dashboard.nextEvent": "Sıradaki etkinlik",
  "dashboard.courseLoad": "Ders yükü",
  "dashboard.latestWindow": "Güncel pencere",
  "dashboard.noAttention": "Şu an dikkat isteyen bir şey yok.",
  "dashboard.allClear": "Temiz",
  "dashboard.roleLinks": "Çalışma alanı özeti",
  "dashboard.activityGraph": "Aktivite grafiği",
  "dashboard.activityGraphDesc": "Etkinlik, sınav ve eğitim yoğunluğu tek bakışta.",
  "dashboard.records": "kayıt",
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
  "dashboard.upcomingEmpty": "Burada bir şey yok.",
  "dashboard.soon": "Yakında",
  "dashboard.viewAll": "Tümünü gör",
  "dashboard.getStarted": "Başla",
  "dashboard.helpTitle": "Yardıma mı ihtiyacın var?",
  "dashboard.helpBody": "Bir sayfada takıldın veya sonraki adımı mı arıyorsun? Kısa uygulama rehberini aç.",
  "dashboard.continueGuide": "Rehber",
  "dashboard.portal.sections": "Bölümler",
  "dashboard.portal.coursesDesc": "Dersleri, etütleri ve materyalleri görüntüle.",
  "dashboard.portal.examsDesc": "Ders/etüt sınavları, tarihler ve sonuçlar.",
  "dashboard.portal.eventsDesc": "Öğrenci yoklamalı etkinlikler.",
  "dashboard.portal.marksDesc": "Notların ve genel karnen.",
  "dashboard.portal.notesDesc": "Hızlı fikirler için özel not defteri.",
  "dashboard.portal.usersDesc": "Kullanıcı hesaplarını ve rollerini yönet.",
  "dashboard.portal.attendanceDesc": "Öğrenci yoklama kayıtlarını incele.",
  "dashboard.portal.workDesc": "Çalışma saatlerini ve mesainizi takip edin.",
  "dashboard.portal.studentMarksDesc": "Öğrenci sonuçlarını görüntüle ve notlandır.",
  "dashboard.portal.settingsDesc": "Sistem tercihleri ve yapılandırma.",
  "dashboard.portal.termsDesc": "Akademik dönemleri ve periyotları yönet.",
  "notes.title": "Defter",
  "notes.subtitle": "Ders fikirleri ve hatırlatmalar için özel defter.",
  "notes.new": "Yeni not",
  "notes.empty": "Henüz bir şey yok. İlk notunu yaz.",
  "notes.noContent": "İçerik yok",
  "notes.files": "Ekler",
  "notes.filesHelp": "En fazla 10 dosya. Dosya başına {size} sınırı.",
  "notes.addFile": "Dosya ekle",
  "notes.downloadFile": "İndir",
  "notes.noFiles": "Henüz dosya eklenmemiş.",
  "notes.fileLimit": "Bu notta zaten 10 dosya var.",
  "notes.fileTooLarge": "Dosya çok büyük. En fazla {size}.",
  "notes.fileUploadPartial": "Not kaydedildi ama {count} dosya yüklenemedi.",
  "notes.previewUnsupported": "Bu dosya türü için önizleme yok. Açmak için dosyayı indirin.",
  "notes.unknownFileType": "Bilinmeyen dosya türü",
  "notes.helpTitle": "Notlar hakkında",
  "notes.helpBody":
    "Notlar yalnızca sana aittir. Başlık en fazla 200, içerik 10.000 karakter. Silme ve güncelleme özetli onay penceresi ister.",
  "events.title": "Etkinlikler",
  "events.subtitle": "Etkinlikler ve öğrenci yoklama kayıtları tek listede.",
  "events.create": "Etkinlik oluştur",
  "events.empty": "Henüz etkinlik yok.",
  "events.starts": "Başlangıç",
  "events.ends": "Bitiş",
  "events.markSelf": "Yoklamamı işaretle",
  "events.markOther": "Başkasını işaretle",
  "events.myAttendance": "Katılım durumum",
  "events.myAttendanceHelp": "Etkinlik durumunu seç ve kaydet.",
  "events.studentAttendance": "Öğrenci yoklaması",
  "events.studentAttendanceHelp": "Öğrenciyi seç, durumunu belirle, kaydı kaydet.",
  "events.saveStudentAttendance": "Yoklamayı kaydet",
  "events.attendance": "Yoklama listesi",
  "events.attendanceRecords": "Yoklama kayıtları",
  "events.attendanceRecordsHelp": "Bu etkinlik için kaydedilmiş öğrenci yoklaması ve kaydı kimin girdiği.",
  "events.noAttendance": "Henüz yoklama kaydı yok.",
  "events.attendee": "Öğrenci",
  "events.selectAttendee": "Öğrenci ara",
  "events.noAttendees": "Öğrenci bulunamadı",
  "events.userId": "Öğrenci id",
  "events.status": "Durum",
  "events.audience": "Hedef kitle",
  "events.audience.school": "Tüm okul",
  "events.audience.role": "Rol",
  "events.audience.course": "Ders listesi",
  "events.audience.registration": "Kayıt listesi",
  "events.selectCourse": "Ders seç",
  "events.capacity": "Kapasite",
  "events.capacityOptional": "İsteğe bağlı kontenjan",
  "events.audienceCourseRequired": "Bu hedef kitle için ders seç.",
  "events.audienceCapacityInvalid": "Kapasite en az 1 olmalı.",
  "events.helpTitle": "Etkinlikler hakkında",
  "events.helpBody":
    "Öğretmenler ve yöneticiler yalnız öğrenciler için yoklama kaydeder. Yöneticiler her etkinliği düzenleyebilir.",
  "events.clearStart": "Başlangıç saati temizlenecek",
  "events.clearEnd": "Bitiş saati temizlenecek",
  "events.upcoming": "Yaklaşan",
  "events.past": "Geçmiş",
  "exams.title": "Sınavlar",
  "exams.subtitle": "Tüm ders ve etüt sınavları — yeni sınav eğitim kaydı içinden eklenir.",
  "exams.create": "Sınav oluştur",
  "exams.searchPlaceholder": "Sınav ara…",
  "exams.selectCourse": "Ders seç",
  "exams.empty": "Henüz yayınlanmış sınav yok.",
  "exams.kind": "Tür",
  "exams.kind.homework": "Ödev",
  "exams.kind.quiz": "Kısa sınav",
  "exams.kind.midterm": "Vize",
  "exams.kind.final": "Final",
  "exams.kind.project": "Proje",
  "exams.kind.oral": "Sözlü",
  "exams.yourResult": "Sonucun",
  "exams.notGraded": "Henüz notlanmadı",
  "exams.gradeStudent": "Öğrenci notla",
  "exams.gradeAfterExam": "Sınav bitince kullanılabilir",
  "exams.results": "Sonuç tablosu",
  "exams.noResults": "Henüz sonuç yok.",
  "exams.details": "Sınav Detayları",
  "exams.schedule": "Zamanlama",
  "exams.examStatistics": "Sınav İstatistikleri",
  "exams.examQuestions": "Sınav Soruları",
  "exams.studentResults": "Öğrenci Notları",
  "exams.window": "Aralık",
  "exams.unscheduled": "Zamansız",
  "exams.mode": "Mod",
  "exams.mode.unscheduled": "Zamansız / çevrimdışı notlama",
  "exams.mode.sync": "Senkron: tek sabit aralık",
  "exams.mode.async": "Asenkron: kişisel süre",
  "exams.mode.open": "Açık: her zaman",
  "exams.durationMinutes": "Süre (dakika)",
  "exams.durationOptional": "Süre (dakika, isteğe bağlı)",
  "exams.durationRequired": "Asenkron sınav için süre gerekli",
  "exams.durationRange": "Süre 1 dakika ile 24 saat arasında olmalı",
  "exams.maxAttempts": "Deneme hakkı",
  "exams.maxAttemptsRange": "Deneme hakkı 1 veya daha büyük olmalı",
  "exams.retakes": "Deneme hakkı",
  "exams.allowRejoin": "Yeniden girişe izin ver",
  "exams.allowRejoinHelp": "Kapalıysa sınav odasından çıkan öğrenci cevap vermek için geri giremez.",
  "exams.startTime": "Başlangıç saati",
  "exams.endTime": "Bitiş saati",
  "exams.scheduleRequired": "Zamanlı sınav için başlangıç ve bitiş gerekli",
  "questions.title": "Sorular",
  "questions.add": "Soru ekle",
  "questions.edit": "Soruyu düzenle",
  "questions.empty": "Henüz soru yok.",
  "questions.text": "Soru metni",
  "questions.kind": "Soru türü",
  "questions.points": "Puan",
  "questions.choices": "Seçenekler",
  "questions.choicesHint": "Her satıra bir seçenek, 2–10 seçenek.",
  "questions.addChoice": "Seçenek ekle",
  "questions.choicePlaceholder": "Seçenek {index}",
  "questions.correctAnswer": "Doğru cevap",
  "questions.correct": "Doğru seç",
  "questions.correctHint": "Sıfırdan başlar: ilk seçenek 0.",
  "questions.kind.choice": "Seçmeli",
  "questions.kind.text": "Metin",
  "questions.textRequired": "Soru metni gerekli",
  "questions.pointsRange": "Puan 1–100 arası tam sayı olmalı",
  "questions.choicesRange": "Seçmeli soruda 2–10 seçenek gerekir; her biri en fazla 500 karakter olmalı",
  "questions.correctRange": "Doğru indeks seçeneklerden birini göstermeli",
  "attempt.title": "Sınav odası",
  "attempt.openRoom": "Sınav odasını aç",
  "attempt.start": "Sınava başla",
  "attempt.resume": "Sınava devam et",
  "attempt.finish": "Sınavı bitir",
  "attempt.status": "Durum",
  "attempt.remaining": "Kalan süre",
  "attempt.attempt": "Deneme",
  "attempt.left": "Çıkış",
  "attempt.progress": "İlerleme",
  "attempt.deadline": "Bitiş zamanı",
  "attempt.notStarted": "Soruları görmek için zamanlı sınavı başlat.",
  "attempt.unscheduled": "Bu sınav çevrim içi oturum için zamanlanmamış.",
  "attempt.saved": "Kaydedildi",
  "attempt.savedAt": "Kayıt zamanı",
  "attempt.serverNow": "Sunucu saati",
  "attempt.mark": "Not",
  "attempt.saveAnswer": "Cevabı kaydet",
  "attempt.submitted": "Teslim edildi",
  "attempt.expired": "Süresi doldu",
  "attempt.closed": "Bu oturum kapalı. Cevaplar salt okunur.",
  "attempt.inProgress": "Devam ediyor",
  "attempt.absent": "Katılmadı",
  "exams.helpTitle": "Sınavlar hakkında",
  "exams.helpBody":
    "Sınavlar bir eğitim kaydına aittir. Öğretmenler detay sayfasından tür seçerek ekler; ağırlık sınav türünde tanımlıdır. Öğrenciler yalnızca kendi notunu görür. Ağırlıklı ortalamalar Karnem’dedir.",
  "admin.title": "Kişiler ve roller",
  "admin.subtitle": "Hesapları yükselt / düşür. Kendi rolünü değiştiremezsin.",
  "admin.username": "Kullanıcı adı",
  "admin.id": "Id",
  "admin.role": "Rol",
  "admin.directory": "Kayıt listesi",
  "admin.helpTitle": "Rol hiyerarşisi",
  "admin.helpBody":
    "öğrenci < öğretmen < yönetici < admin. Üst roller alt yetkileri miras alır. Kayıt her zaman öğrenci oluşturur. Rolleri yalnız admin değiştirir.",
  "admin.noUsers": "Henüz kayıtlı kullanıcı yok.",
  "guide.title": "Ürün rehberi",
  "guide.subtitle": "Kampüs akışı: eğitim → sınav → karne; artı notlar ve etkinlikler.",
  "guide.step1.title": "1. Ana sayfa",
  "guide.step1.body":
    "Not, etkinlik, ders, sınav ve karne için canlı sayılar ve kısayollar.",
  "guide.step2.title": "2. Notlar",
  "guide.step2.body":
    "Özel defter. Oluştur, düzenle, sil — silme/güncelleme özetli onay ister.",
  "guide.step3.title": "3. Etkinlik ve yoklama",
  "guide.step3.body":
    "Öğretmenler ve yöneticiler etkinliği açar, öğrenciyi seçer ve var/yok/geç/mazeretli yoklama kaydeder.",
  "guide.step4.title": "4. Eğitim",
  "guide.step4.body":
    "Öğretmen ders veya etüt oluşturur, öğrenci kaydeder, içine türe göre sınav ekler.",
  "guide.step5.title": "5. Sınavlar",
  "guide.step5.body":
    "Tüm sınavlar burada listelenir. Yeni sınav bu listeden değil, eğitim detayından eklenir.",
  "guide.step6.title": "6. Karnem",
  "guide.step6.body":
    "Ders ortalamaları ve genel ortalama. Öğretmen herhangi bir öğrencinin karnesine bakabilir.",
  "guide.rolesTitle": "Kim ne yapabilir?",
  "guide.rolesBody":
    "Öğrenci: notlar, yoklama, ders/sınav görüntüleme, kendi sonucu ve karne. Öğretmen: ders/etkinlik, kayıt, sınav, not. Yönetici: her ders/etkinlik. Admin: roller.",
  "guide.tipsTitle": "İpuçları",
  "courses.helpTitle": "Eğitim hakkında",
  "courses.helpBody":
    "Eğitim kayıtları ders veya etüt olabilir. Öğretmen öğrenci kaydeder ve buradan sınav ekler; ortalamalarda sınav türü ağırlığı kullanılır. Bir kaydı silmek sınavları, sonuçları ve kayıtları da siler.",
  "marks.helpTitle": "Karne hakkında",
  "marks.helpBody":
    "Ders ortalaması, notlanmış sınavlarda sınav türünde tanımlı ağırlıkla hesaplanır. Genel ortalama, dolu ders ortalamalarının aritmetik ortalamasıdır. Notlanmamış sınavlar sıfır sayılmaz, atlanır.",
  "form.title": "Başlık",
  "form.content": "İçerik",
  "form.description": "Açıklama",
  "form.year": "Yıl",
  "form.month": "Ay",
  "form.day": "Gün",
  "form.datePlaceholder": "GG/AA/YYYY",
  "form.mark": "Not",
  "form.studentId": "Öğrenci kullanıcı id",
  "form.selectStudent": "Öğrenci seç",
  "form.noStudents": "Uygun öğrenci yok",
  "form.titleRequired": "Başlık gerekli",
  "form.titleMax": "Başlık en fazla 200 karakter olmalı",
  "form.contentMax": "İçerik en fazla 10 000 karakter olmalı",
  "form.descriptionMax": "Açıklama en fazla 2 000 karakter olmalı",
  "form.timeOrder": "Bitiş, başlangıçtan önce olamaz",
  "form.timePast": "Başlangıç ve bitiş gelecekte olmalı",
  "form.weightRange": "Ağırlık 1–100 arası tam sayı olmalı",
  "form.markRange": "Not 0–100 arası tam sayı olmalı",
  "events.markedBy": "Kaydeden",
  "exams.gradedBy": "Notlayan",
  "status.present": "Var",
  "status.absent": "Yok",
  "status.late": "Geç",
  "status.excused": "Mazeretli",
  "status.presentDetail": "Derste",
  "status.absentDetail": "Katılmadı",
  "status.lateDetail": "Geç katıldı",
  "status.excusedDetail": "Mazeretli yok",
  "guide.tip1": "Dil ve tema avatar menüsünde (ikonlu alt menüler).",
  "guide.tip2": "İhtiyacın olduğunda rehberi hesap menüsünden veya ana sayfadaki kısayoldan aç.",
  "guide.tip3": "“?” panelleri kapalı gelir — ihtiyaç olunca aç.",
  "guide.tip4": "Sınavı dersin içinde oluştur; ortalamayı Karnem’de oku.",
  "auth.featureModules": "Eğitim · Sınavlar · Karne",
  "auth.featurePrefs": "TR / EN · açık / koyu",
  "app.workspace": "@Hezarfen - 2026",
  "role.student": "Öğrenci",
  "role.teacher": "Öğretmen",
  "role.manager": "Yönetici",
  "role.admin": "ADMIN",
  "courses.title": "Eğitim",
  "courses.listTitle": "Dersler ve etütler",
  "courses.subtitle": "Dersler, etütler, kayıtlar ve sınavlar burada.",
  "courses.create": "Yeni eğitim kaydı",
  "courses.empty": "Henüz ders yok.",
  "courses.enrolled": "Kayıtlı",
  "courses.roster": "Sınıf listesi",
  "courses.enroll": "Öğrenci kaydet",
  "courses.exams": "Ders sınavları",
  "courses.addExam": "Sınav ekle",
  "courses.weight": "Ağırlık",
  "courses.delete": "Dersi sil",
  "courses.kind": "Ders türü",
  "courses.kind.course": "Ders",
  "courses.kind.study": "Etüt",
  "marks.title": "Karnem",
  "marks.subtitle": "Kayıtlı derslerdeki ağırlıklı ortalamalar.",
  "marks.overall": "Genel ortalama",
  "marks.courseAvg": "Ders ortalaması",
  "marks.empty": "Henüz hiçbir derse kayıtlı değilsin.",
  "marks.lookup": "Öğrenci ara",
  "marks.userIdentity": "Kullanıcı ID",
  "marks.show": "Karnesini göster",
  "marks.forUser": "{user} karnesi",
  "marks.exam": "Sınav",
  "marks.weight": "Ağırlık",
  "marks.mark": "Not",
  "exams.mustBelongCourse": "Sınavlar ders altında oluşturulur. Eklemek için bir ders aç.",
  "exams.missingCourse": "Ders bilgisi yok",
  "exams.statistics": "İstatistikler",
  "exams.graded": "Notlanan",
  "exams.average": "Ortalama",
  "exams.min": "En düşük",
  "exams.max": "En yüksek",
  "exams.finished": "Bitti",
  "exams.active": "Aktif",
  "exams.upcoming": "Yakında",
  "exams.liveMonitor": "Canlı İzleme",
  "exams.liveMonitorDesc": "Sınav durumu, ilerleme ve notlar gerçek zamanlı.",
  "exams.finalState": "Son Durum",
  "exams.finalStateDesc": "Sınav sonuçları, ilerleme ve notlar.",
  "exams.liveRoster": "Canlı Liste",
  "exams.notStarted": "Başlamadı",
  "exams.lastActivity": "Son hareket",
  "exams.answerSheet": "Cevap Kâğıdı",
  "exams.autoScore": "Otomatik puan",
  "exams.earned": "Alınan",
  "exams.possible": "Mümkün",
  "exams.isCorrect": "Doğru",
  "exams.textAnswer": "Metin cevap",
  "exams.nameless": "İsimsiz",
  "exams.emptyRoster": "Henüz kayıtlı öğrenci yok.",
  "exams.selectStudent": "Listeden bir öğrenci seç",
  "exams.viewSheet": "Cevapları gör",
  "profile.title": "Profilim",
  "profile.subtitle": "Kişisel bilgiler (isteğe bağlı).",
  "profile.name": "Ad",
  "profile.surname": "Soyad",
  "profile.email": "E-posta",
  "profile.phone": "Telefon",
  "profile.birthDate": "Doğum tarihi",
  "profile.edit": "Profili düzenle",
  "profile.saved": "Profil kaydedildi",
  "profile.emailInvalid": "Geçerli bir e-posta adresi girin (örn. ad@ornek.com)",
  "profile.phoneInvalid": "Geçerli bir telefon numarası girin (7-15 hane, isteğe bağlı +)",
  "profile.dateInvalid": "Geçerli bir YYYY-AA-GG tarihi girin, gelecekte olmasın",
  "profile.clearField": "Temizle",
  "ws.connecting": "Bağlanıyor…",
  "ws.connected": "Bağlı",
  "ws.disconnected": "Bağlantı kesildi",
  "ws.error": "Bağlantı hatası",
  "ws.ping": "Ping",
  "course.removeStudent": "Öğrenciyi çıkar",
  "course.removeStudentConfirm": "Bu öğrenciyi çıkarmak istediğine emin misin?",
  "events.userIdRequired": "Önce bir öğrenci seçmelisin.",
  "settings.title": "Okul ayarları",
  "settings.subtitle": "Sınav türleri, yoklama durumları ve not bantlarını yönet.",
  "settings.saved": "Ayarlar kaydedildi.",
  "settings.examKinds": "Sınav türleri",
  "settings.examKindsHelp": "Ders ortalamalarında kullanılan tür ve ağırlıklar.",
  "settings.attendanceStatuses": "Yoklama durumları",
  "settings.attendanceHelp": "Temel durumlar kilitli kalır; gerekirse özel durum ekle.",
  "settings.gradeBands": "Not bantları",
  "settings.gradeBandsHelp": "Not aralıkları için isteğe bağlı etiketler. Etiket kullanırken 0 bandı ekle.",
  "settings.name": "Ad",
  "settings.weight": "Ağırlık",
  "settings.status": "Durum",
  "settings.min": "Alt sınır",
  "settings.label": "Etiket",
  "settings.addRow": "Satır ekle",
  "settings.locked": "Kilitli",
  "settings.unsaved": "Kaydedilmemiş değişiklikler",
  "settings.empty": "Henüz satır yok.",
  "settings.maxFileSize": "Not dosyası boyut sınırı",
  "settings.maxFileSizeHelp": "Not ekleri için dosya başına yükleme sınırı, MiB cinsinden. Backend 0.001-25 MiB kabul eder.",
  "settings.maxFileSizeInvalid": "Geçerli bir dosya boyutu gir.",
  "terms.title": "Akademik dönemler",
  "terms.subtitle": "Takvim dönemlerini yönet ve dersleri dönemlere bağla.",
  "terms.create": "Dönem oluştur",
  "terms.edit": "Dönemi düzenle",
  "terms.empty": "Henüz dönem yok.",
  "terms.term": "Dönem",
  "terms.unassigned": "Atanmamış",
  "terms.dateRequired": "Başlangıç ve bitiş tarihi gerekli.",
  "sessions.title": "Ders oturumları",
  "sessions.subtitle": "Ders oluştur ve ders yoklaması al.",
  "sessions.topic": "Konu",
  "sessions.add": "Oturum ekle",
  "sessions.edit": "Oturumu düzenle",
  "sessions.empty": "Henüz ders oturumu yok.",
  "sessions.untitled": "Konu girilmemiş ders",
  "sessions.teacher": "Öğretmen",
  "sessions.rollCall": "Yoklama",
  "sessions.emptyRoster": "Henüz kayıtlı öğrenci yok.",
  "sessions.startRequired": "Oturum başlangıç tarihi ve saati gerekli.",
  "sessions.endInvalid": "Bitiş için tarih ve saati birlikte gir ya da ikisini de boş bırak.",
  "attendance.title": "Yoklama raporu",
  "attendance.subtitle": "Etkinlik yoklaması ve ders oturumu devam oranları.",
  "attendance.events": "Etkinlikler",
  "attendance.sessions": "Ders oturumları",
  "attendance.rate": "Oran",
  "attendance.courseBreakdown": "Ders dökümü",
  "attendance.emptyCourses": "Henüz ders yoklaması yok.",
  "attendance.lookup": "Bir öğrencinin yoklama raporunu aç.",
  "attendance.show": "Yoklamayı göster",
  "attendance.forUser": "{user} yoklaması",
  "work.title": "Mesai kaydı",
  "work.subtitle": "Sunucu saatli giriş ve çıkış kayıtları.",
  "work.checkIn": "Giriş yap",
  "work.checkOut": "Çıkış yap",
  "work.checkedIn": "Giriş yapılmış",
  "work.notCheckedIn": "Giriş yapılmadı",
  "work.ready": "Mesai kaydı başlatmaya hazır.",
  "work.since": "Başlangıç: {time}",
  "work.entries": "Son kayıtlar",
  "work.empty": "Henüz mesai kaydı yok.",
  "work.duration": "Süre",
  "work.open": "Açık",
  "work.closed": "Kapalı",
  "work.status": "Durum",
  "work.staffTitle": "Personel mesai kayıtları",
  "work.staffSubtitle": "Öğretmen ara, kapalı mesaileri düzelt veya kayıt sil.",
  "work.teacherIdentity": "Öğretmen",
  "work.noTeachers": "Öğretmen bulunamadı.",
  "lookup.searchHint": "Aramak için en az 2 karakter yaz.",
  "work.userNotFound": "Bu kullanıcı için mesai kaydı bulunamadı.",
  "work.show": "Kaydı göster",
  "work.forUser": "{user} için kayıtlar",
  "work.correct": "Kaydı düzelt",
  "work.correctHelp": "Yalnızca kapalı mesailer düzeltilebilir.",
  "work.cannotEditOpen": "Açık mesai düzeltilemez. Önce çıkış yapın veya silin.",
  "work.timesRequired": "Giriş ve çıkış tarih/saatini girin.",
  "work.deleteSummary": "{time} mesai kaydı silinsin mi?",
};

export const messages: Record<Locale, Dict> = { en, tr };

export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}
