export type Locale = "en" | "tr";

export type MessageKey =
  | "app.name"
  | "app.tagline"
  | "ai.askCelebi"
  | "ai.title"
  | "ai.description"
  | "ai.empty"
  | "ai.placeholder"
  | "ai.send"
  | "ai.unavailable"
  | "ai.copy"
  | "ai.copied"
  | "ai.thinking1"
  | "ai.thinking2"
  | "ai.thinking3"
  | "ai.hint"
  | "ai.suggest1"
  | "ai.suggest2"
  | "ai.suggest3"
  | "ai.suggest4"
  | "ai.suggestStaff1"
  | "ai.suggestStaff2"
  | "ai.suggestStaff3"
  | "ai.suggestStaff4"
  | "ai.suggestParent1"
  | "ai.suggestParent2"
  | "ai.suggestParent3"
  | "ai.suggestParent4"
  | "ai.goTo"
  | "ai.didYouMean"
  | "ai.skipTyping"
  | "nav.today"
  | "nav.classes"
  | "nav.classGroups"
  | "classGroups.title"
  | "classGroups.subtitle"
  | "classGroups.newClass"
  | "classGroups.className"
  | "classGroups.grade"
  | "classGroups.empty"
  | "classGroups.open"
  | "classGroups.student"
  | "classGroups.addedBy"
  | "classGroups.courseColumn"
  | "classGroups.attachedBy"
  | "classGroups.membersTab"
  | "classGroups.coursesTab"
  | "classGroups.addStudent"
  | "classGroups.addStudentHelp"
  | "classGroups.attachCourse"
  | "classGroups.attachCourseHelp"
  | "classGroups.removeStudent"
  | "classGroups.removeStudentConfirm"
  | "classGroups.detachCourse"
  | "classGroups.detachCourseConfirm"
  | "classGroups.deleteClass"
  | "classGroups.deleteConfirm"
  | "classGroups.selectCourse"
  | "classGroups.noMembers"
  | "classGroups.noCourses"
  | "classGroups.homeroomTeacher"
  | "classGroups.noTeacher"
  | "classGroups.selectTeacher"
  | "classGroups.yourClass"
  | "classGroups.searchPlaceholder"
  | "classGroups.allGrades"
  | "classGroups.studentsCount"
  | "classGroups.noGrade"
  | "classGroups.attendanceRate"
  | "classGroups.competency"
  | "classGroups.weakestTopic"
  | "classGroups.mergeClasses"
  | "classBlueprints.tab"
  | "classBlueprints.classesTab"
  | "classBlueprints.title"
  | "classBlueprints.subtitle"
  | "classBlueprints.new"
  | "classBlueprints.edit"
  | "classBlueprints.grade"
  | "classBlueprints.gradeHint"
  | "classBlueprints.courses"
  | "classBlueprints.courseCount"
  | "classBlueprints.courseCountColumn"
  | "classBlueprints.selected"
  | "classBlueprints.empty"
  | "classBlueprints.selectCourses"
  | "classBlueprints.wholeSetHint"
  | "classBlueprints.filterCourses"
  | "classBlueprints.noCourseMatch"
  | "classBlueprints.saved"
  | "classBlueprints.delete"
  | "classBlueprints.deleteConfirm"
  | "classBlueprints.status"
  | "classBlueprints.statusTitle"
  | "classBlueprints.statusEmpty"
  | "classBlueprints.statusSection"
  | "classBlueprints.statusMissing"
  | "classBlueprints.deleted"
  | "classBlueprints.apply"
  | "classBlueprints.applyHint"
  | "classBlueprints.applyNoGrade"
  | "classBlueprints.applied"
  | "classBlueprints.noBlueprintForGrade"
  | "classBlueprints.conflictExists"
  | "classBlueprints.staleReload"
  | "classBlueprints.skippedSummary"
  | "classBlueprints.skippedDetails"
  | "classBlueprints.skippedTitle"
  | "classBlueprints.skippedSubtitle"
  | "classBlueprints.skippedClass"
  | "classBlueprints.skippedCourse"
  | "classBlueprints.skippedReason"
  | "classBlueprints.skipClassGone"
  | "classBlueprints.skipCoursePruned"
  | "classBlueprints.skipCeiling"
  | "classBlueprints.skipOverloaded"
  | "classBlueprints.skipNoSeat"
  | "classBlueprints.skipCourseGone"
  | "classBlueprints.skipOther"
  | "profile.myProfile"
  | "profile.viewProfile"
  | "profile.displayName"
  | "profile.displayNameHint"
  | "profile.bio"
  | "profile.bioHint"
  | "profile.bioEmpty"
  | "profile.classes"
  | "profile.noClasses"
  | "profile.courses"
  | "profile.noCourses"
  | "profile.stats"
  | "profile.statFocusHours"
  | "profile.statSessions"
  | "profile.statHomework"
  | "profile.statOnTime"
  | "profile.statExams"
  | "profile.statCourses"
  | "profile.statClasses"
  | "common.clearSearch"
  | "common.refresh"
  | "editor.bold"
  | "editor.italic"
  | "editor.underline"
  | "editor.strike"
  | "editor.bulletList"
  | "editor.numberedList"
  | "editor.clearFormatting"
  | "editor.bulletListLabel"
  | "editor.numberedListLabel"
  | "editor.clearFormattingLabel"
  | "editor.bodyPlaceholder"
  | "messages.refreshList"
  | "messages.deleteDraft"
  | "messages.restoreFromTrash"
  | "messages.labelsPlaceholder"
  | "messages.bodyPlaceholder"
  | "messages.replyPlaceholder"
  | "questions.deleteConfirm"
  | "profile.forbiddenParent"
  | "profile.notFound"
  | "parentLink.manage"
  | "parentLink.title"
  | "parentLink.subtitle"
  | "parentLink.selectStudent"
  | "parentLink.add"
  | "parentLink.empty"
  | "parentLink.linked"
  | "parentLink.remove"
  | "parentLink.removeConfirm"
  | "parentLink.removed"
  | "avatar.title"
  | "avatar.change"
  | "avatar.upload"
  | "avatar.remove"
  | "avatar.removeConfirm"
  | "avatar.removed"
  | "avatar.uploaded"
  | "avatar.hint"
  | "avatar.typeInvalid"
  | "avatar.tooLarge"
  | "badges.title"
  | "badges.subtitle"
  | "badges.earnedOn"
  | "badges.locked"
  | "badges.remaining"
  | "badges.remainingHours"
  | "badges.none"
  | "badges.earnedCount"
  | "badge.homework_submitted_1.name"
  | "badge.homework_submitted_1.desc"
  | "badge.homework_submitted_10.name"
  | "badge.homework_submitted_10.desc"
  | "badge.homework_submitted_50.name"
  | "badge.homework_submitted_50.desc"
  | "badge.homework_on_time_10.name"
  | "badge.homework_on_time_10.desc"
  | "badge.homework_on_time_25.name"
  | "badge.homework_on_time_25.desc"
  | "badge.exam_sat_1.name"
  | "badge.exam_sat_1.desc"
  | "badge.exam_sat_10.name"
  | "badge.exam_sat_10.desc"
  | "badge.exam_sat_25.name"
  | "badge.exam_sat_25.desc"
  | "badge.pomodoro_finished_10.name"
  | "badge.pomodoro_finished_10.desc"
  | "badge.pomodoro_finished_50.name"
  | "badge.pomodoro_finished_50.desc"
  | "badge.pomodoro_finished_200.name"
  | "badge.pomodoro_finished_200.desc"
  | "badge.pomodoro_focus_ms_36000000.name"
  | "badge.pomodoro_focus_ms_36000000.desc"
  | "badge.pomodoro_focus_ms_180000000.name"
  | "badge.pomodoro_focus_ms_180000000.desc"
  | "badge.marks_given_10.name"
  | "badge.marks_given_10.desc"
  | "badge.marks_given_50.name"
  | "badge.marks_given_50.desc"
  | "badge.marks_given_250.name"
  | "badge.marks_given_250.desc"
  | "badge.lessons_held_10.name"
  | "badge.lessons_held_10.desc"
  | "badge.lessons_held_50.name"
  | "badge.lessons_held_50.desc"
  | "badge.lessons_held_200.name"
  | "badge.lessons_held_200.desc"
  | "badge.pool_approved_5.name"
  | "badge.pool_approved_5.desc"
  | "badge.pool_approved_25.name"
  | "badge.pool_approved_25.desc"
  | "badge.pool_approved_100.name"
  | "badge.pool_approved_100.desc"
  | "badge.pool_published_1.name"
  | "badge.pool_published_1.desc"
  | "badge.pool_published_10.name"
  | "badge.pool_published_10.desc"
  | "badge.pool_published_50.name"
  | "badge.pool_published_50.desc"
  | "badge.lessons_attended_10.name"
  | "badge.lessons_attended_10.desc"
  | "badge.lessons_attended_50.name"
  | "badge.lessons_attended_50.desc"
  | "badge.lessons_attended_200.name"
  | "badge.lessons_attended_200.desc"
  | "badge.high_mark_1.name"
  | "badge.high_mark_1.desc"
  | "badge.high_mark_10.name"
  | "badge.high_mark_10.desc"
  | "badge.high_mark_25.name"
  | "badge.high_mark_25.desc"
  | "badge.study_streak_3.name"
  | "badge.study_streak_3.desc"
  | "badge.study_streak_7.name"
  | "badge.study_streak_7.desc"
  | "badge.study_streak_30.name"
  | "badge.study_streak_30.desc"
  | "whiteboard.bulkInvite"
  | "whiteboard.bulkInviteHint"
  | "whiteboard.inviteSourceClass"
  | "whiteboard.inviteSourceCourse"
  | "whiteboard.inviteSourceEvent"
  | "whiteboard.inviteSelect"
  | "whiteboard.inviteAction"
  | "whiteboard.inviteAdded"
  | "whiteboard.inviteNoneAdded"
  | "whiteboard.inviteTooMany"
  | "whiteboard.inviteNotFound"
  | "whiteboard.inviteEmptySource"
  | "nav.children"
  | "nav.school"
  | "nav.notes"
  | "nav.events"
  | "nav.exams"
  | "nav.questionBank"
  | "nav.homework"
  | "nav.courses"
  | "nav.meals"
  | "nav.marks"
  | "nav.messages"
  | "nav.pomodoro"
  | "nav.attendance"
  | "nav.questions"
  | "nav.work"
  | "nav.staffWork"
  | "nav.users"
  | "nav.studentMarks"
  | "nav.studentAttendance"
  | "nav.studentPomodoro"
  | "nav.settings"
  | "nav.terms"
  | "nav.calendar"
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
  | "nav.group.school"
  | "nav.group.classes"
  | "nav.group.planning"
  | "nav.group.workspace"
  | "nav.group.grades"
  | "nav.group.community"
  | "nav.group.services"
  | "nav.group.operations"
  | "nav.group.ai"
  | "nav.group.institution"
  | "nav.group.myClassroom"
  | "nav.group.study"
  | "nav.group.other"
  | "nav.group.myStudent"
  | "nav.group.teaching"
  | "nav.group.tracking"
  | "nav.studentsRoster"
  | "nav.teachersRoster"
  | "nav.schedule"
  | "nav.mySchedule"
  | "nav.mockExams"
  | "nav.opticalReading"
  | "nav.hezarfenZeka"
  | "nav.celebi"
  | "nav.soundStudio"
  | "nav.reports"
  | "nav.licenseModules"
  | "nav.dataProtection"
  | "nav.schoolMeals"
  | "nav.myClasses"
  | "nav.studentAnalysis"
  | "nav.pendingApprovals"
  | "nav.questionGeneration"
  | "nav.parentCommunication"
  | "nav.studyPlan"
  | "nav.topicMastery"
  | "nav.examResults"
  | "nav.myHomework"
  | "nav.progressReport"
  | "nav.absence"
  | "nav.childExamResults"
  | "nav.childStudyPlan"
  | "nav.appointmentsAndCommunication"
  | "nav.soon"
  | "comingSoon.title"
  | "comingSoon.description"
  | "comingSoon.emptyTitle"
  | "comingSoon.emptyDescription"
  | "roster.student"
  | "roster.teacher"
  | "roster.class"
  | "roster.classAll"
  | "roster.term"
  | "roster.termAll"
  | "roster.mastery"
  | "roster.attendance"
  | "roster.planAdherence"
  | "roster.status"
  | "roster.branch"
  | "roster.weeklyLessons"
  | "roster.suggestionAcceptance"
  | "roster.tabAll"
  | "roster.tabActive"
  | "roster.tabNew"
  | "roster.tabAtRisk"
  | "roster.tabLeft"
  | "roster.tabPermanent"
  | "roster.tabContract"
  | "roster.tabAdvisor"
  | "roster.import"
  | "roster.addStudent"
  | "roster.addTeacher"
  | "roster.studentsSubtitle"
  | "roster.teachersSubtitle"
  | "roster.searchStudents"
  | "roster.searchTeachers"
  | "roster.noTeachers"
  | "builder.console"
  | "builder.logout"
  | "builder.loginTitle"
  | "builder.loginSubtitle"
  | "builder.backToSchoolLogin"
  | "builder.operatorLogin"
  | "builder.statusActive"
  | "builder.statusSuspended"
  | "builder.createSchool"
  | "builder.createSchoolHint"
  | "builder.slug"
  | "builder.slugHint"
  | "builder.schoolName"
  | "builder.adminUsername"
  | "builder.adminPassword"
  | "builder.sellEverything"
  | "builder.schools"
  | "builder.schoolsSubtitle"
  | "builder.status"
  | "builder.modules"
  | "builder.createdAt"
  | "builder.suspend"
  | "builder.activate"
  | "builder.noSchools"
  | "builder.deleteSchool"
  | "builder.deleteSchoolWarning"
  | "builder.enterSchool"
  | "builder.enterSchoolHint"
  | "builder.enterSuspendedHint"
  | "builder.resetAdminPassword"
  | "builder.resetAdminPasswordHint"
  | "builder.newPassword"
  | "builder.passwordResetDone"
  | "builder.modulesHint"
  | "builder.editSchool"
  | "builder.editSchoolHint"
  | "builder.suspendHint"
  | "modules.subtitle"
  | "modules.readOnlyHint"
  | "modules.enabledCount"
  | "modules.enableAll"
  | "modules.disableAll"
  | "modules.requires"
  | "modules.on"
  | "modules.off"
  | "modules.module"
  | "modules.active"
  | "modules.unitPrice"
  | "modules.activeSeats"
  | "modules.annualAmount"
  | "modules.annualTotal"
  | "modules.tabOverview"
  | "modules.tabUsage"
  | "modules.tabInvoices"
  | "modules.tabContract"
  | "modules.downloadInvoices"
  | "modules.addLicense"
  | "modules.fullPackage"
  | "modules.customPackage"
  | "modules.renewal"
  | "modules.recentInvoices"
  | "modules.conflictRequires"
  | "modules.conflictRequiredBy"
  | "module.appointments"
  | "module.attendance"
  | "module.bank_questions"
  | "module.boards"
  | "module.chatbot"
  | "module.classes"
  | "module.course_notes"
  | "module.courses"
  | "module.events"
  | "module.exams"
  | "module.homework"
  | "module.marks"
  | "module.meals"
  | "module.messages"
  | "module.notes"
  | "module.payments"
  | "module.pomodoro"
  | "module.questions"
  | "module.sessions"
  | "module.subjects"
  | "module.work"
  | "package.academics"
  | "package.ai"
  | "package.communication"
  | "package.operations"
  | "nav.darkMode"
  | "rightPanel.messagesTitle"
  | "rightPanel.calendarTitle"
  | "rightPanel.openFullMessages"
  | "rightPanel.openFullCalendar"
  | "rightPanel.noUnread"
  | "rightPanel.noUpcoming"
  | "rightPanel.unreadBadge"
  | "notifications.title"
  | "notifications.clearAll"
  | "notifications.dismiss"
  | "notifications.empty"
  | "notifications.tabAll"
  | "notifications.tabSystem"
  | "errors.notFoundDescription"
  | "errors.accessDeniedDescription"
  | "network.offlineTitle"
  | "network.offlineDescription"
  | "network.reconnect"
  | "parents.title"
  | "parents.subtitle"
  | "common.loading"
  | "common.cancel"
  | "common.save"
  | "common.create"
  | "common.edit"
  | "common.done"
  | "common.delete"
  | "common.update"
  | "common.remove"
  | "common.back"
  | "common.view"
  | "common.reply"
  | "common.approve"
  | "common.reject"
  | "common.action"
  | "common.actions"
  | "common.columns"
  | "common.visibleColumns"
  | "common.pageRange"
  | "common.rowsPerPage"
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
  | "confirm.removeEventRegistration"
  | "confirm.removeResult"
  | "confirm.updateRole"
  | "confirm.gradeStudent"
  | "common.prev"
  | "common.next"
  | "common.pageOf"
  | "common.noResults"
  | "common.creator"
  | "common.searchPlaceholder"
  | "common.all"
  | "common.resetFilters"
  | "common.saveAttendance"
  | "common.created"
  | "common.deleted"
  | "common.saved"
  | "common.createItem"
  | "common.countItem"
  | "pool.title"
  | "pool.subtitle"
  | "pool.ask"
  | "pool.subject"
  | "pool.body"
  | "pool.image"
  | "pool.status"
  | "pool.pending"
  | "pool.approved"
  | "pool.author"
  | "pool.solutions"
  | "pool.offerSolution"
  | "pool.noQuestions"
  | "theme.light"
  | "theme.dark"
  | "theme.toggle"
  | "lang.en"
  | "lang.tr"
  | "lang.label"
  | "auth.login"
  | "auth.register"
  | "auth.username"
  | "auth.school"
  | "auth.schoolHint"
  | "auth.password"
  | "auth.noAccount"
  | "auth.hasAccount"
  | "auth.confirmPassword"
  | "auth.passwordMismatch"
  | "auth.loginTitle"
  | "auth.loginSubtitle"
  | "auth.chooseSchoolTitle"
  | "auth.chooseSchoolSubtitle"
  | "auth.differentAccount"
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
  | "command.group.actions"
  | "command.group.people"
  | "command.group.navigation"
  | "command.group.system"
  | "command.action.createHomework"
  | "command.action.createHomeworkDesc"
  | "command.action.createCourse"
  | "command.action.createCourseDesc"
  | "command.action.createEvent"
  | "command.action.createEventDesc"
  | "command.action.createExam"
  | "command.action.createExamDesc"
  | "command.action.createNote"
  | "command.action.createNoteDesc"
  | "command.action.importNote"
  | "command.action.importNoteDesc"
  | "command.action.askQuestion"
  | "command.action.askQuestionDesc"
  | "command.action.askCelebi"
  | "command.action.askCelebiDesc"
  | "command.action.myProfile"
  | "command.action.myProfileDesc"
  | "command.action.themeDark"
  | "command.action.themeLight"
  | "command.action.themeSystem"
  | "command.action.langTr"
  | "command.action.langEn"
  | "command.action.logout"
  | "command.action.logoutDesc"
  | "command.action.themeDarkDesc"
  | "command.action.themeLightDesc"
  | "command.action.langTrDesc"
  | "command.action.langEnDesc"
  | "command.shortcutHint"
  | "command.key.navigate"
  | "command.key.select"
  | "command.key.close"
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
  | "dashboard.portal.studiesDesc"
  | "dashboard.portal.clubsDesc"
  | "dashboard.portal.examsDesc"
  | "dashboard.portal.eventsDesc"
  | "dashboard.portal.marksDesc"
  | "dashboard.portal.pomodoroDesc"
  | "dashboard.portal.notesDesc"
  | "dashboard.portal.usersDesc"
  | "dashboard.portal.attendanceDesc"
  | "dashboard.portal.workDesc"
  | "dashboard.portal.studentMarksDesc"
  | "dashboard.portal.settingsDesc"
  | "dashboard.portal.termsDesc"
  | "dashboard.portal.mealsDesc"
  | "dashboard.highlights"
  | "dashboard.progressOverview"
  | "dashboard.progressOverviewDesc"
  | "dashboard.activitySplit"
  | "dashboard.activitySplitDesc"
  | "dashboard.deadlines"
  | "dashboard.courseAverages"
  | "dashboard.successTrend"
  | "dashboard.successTrendMine"
  | "dashboard.successTrendSchool"
  | "dashboard.courseAveragesSchool"
  | "dashboard.examGraded"
  | "dashboard.chartExamCount"
  | "dashboard.chartLatest"
  | "dashboard.chartAverage"
  | "dashboard.chartRange"
  | "dashboard.chartLatestExam"
  | "dashboard.focusHeatmap"
  | "dashboard.focusHeatmapDesc"
  | "dashboard.activityHeatmap"
  | "dashboard.activityHeatmapDesc"
  | "dashboard.heatmapLess"
  | "dashboard.heatmapMore"
  | "dashboard.heatmapFocusDay"
  | "dashboard.heatmapFocusEmpty"
  | "dashboard.heatmapRecordDay"
  | "dashboard.heatmapRecordEmpty"
  | "dashboard.heatmapFocusTotal"
  | "dashboard.heatmapRecordTotal"
  | "dashboard.chartEmpty"
  | "dashboard.chartEmptyHint"
  | "dashboard.col.task"
  | "dashboard.col.dueDate"
  | "dashboard.col.type"
  | "dashboard.col.status"
  | "dashboard.type.exam"
  | "dashboard.type.event"
  | "dashboard.type.payment"
  | "dashboard.type.appointment"
  | "dashboard.type.homework"
  | "dashboard.stats.attendance"
  | "dashboard.stats.homework"
  | "dashboard.stats.students"
  | "dashboard.stats.children"
  | "dashboard.stats.childAttendance"
  | "dashboard.stats.meals"
  | "dashboard.stats.appointments"
  | "dashboard.attend.present"
  | "dashboard.attend.absent"
  | "dashboard.attend.late"
  | "dashboard.attend.excused"
  | "dashboard.welcomeBack"
  | "dashboard.welcomeHint"
  | "dashboard.quickReview.title"
  | "dashboard.quickReview.subtitle"
  | "dashboard.quickReview.placeholder"
  | "dashboard.quickReview.practice"
  | "dashboard.quickReview.startQuiz"
  | "dashboard.analytics"
  | "dashboard.hero.heading"
  | "dashboard.hero.searchPlaceholder"
  | "dashboard.hero.searchPlaceholderAdmin"
  | "dashboard.hero.searchPlaceholderAll"
  | "dashboard.hero.searchEmpty"
  | "dashboard.teacher.pendingAppointments"
  | "dashboard.teacher.pendingAppointmentsDesc"
  | "dashboard.teacher.pendingAppointmentsEmpty"
  | "dashboard.teacher.schedule"
  | "dashboard.teacher.classPerformance"
  | "dashboard.student.thisWeek"
  | "dashboard.student.thisWeekDesc"
  | "dashboard.student.thisWeekTotal"
  | "dashboard.student.todayPlan"
  | "dashboard.student.mastery"
  | "dashboard.student.audioWorkshop"
  | "dashboard.parent.progress"
  | "dashboard.parent.teacherNotes"
  | "dashboard.parent.child"
  | "dashboard.parent.homeroom"
  | "dashboard.parent.attendanceDetail"
  | "dashboard.parent.attendanceDetailDesc"
  | "dashboard.parent.attendanceRate"
  | "dashboard.parent.payment"
  | "dashboard.parent.paymentDesc"
  | "dashboard.parent.paymentEmpty"
  | "dashboard.parent.installmentsPaid"
  | "dashboard.parent.nextInstallment"
  | "dashboard.parent.balance"
  | "dashboard.quicklinks.students"
  | "dashboard.quicklinks.classes"
  | "dashboard.quicklinks.modules"
  | "dashboard.quicklinks.empty"
  | "dashboard.admin.rangeThisMonth"
  | "courseNotes.title"
  | "courseNotes.item"
  | "courseNotes.new"
  | "courseNotes.add"
  | "courseNotes.empty"
  | "courseNotes.emptyManageHint"
  | "courseNotes.ragTitle"
  | "courseNotes.ragEmpty"
  | "notes.title"
  | "notes.subtitle"
  | "notes.new"
  | "notes.write"
  | "notes.preview"
  | "notes.empty"
  | "notes.noContent"
  | "notes.files"
  | "notes.filesHelp"
  | "notes.addFile"
  | "notes.import"
  | "notes.importHelp"
  | "notes.importReadError"
  | "notes.draw"
  | "notes.drawTitle"
  | "draw.pen"
  | "draw.eraser"
  | "draw.pan"
  | "draw.zoomIn"
  | "draw.zoomOut"
  | "draw.resetZoom"
  | "draw.color"
  | "draw.width"
  | "draw.paper"
  | "draw.undo"
  | "draw.clear"
  | "draw.save"
  | "draw.hint"
  | "draw.downloadPng"
  | "draw.downloadJpeg"
  | "draw.bgNone"
  | "draw.bgLines"
  | "draw.bgGrid"
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
  | "events.registrationRoster"
  | "events.registrationRosterHelp"
  | "events.registerStudent"
  | "events.unregister"
  | "events.noRoster"
  | "events.notMarked"
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
  | "exams.attemptsLeft"
  | "exams.retakes"
  | "exams.retakesHelp"
  | "exams.allowRejoin"
  | "exams.allowRejoinHelp"
  | "exams.allowReview"
  | "exams.allowReviewHelp"
  | "exams.draft"
  | "exams.draftHelp"
  | "exams.publish"
  | "exams.published"
  | "exams.startTime"
  | "exams.endTime"
  | "exams.scheduleRequired"
  | "exams.step1Details"
  | "exams.step2Questions"
  | "exams.hasDuration"
  | "exams.hasDurationHelp"
  | "exams.accessAndAttempts"
  | "exams.singleAttempt"
  | "exams.multipleAttempts"
  | "exams.finishAndClose"
  | "exams.nextQuestions"
  | "exams.sectionBasic"
  | "exams.sectionSchedule"
  | "exams.sectionDuration"
  | "exams.sectionAccess"
  | "exams.times"
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
  | "questions.image"
  | "questions.draw"
  | "questions.drawTitle"
  | "questions.editDrawing"
  | "questions.choiceImage"
  | "questions.subjectRequired"
  | "questions.subjectUnavailable"
  | "questions.subjectUnavailableHelp"
  | "questions.textRequired"
  | "questions.pointsRange"
  | "questions.choicesRange"
  | "questions.correctRequired"
  | "questions.correctRange"
  | "bank.title"
  | "bank.subtitle"
  | "bank.empty"
  | "bank.create"
  | "bank.edit"
  | "bank.owner"
  | "bank.mine"
  | "bank.usedCount"
  | "bank.created"
  | "bank.copyNotice"
  | "bank.courseHint"
  | "bank.courseSelect"
  | "bank.courseUnavailable"
  | "bank.targetSubjectHint"
  | "bank.fromBank"
  | "bank.pickTemplate"
  | "bank.targetSubject"
  | "bank.insert"
  | "bank.inserted"
  | "bank.saveToBank"
  | "bank.saveCopyToBank"
  | "bank.saveCopyTitle"
  | "bank.saveCopyBody"
  | "bank.saveCopyConfirm"
  | "bank.savedToBank"
  | "bank.fromBankBadge"
  | "bank.savedToBankBadge"
  | "bank.search"
  | "bank.pickerEmpty"
  | "bank.noSubjects"
  | "bank.countTotal"
  | "bank.countShown"
  | "bank.whoCanSee"
  | "bank.onlyMe"
  | "bank.sharedWithSchool"
  | "bank.onlyMeHint"
  | "bank.sharedWithSchoolHint"
  | "bank.shareTitle"
  | "bank.shareBody"
  | "bank.shareConfirm"
  | "bank.startsPrivate"
  | "bank.usedInExams"
  | "bank.refresh"
  | "bank.refreshTitle"
  | "bank.refreshBody"
  | "bank.difficulty"
  | "bank.correctRate"
  | "bank.objective"
  | "bank.source"
  | "bank.source.institution"
  | "bank.source.publisher"
  | "bank.source.ai"
  | "bank.refreshConfirm"
  | "bank.refreshed"
  | "subjects.title"
  | "subjects.item"
  | "subjects.subject"
  | "subjects.name"
  | "subjects.add"
  | "subjects.edit"
  | "subjects.empty"
  | "subjects.select"
  | "subjects.help"
  | "pomodoro.title"
  | "pomodoro.subtitle"
  | "pomodoro.total"
  | "pomodoro.running"
  | "pomodoro.idle"
  | "pomodoro.start"
  | "pomodoro.finish"
  | "pomodoro.started"
  | "pomodoro.finished"
  | "pomodoro.history"
  | "pomodoro.empty"
  | "pomodoro.lookup"
  | "pomodoro.forUser"
  | "pomodoro.startedAt"
  | "pomodoro.finishedAt"
  | "pomodoro.duration"
  | "pomodoro.sessionLabel"
  | "pomodoro.sessionLabelPlaceholder"
  | "pomodoro.counted"
  | "pomodoro.countedYes"
  | "pomodoro.countedNo"
  | "pomodoro.focusConsole"
  | "pomodoro.current"
  | "pomodoro.today"
  | "pomodoro.average"
  | "pomodoro.sessions"
  | "pomodoro.idleHelp"
  | "pomodoro.runningSince"
  | "pomodoro.lastSession"
  | "pomodoro.noRecentSession"
  | "pomodoro.remaining"
  | "pomodoro.overtime"
  | "pomodoro.targetReached"
  | "pomodoro.customMinutes"
  | "attempt.title"
  | "attempt.openRoom"
  | "attempt.start"
  | "attempt.resume"
  | "attempt.finish"
  | "attempt.finishConfirm"
  | "attempt.finishHint"
  | "attempt.status"
  | "attempt.remaining"
  | "attempt.attempt"
  | "attempt.left"
  | "attempt.progress"
  | "attempt.deadline"
  | "attempt.notStarted"
  | "attempt.unscheduled"
  | "attempt.saved"
  | "attempt.saving"
  | "attempt.notSaved"
  | "attempt.notSavedHint"
  | "attempt.saveTimeout"
  | "attempt.saveDisconnected"
  | "attempt.saveAnswerRetry"
  | "attempt.savedAt"
  | "attempt.serverNow"
  | "attempt.mark"
  | "attempt.saveAnswer"
  | "attempt.submitted"
  | "attempt.submittedCanRetakeInfo"
  | "attempt.submittedFinalInfo"
  | "attempt.submittedAt"
  | "exams.startsAt"
  | "exams.endsAt"
  | "attempt.expired"
  | "attempt.expiredInfo"
  | "attempt.noAttemptsLeft"
  | "attempt.closed"
  | "attempt.inProgress"
  | "attempt.absent"
  | "exams.helpTitle"
  | "exams.helpBody"
  | "admin.title"
  | "admin.subtitle"
  | "admin.tabAll"
  | "admin.tabManagers"
  | "admin.tabTeachers"
  | "admin.tabParents"
  | "admin.tabStudents"
  | "admin.tabInvites"
  | "admin.inviteUser"
  | "admin.username"
  | "admin.id"
  | "admin.role"
  | "admin.directory"
  | "admin.helpTitle"
  | "admin.helpBody"
  | "admin.noUsers"
  | "guide.title"
  | "guide.subtitle"
  | "guide.roles.title"
  | "guide.roles.subtitle"
  | "guide.roles.adminTab"
  | "guide.roles.student.heading"
  | "guide.roles.student.i1"
  | "guide.roles.student.i2"
  | "guide.roles.student.i3"
  | "guide.roles.student.i4"
  | "guide.roles.teacher.heading"
  | "guide.roles.teacher.i1"
  | "guide.roles.teacher.i2"
  | "guide.roles.teacher.i3"
  | "guide.roles.teacher.i4"
  | "guide.roles.parent.heading"
  | "guide.roles.parent.i1"
  | "guide.roles.parent.i2"
  | "guide.roles.parent.i3"
  | "guide.roles.parent.i4"
  | "guide.roles.admin.heading"
  | "guide.roles.admin.i1"
  | "guide.roles.admin.i2"
  | "guide.roles.admin.i3"
  | "guide.roles.admin.i4"
  | "guide.modules.title"
  | "guide.modules.subtitle"
  | "guide.step.ai.badge"
  | "guide.step.ai.title"
  | "guide.step.ai.description"
  | "guide.step.ai.cta"
  | "guide.step.ai.f1"
  | "guide.step.ai.f2"
  | "guide.step.ai.f3"
  | "guide.step.notes.badge"
  | "guide.step.notes.title"
  | "guide.step.notes.description"
  | "guide.step.notes.cta"
  | "guide.step.notes.f1"
  | "guide.step.notes.f2"
  | "guide.step.notes.f3"
  | "guide.step.questions.badge"
  | "guide.step.questions.title"
  | "guide.step.questions.description"
  | "guide.step.questions.cta"
  | "guide.step.questions.f1"
  | "guide.step.questions.f2"
  | "guide.step.questions.f3"
  | "guide.step.courses.badge"
  | "guide.step.courses.title"
  | "guide.step.courses.description"
  | "guide.step.courses.cta"
  | "guide.step.courses.f1"
  | "guide.step.courses.f2"
  | "guide.step.courses.f3"
  | "guide.step.exams.badge"
  | "guide.step.exams.title"
  | "guide.step.exams.description"
  | "guide.step.exams.cta"
  | "guide.step.exams.f1"
  | "guide.step.exams.f2"
  | "guide.step.exams.f3"
  | "guide.step.marks.badge"
  | "guide.step.marks.title"
  | "guide.step.marks.description"
  | "guide.step.marks.cta"
  | "guide.step.marks.f1"
  | "guide.step.marks.f2"
  | "guide.step.marks.f3"
  | "guide.tips.title"
  | "guide.tips.subtitle"
  | "guide.tips.locale.title"
  | "guide.tips.locale.body"
  | "guide.tips.sync.title"
  | "guide.tips.sync.body"
  | "guide.tips.import.title"
  | "guide.tips.import.body"
  | "guide.tips.weights.title"
  | "guide.tips.weights.body"
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
  | "form.noTeachers"
  | "form.searchNoPermission"
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
  | "role.parent"
  | "role.teacher"
  | "role.manager"
  | "role.admin"
  | "courses.title"
  | "courses.listTitle"
  | "courses.subtitle"
  | "courses.pageSubtitle"
  | "courses.create"
  | "courses.empty"
  | "courses.enrolled"
  | "courses.roster"
  | "courses.rosterItem"
  | "courses.enroll"
  | "courses.exams"
  | "courses.examItem"
  | "courses.addExam"
  | "courses.weight"
  | "courses.delete"
  | "courses.kind"
  | "courses.kind.course"
  | "courses.kind.study"
  | "courses.kind.club"
  | "courses.kind.courseSingular"
  | "courses.kind.studySingular"
  | "courses.kind.clubSingular"
  | "courses.capacity"
  | "courses.unlimited"
  | "courses.capacityOptional"
  | "courses.teachers"
  | "courses.assignTeacher"
  | "courses.unassignTeacher"
  | "courses.confirmUnassignTeacher"
  | "courses.teacherAssigned"
  | "courses.teacherUnassigned"
  | "courses.noTeachers"
  | "courses.overview"
  | "courses.work"
  | "courses.people"
  | "courses.upcoming"
  | "courses.noUpcoming"
  | "courses.nextExam"
  | "courses.nextHomework"
  | "courses.weeklyHours"
  | "courses.competency"
  | "courses.attendanceRate"
  | "courses.progress"
  | "courses.takeAttendance"
  | "courses.analysis"
  | "homework.title"
  | "homework.item"
  | "homework.add"
  | "homework.edit"
  | "homework.empty"
  | "homework.help"
  | "homework.listHelp"
  | "homework.dueAt"
  | "homework.assigned"
  | "homework.wholeCourse"
  | "homework.wholeCourseHelp"
  | "homework.dueRequired"
  | "homework.mineTitle"
  | "homework.submit"
  | "homework.submitHelp"
  | "homework.withdraw"
  | "homework.withdrawHint"
  | "homework.answerPlaceholder"
  | "homework.fileUploaded"
  | "homework.submittedAt"
  | "homework.late"
  | "homework.submission"
  | "homework.submissions"
  | "homework.submissionsHelp"
  | "homework.submitted"
  | "homework.notSubmitted"
  | "homework.tab.todo"
  | "homework.tab.submitted"
  | "homework.tab.graded"
  | "homework.tab.open"
  | "homework.tab.past"
  | "homework.result"
  | "homework.grade"
  | "homework.ungrade"
  | "homework.student"
  | "homework.noAnswer"
  | "homework.status.done"
  | "homework.status.incomplete"
  | "homework.status.missing"
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
  | "marks.tabGeneral"
  | "marks.tabByCourse"
  | "marks.selectCourse"
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
  | "exams.answersRight"
  | "exams.answersWrong"
  | "exams.answersEmpty"
  | "exams.answersPending"
  | "exams.earned"
  | "exams.possible"
  | "exams.isCorrect"
  | "exams.textAnswer"
  | "exams.drawAnswer"
  | "exams.previousAttempts"
  | "exams.attemptN"
  | "exams.markHistory"
  | "exams.currentAttempt"
  | "exams.pastAttemptReadOnly"
  | "exams.reviewInProgress"
  | "exams.uploadAnswerImage"
  | "exams.playDrawing"
  | "exams.showImage"
  | "exams.play"
  | "exams.pause"
  | "exams.restart"
  | "exams.editDrawing"
  | "exams.removeDrawing"
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
  | "course.fromClass"
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
  | "whiteboard.participantCount"
  | "settings.maxFileSizeInvalid"
  | "settings.mealSlotNameInvalid"
  | "settings.aiPolicy"
  | "settings.aiPolicyHelp"
  | "settings.modules"
  | "settings.modulesHelp"
  | "settings.chatHistory"
  | "settings.chatThreads"
  | "settings.chatMessage"
  | "settings.foodPolicy"
  | "settings.foodPolicyHelp"
  | "settings.mealCutoff"
  | "settings.noCutoff"
  | "settings.mealSlot"
  | "settings.servingTimeUtc"
  | "settings.addMealSlot"
  | "settings.dietaryTags"
  | "settings.addDietaryTag"
  | "settings.tabAssessment"
  | "settings.tabMeals"
  | "settings.tabSystem"
  | "settings.tabAppearance"
  | "settings.colorPalette"
  | "settings.colorPaletteHelp"
  | "settings.colorPaletteSource"
  | "settings.defaultColor"
  | "meals.title"
  | "meals.subtitle"
  | "meals.publish"
  | "meals.publishHelp"
  | "meals.date"
  | "meals.slot"
  | "meals.capacity"
  | "meals.reservations"
  | "meals.from"
  | "meals.empty"
  | "meals.dishes"
  | "meals.conflict"
  | "meals.topPick"
  | "meals.menu"
  | "meals.detailHelp"
  | "meals.total"
  | "meals.cutoff"
  | "meals.noCutoff"
  | "meals.bookingStatus"
  | "meals.closed"
  | "meals.open"
  | "meals.child"
  | "meals.myAccount"
  | "meals.service"
  | "meals.manage"
  | "meals.noDishes"
  | "meals.booked"
  | "meals.notBooked"
  | "meals.cutoffPassed"
  | "meals.bookingHelp"
  | "meals.book"
  | "meals.cancelBooking"
  | "meals.cancelSummary"
  | "meals.cancelled"
  | "meals.dietaryProfile"
  | "meals.noDietaryNotes"
  | "meals.balance"
  | "meals.ledger"
  | "meals.ledger.charge"
  | "meals.ledger.credit"
  | "meals.ledger.reversal"
  | "meals.noLedger"
  | "meals.attendance"
  | "meals.walkIn"
  | "meals.served"
  | "meals.missed"
  | "meals.notMarked"
  | "meals.addDish"
  | "meals.studentRecord"
  | "meals.student"
  | "meals.dietaryNote"
  | "meals.bookingAudit"
  | "meals.recordCredit"
  | "meals.creditAppendOnly"
  | "meals.amountTry"
  | "meals.method"
  | "meals.note"
  | "meals.creditRecorded"
  | "meals.deleteMenu"
  | "meals.deleteDish"
  | "meals.editMenu"
  | "meals.editDish"
  | "meals.dishName"
  | "meals.priceTry"
  | "nav.payments"
  | "nav.paymentStatement"
  | "nav.whiteboards"
  | "whiteboard.title"
  | "whiteboard.subtitle"
  | "whiteboard.searchPlaceholder"
  | "whiteboard.empty"
  | "whiteboard.create"
  | "whiteboard.edit"
  | "whiteboard.titleLabel"
  | "whiteboard.participants"
  | "whiteboard.participantsHint"
  | "whiteboard.open"
  | "whiteboard.createdAt"
  | "whiteboard.limitReached"
  | "whiteboard.canvasHint"
  | "whiteboard.closedBadge"
  | "whiteboard.lockedBadge"
  | "whiteboard.readOnlyBadge"
  | "whiteboard.lock"
  | "whiteboard.unlock"
  | "whiteboard.clear"
  | "whiteboard.clearConfirm"
  | "whiteboard.close"
  | "whiteboard.closeConfirm"
  | "whiteboard.delete"
  | "whiteboard.deleteConfirm"
  | "whiteboard.creator"
  | "whiteboard.roster"
  | "whiteboard.addParticipant"
  | "whiteboard.removeParticipant"
  | "whiteboard.history"
  | "whiteboard.noHistory"
  | "whiteboard.replaySession"
  | "whiteboard.play"
  | "whiteboard.pause"
  | "whiteboard.restart"
  | "whiteboard.notFound"
  | "whiteboard.back"
  | "payments.title"
  | "payments.subtitle"
  | "payments.empty"
  | "payments.createPlan"
  | "payments.editPlan"
  | "payments.deletePlan"
  | "payments.planName"
  | "payments.installments"
  | "payments.addInstallment"
  | "payments.amountTry"
  | "payments.dueDate"
  | "payments.total"
  | "payments.assign"
  | "payments.assignHelp"
  | "payments.selectStudent"
  | "payments.assignments"
  | "payments.noAssignments"
  | "payments.outcomeAssigned"
  | "payments.outcomeAlready"
  | "payments.outcomeRejected"
  | "payments.studentLedger"
  | "payments.balance"
  | "payments.ledger"
  | "payments.noLedger"
  | "payments.recordPayment"
  | "payments.recordRefund"
  | "payments.reverse"
  | "payments.method"
  | "payments.note"
  | "payments.reason"
  | "payments.kindCharge"
  | "payments.kindCredit"
  | "payments.kindRefund"
  | "payments.kindReversal"
  | "payments.statementTitle"
  | "payments.statementSubtitle"
  | "payments.noStatement"
  | "payments.due"
  | "payments.credited"
  | "payments.refunded"
  | "payments.outstanding"
  | "payments.status"
  | "payments.overdue"
  | "payments.reversed"
  | "payments.paid"
  | "payments.appendOnly"
  | "payments.tabCollect"
  | "payments.tabPlans"
  | "payments.periodBilled"
  | "payments.periodCollected"
  | "payments.periodOverdue"
  | "payments.periodExpected"
  | "payments.exportStatement"
  | "payments.entryTabAll"
  | "payments.entryTabOverdue"
  | "payments.entryTabMonth"
  | "payments.entryTabClosed"
  | "payments.collect"
  | "payments.collectFrom"
  | "payments.totalDebt"
  | "payments.collected"
  | "payments.overdueCount"
  | "payments.statusPending"
  | "payments.statusPartial"
  | "payments.statusCancelled"
  | "payments.noDebt"
  | "payments.noDebtHint"
  | "payments.methodCash"
  | "payments.methodTransfer"
  | "payments.methodCard"
  | "payments.methodCheck"
  | "payments.methodOther"
  | "payments.methodRequired"
  | "payments.addStudent"
  | "payments.selectedStudents"
  | "payments.assignSelected"
  | "payments.assignmentSummary"
  | "payments.ledgerAudit"
  | "payments.showLedger"
  | "payments.hideLedger"
  | "payments.plan"
  | "payments.student"
  | "payments.username"
  | "payments.allStudents"
  | "payments.allPlans"
  | "payments.inDebt"
  | "payments.settled"
  | "terms.title"
  | "terms.subtitle"
  | "terms.create"
  | "terms.edit"
  | "terms.empty"
  | "terms.term"
  | "terms.unassigned"
  | "terms.dateRequired"
  | "terms.archive"
  | "terms.unarchive"
  | "terms.archived"
  | "sessions.title"
  | "sessions.item"
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
  | "attendance.totalAbsence"
  | "attendance.overallRate"
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
  | "work.daysThisMonth"
  | "work.totalEntries"
  | "work.noActivity"
  | "work.searchPlaceholder"
  | "work.location"
  | "work.quality"
  | "work.addEntry"
  | "work.planShift"
  | "lookup.searchHint"
  | "work.userNotFound"
  | "messages.inbox"
  | "messages.sent"
  | "messages.archive"
  | "messages.trash"
  | "messages.unread"
  | "messages.newMessage"
  | "messages.recipient"
  | "messages.recipientPlaceholder"
  | "messages.search"
  | "messages.noMessages"
  | "messages.noSelection"
  | "messages.reply"
  | "messages.send"
  | "messages.moveToArchive"
  | "messages.moveOutOfArchive"
  | "messages.moveToTrash"
  | "messages.deleteForever"
  | "messages.movedToast"
  | "messages.deletedToast"
  | "messages.sentToast"
  | "messages.to"
  | "messages.from"
  | "messages.markAsRead"
  | "messages.markAsUnread"
  | "messages.selectRecipient"
  | "messages.expand"
  | "messages.minimize"
  | "messages.replyTo"
  | "messages.refreshedToast"
  | "messages.deleteForeverOnlyTrash"
  | "messages.readOnlyReceived"
  | "messages.trashEmptiedToast"
  | "calendar.title"
  | "calendar.today"
  | "calendar.noEvents"
  | "calendar.events"
  | "calendar.exams"
  | "calendar.appointments"
  | "calendar.lessons"
  | "calendar.studies"
  | "calendar.homework"
  | "calendar.viewDay"
  | "calendar.viewWeek"
  | "calendar.viewMonth"
  | "nav.appointments"
  | "appointments.title"
  | "appointments.subtitle"
  | "appointments.subtitleStaff"
  | "appointments.myBookingsHint"
  | "appointments.requestsHint"
  | "appointments.availableSlotsHint"
  | "appointments.mySlotsHint"
  | "appointments.empty"
  | "appointments.mySlots"
  | "appointments.availableSlots"
  | "appointments.requests"
  | "appointments.myBookings"
  | "appointments.publish"
  | "appointments.book"
  | "appointments.approve"
  | "appointments.reject"
  | "appointments.cancel"
  | "appointments.reschedule"
  | "appointments.acceptReschedule"
  | "appointments.declineReschedule"
  | "appointments.deleteSlot"
  | "appointments.deleteSeries"
  | "appointments.note"
  | "appointments.reason"
  | "appointments.repeatWeekly"
  | "appointments.until"
  | "appointments.starts"
  | "appointments.ends"
  | "appointments.teacher"
  | "appointments.student"
  | "appointments.proposedTime"
  | "appointments.newTime"
  | "appointments.status.pending"
  | "appointments.status.approved"
  | "appointments.status.rejected"
  | "appointments.status.cancelled"
  | "appointments.confirmCancel"
  | "appointments.confirmDeleteSlot"
  | "appointments.confirmDeleteSeries"
  | "appointments.rescheduleProposed"
  | "appointments.slotTaken"
  | "appointments.noSlots"
  | "appointments.series"
  | "appointments.time"
  | "appointments.status"
  | "appointments.publishSubtitle"
  | "appointments.bookSubtitle"
  | "appointments.rescheduleSubtitle"
  | "appointments.reasonPlaceholder"
  | "appointments.notePlaceholder"
  | "appointments.noRequests"
  | "appointments.noBookings"
  | "appointments.repeatWeeklyHelp"
  | "appointments.untilRequired"
  | "appointments.tooManyOccurrences"
  | "appointments.cancelTitle"
  | "appointments.cancelAction"
  | "appointments.cancelReasonLabel"
  | "appointments.cancelReasonPlaceholder"
  | "appointments.cancelledBy"
  | "appointments.details"
  | "appointments.cancelReason"
  | "appointments.rejectTitle"
  | "appointments.rejectAction"
  | "appointments.confirmReject"
  | "appointments.rejectReasonLabel"
  | "appointments.rejectReasonPlaceholder"
  | "appointments.rejectReason"
  | "appointments.rejectedBy"
  | "appointments.reasonRequired";

type Dict = Record<MessageKey, string>;

const en: Dict = {
  "app.name": "Hezarfen",
  "app.tagline": "Your campus workspace — notes, events, exams in one calm place.",
  "ai.askCelebi": "Ask Çelebi",
  "ai.title": "Çelebi",
  "ai.description": "Campus assistant",
  "ai.empty": "Ask Çelebi about your school day, courses, exams, or attendance.",
  "ai.placeholder": "Ask about courses, exams, attendance...",
  "ai.send": "Send",
  "ai.unavailable": "Çelebi is temporarily unavailable. Please try again shortly.",
  "ai.copy": "Copy",
  "ai.copied": "Copied",
  "ai.thinking1": "Çelebi is thinking…",
  "ai.thinking2": "Looking into it…",
  "ai.thinking3": "Almost there…",
  "ai.hint": "Enter to send · Shift+Enter for a new line · AI-generated",
  "ai.suggest1": "What are my classes today?",
  "ai.suggest2": "Which exams are coming up?",
  "ai.suggest3": "Do I have any missing homework?",
  "ai.suggest4": "How is my attendance this term?",
  "ai.suggestStaff1": "What is on the schedule today?",
  "ai.suggestStaff2": "Which exams are coming up?",
  "ai.suggestStaff3": "Which students have low attendance?",
  "ai.suggestStaff4": "Summarize this week's events.",
  "ai.suggestParent1": "What are my child's classes today?",
  "ai.suggestParent2": "Which exams does my child have soon?",
  "ai.suggestParent3": "How is my child's attendance this term?",
  "ai.suggestParent4": "What is on this week's meal menu?",
  "ai.goTo": "Go to the page",
  "ai.didYouMean": "Did you mean one of these?",
  "ai.skipTyping": "Show the whole answer",
  "nav.today": "Today",
  "nav.classes": "Education",
  "nav.classGroups": "Classes",
  "classGroups.title": "Classes",
  "classGroups.subtitle": "Groups of students that share a set of courses.",
  "classGroups.newClass": "New class",
  "classGroups.className": "Name",
  "classGroups.grade": "Grade",
  "classGroups.empty": "No classes yet.",
  "classGroups.open": "Open",
  "classGroups.student": "Student",
  "classGroups.addedBy": "Added by",
  "classGroups.courseColumn": "Course",
  "classGroups.attachedBy": "Attached by",
  "classGroups.membersTab": "Members",
  "classGroups.coursesTab": "Courses",
  "classGroups.addStudent": "Add student",
  "classGroups.addStudentHelp": "Enrolls the student into every course attached to this class.",
  "classGroups.attachCourse": "Attach course",
  "classGroups.attachCourseHelp": "Enrolls every student in this class into the course.",
  "classGroups.removeStudent": "Remove student",
  "classGroups.removeStudentConfirm": "Remove {name} from this class? Enrollments this class added for them will be removed too.",
  "classGroups.detachCourse": "Detach course",
  "classGroups.detachCourseConfirm": "Detach {course}? Enrollments this class added for it will be removed too.",
  "classGroups.deleteClass": "Delete class",
  "classGroups.deleteConfirm": "Delete this class? It must have no students or courses left.",
  "classGroups.selectCourse": "Select a course",
  "classGroups.noMembers": "No students in this class yet.",
  "classGroups.noCourses": "No courses attached yet.",
  "classGroups.homeroomTeacher": "Homeroom teacher",
  "classGroups.noTeacher": "Not assigned",
  "classGroups.selectTeacher": "Select a teacher",
  "classGroups.yourClass": "Class",
  "classGroups.searchPlaceholder": "Search by class, grade or homeroom teacher…",
  "classGroups.allGrades": "All grades",
  "classGroups.studentsCount": "{count} students",
  "classGroups.noGrade": "No grade",
  "classGroups.attendanceRate": "Attendance",
  "classGroups.competency": "Competency",
  "classGroups.weakestTopic": "Weakest topic",
  "classGroups.mergeClasses": "Merge classes",
  "classBlueprints.tab": "Grade blueprints",
  "classBlueprints.classesTab": "Classes",
  "classBlueprints.title": "Grade blueprints",
  "classBlueprints.subtitle": "Every class at a grade takes this set of courses.",
  "classBlueprints.new": "New blueprint",
  "classBlueprints.edit": "Edit blueprint",
  "classBlueprints.grade": "Grade",
  "classBlueprints.gradeHint": "There is one blueprint per grade, so the grade cannot be changed later.",
  "classBlueprints.courses": "Courses",
  "classBlueprints.courseCount": "{count} courses",
  "classBlueprints.courseCountColumn": "Course count",
  "classBlueprints.selected": "{count} / {max} selected",
  "classBlueprints.empty": "No blueprints yet.",
  "classBlueprints.selectCourses": "Select the courses every class at this grade takes.",
  "classBlueprints.wholeSetHint":
    "This is the complete list — courses you uncheck are detached from every class at this grade. Hand-attached courses stay.",
  "classBlueprints.filterCourses": "Filter courses",
  "classBlueprints.noCourseMatch": "No course matches that filter.",
  "classBlueprints.saved": "Blueprint saved and applied to every class at this grade.",
  "classBlueprints.delete": "Delete blueprint",
  "classBlueprints.deleteConfirm":
    "Delete the blueprint for grade {grade}? The courses it attached are detached from every class at this grade. Hand-attached courses stay.",
  "classBlueprints.deleted": "Blueprint deleted.",
  "classBlueprints.status": "Check sync",
  "classBlueprints.statusTitle": "Sync status for grade {grade}",
  "classBlueprints.statusEmpty": "Every section at this grade carries the full template.",
  "classBlueprints.statusSection": "Section",
  "classBlueprints.statusMissing": "Missing courses",
  "classBlueprints.apply": "Apply blueprint",
  "classBlueprints.applyHint": "Attaches this grade's blueprint courses to this class.",
  "classBlueprints.applyNoGrade": "Assign a grade to this class first.",
  "classBlueprints.applied": "Blueprint applied.",
  "classBlueprints.noBlueprintForGrade": "There is no blueprint for grade {grade} yet.",
  "classBlueprints.conflictExists": "A blueprint already exists for this grade. Edit it from the list instead.",
  "classBlueprints.staleReload":
    "This blueprint changed while you were editing. The list has been refreshed — review it and save again.",
  "classBlueprints.skippedSummary": "Saved. {count} class-course pairs could not be attached.",
  "classBlueprints.skippedDetails": "See details",
  "classBlueprints.skippedTitle": "Not attached",
  "classBlueprints.skippedSubtitle": "Everything else went through. These pairs were left alone.",
  "classBlueprints.skippedClass": "Class",
  "classBlueprints.skippedCourse": "Course",
  "classBlueprints.skippedReason": "Reason",
  "classBlueprints.skipClassGone": "The class was deleted while the blueprint was being applied.",
  "classBlueprints.skipCoursePruned": "This course no longer exists and has been dropped from the blueprint.",
  "classBlueprints.skipCeiling": "The class already holds the maximum number of courses.",
  "classBlueprints.skipOverloaded": "The class holds more students than one course attach may enroll at once.",
  "classBlueprints.skipNoSeat": "{course} has no free seat for the whole class.",
  "classBlueprints.skipCourseGone": "{course} no longer exists — detach it from this class first.",
  "classBlueprints.skipOther": "This pair could not be attached.",
  "profile.myProfile": "My profile",
  "profile.viewProfile": "View profile",
  "profile.displayName": "Display name",
  "profile.displayNameHint": "Shown to other people instead of your username.",
  "profile.bio": "About",
  "profile.bioHint": "A short line about yourself.",
  "profile.bioEmpty": "No bio yet.",
  "profile.classes": "Classes",
  "profile.noClasses": "Not in any class.",
  "profile.courses": "Courses",
  "profile.noCourses": "No courses to show.",
  "profile.stats": "Stats",
  "profile.statFocusHours": "Hours focused",
  "profile.statSessions": "Focus sessions",
  "profile.statHomework": "Homework submitted",
  "profile.statOnTime": "Submitted on time",
  "profile.statExams": "Exams sat",
  "profile.statCourses": "Courses",
  "profile.statClasses": "Classes",
  "common.clearSearch": "Clear search",
  "common.refresh": "Refresh",
  "editor.bold": "Bold (Ctrl+B)",
  "editor.italic": "Italic (Ctrl+I)",
  "editor.underline": "Underline (Ctrl+U)",
  "editor.strike": "Strikethrough",
  "editor.bulletList": "Bulleted list",
  "editor.numberedList": "Numbered list",
  "editor.clearFormatting": "Clear formatting",
  "editor.bulletListLabel": "List",
  "editor.numberedListLabel": "1. List",
  "editor.clearFormattingLabel": "Clear format",
  "editor.bodyPlaceholder": "Write your message here…",
  "messages.refreshList": "Refresh messages",
  "messages.deleteDraft": "Delete draft",
  "messages.restoreFromTrash": "Restore from trash",
  "messages.labelsPlaceholder": "e.g. Study, Exam (optional)",
  "messages.bodyPlaceholder": "Write your message here…",
  "messages.replyPlaceholder": "Write your reply…",
  "questions.deleteConfirm": "Delete this question?",
  "profile.forbiddenParent": "You can only view your own profile and your children's.",
  "profile.notFound": "There is no such person.",
  "parentLink.manage": "Linked students",
  "parentLink.title": "Linked students",
  "parentLink.subtitle": "Students {name} is the guardian of.",
  "parentLink.selectStudent": "Choose a student",
  "parentLink.add": "Link",
  "parentLink.empty": "No students are linked to this parent yet.",
  "parentLink.linked": "Student linked.",
  "parentLink.remove": "Remove link",
  "parentLink.removeConfirm": "Unlink {student} from {parent}? The parent loses access to that student's records.",
  "parentLink.removed": "Link removed.",
  "avatar.title": "Photo",
  "avatar.change": "Change photo",
  "avatar.upload": "Upload photo",
  "avatar.remove": "Remove photo",
  "avatar.removeConfirm": "Remove your profile photo?",
  "avatar.removed": "Photo removed.",
  "avatar.uploaded": "Photo updated.",
  "avatar.hint": "PNG, JPEG, WebP or GIF, up to {size}.",
  "avatar.typeInvalid": "Use a PNG, JPEG, WebP or GIF image.",
  "avatar.tooLarge": "This image is larger than {size}.",
  "badges.title": "Badges",
  "badges.subtitle": "Earned automatically as the work adds up.",
  "badges.earnedOn": "Earned {date}",
  "badges.locked": "Not earned yet",
  "badges.remaining": "{count} to go",
  "badges.remainingHours": "{count} hours to go",
  "badges.none": "No badges yet.",
  "badges.earnedCount": "{earned} / {total} earned",
  "badge.homework_submitted_1.name": "First Steps",
  "badge.homework_submitted_1.desc": "Submit your first homework.",
  "badge.homework_submitted_10.name": "Steady Hand",
  "badge.homework_submitted_10.desc": "Submit 10 homework assignments.",
  "badge.homework_submitted_50.name": "Homework Master",
  "badge.homework_submitted_50.desc": "Submit 50 homework assignments.",
  "badge.homework_on_time_10.name": "On the Dot",
  "badge.homework_on_time_10.desc": "Turn in 10 homework assignments on time.",
  "badge.homework_on_time_25.name": "Clockwork",
  "badge.homework_on_time_25.desc": "Turn in 25 homework assignments on time.",
  "badge.exam_sat_1.name": "First Exam",
  "badge.exam_sat_1.desc": "Sit your first exam.",
  "badge.exam_sat_10.name": "Exam Regular",
  "badge.exam_sat_10.desc": "Sit 10 exams.",
  "badge.exam_sat_25.name": "Exam Veteran",
  "badge.exam_sat_25.desc": "Sit 25 exams.",
  "badge.pomodoro_finished_10.name": "Focus Starter",
  "badge.pomodoro_finished_10.desc": "Finish 10 focus sessions.",
  "badge.pomodoro_finished_50.name": "Focus Habit",
  "badge.pomodoro_finished_50.desc": "Finish 50 focus sessions.",
  "badge.pomodoro_finished_200.name": "Focus Champion",
  "badge.pomodoro_finished_200.desc": "Finish 200 focus sessions.",
  "badge.pomodoro_focus_ms_36000000.name": "Ten Hours Deep",
  "badge.pomodoro_focus_ms_36000000.desc": "Spend 10 hours in focus sessions.",
  "badge.pomodoro_focus_ms_180000000.name": "Fifty Hours Deep",
  "badge.pomodoro_focus_ms_180000000.desc": "Spend 50 hours in focus sessions.",
  "badge.marks_given_10.name": "First Marks",
  "badge.marks_given_10.desc": "Record 10 grades.",
  "badge.marks_given_50.name": "Seasoned Grader",
  "badge.marks_given_50.desc": "Record 50 grades.",
  "badge.marks_given_250.name": "Assessment Ace",
  "badge.marks_given_250.desc": "Record 250 grades.",
  "badge.lessons_held_10.name": "Classroom Start",
  "badge.lessons_held_10.desc": "Hold 10 lessons.",
  "badge.lessons_held_50.name": "Seasoned Educator",
  "badge.lessons_held_50.desc": "Hold 50 lessons.",
  "badge.lessons_held_200.name": "Teaching Pillar",
  "badge.lessons_held_200.desc": "Hold 200 lessons.",
  "badge.pool_approved_5.name": "Quality Check",
  "badge.pool_approved_5.desc": "Approve 5 question-pool entries.",
  "badge.pool_approved_25.name": "Trusted Reviewer",
  "badge.pool_approved_25.desc": "Approve 25 question-pool entries.",
  "badge.pool_approved_100.name": "Pool Curator",
  "badge.pool_approved_100.desc": "Approve 100 question-pool entries.",
  "badge.pool_published_1.name": "First Contribution",
  "badge.pool_published_1.desc": "Publish your first question to the school pool.",
  "badge.pool_published_10.name": "Question Builder",
  "badge.pool_published_10.desc": "Publish 10 questions to the school pool.",
  "badge.pool_published_50.name": "Knowledge Contributor",
  "badge.pool_published_50.desc": "Publish 50 questions to the school pool.",
  "badge.lessons_attended_10.name": "Present and Learning",
  "badge.lessons_attended_10.desc": "Attend 10 lessons.",
  "badge.lessons_attended_50.name": "Dedicated Student",
  "badge.lessons_attended_50.desc": "Attend 50 lessons.",
  "badge.lessons_attended_200.name": "Classroom Regular",
  "badge.lessons_attended_200.desc": "Attend 200 lessons.",
  "badge.high_mark_1.name": "High Flyer",
  "badge.high_mark_1.desc": "Earn your first high mark.",
  "badge.high_mark_10.name": "Top Form",
  "badge.high_mark_10.desc": "Earn 10 high marks.",
  "badge.high_mark_25.name": "Excellence Streak",
  "badge.high_mark_25.desc": "Earn 25 high marks.",
  "badge.study_streak_3.name": "Three-Day Spark",
  "badge.study_streak_3.desc": "Study for 3 consecutive days.",
  "badge.study_streak_7.name": "Study Week",
  "badge.study_streak_7.desc": "Study for 7 consecutive days.",
  "badge.study_streak_30.name": "Monthly Momentum",
  "badge.study_streak_30.desc": "Study for 30 consecutive days.",
  "whiteboard.bulkInvite": "Invite a group",
  "whiteboard.bulkInviteHint":
    "Adds everyone in the group as a participant. Parents are skipped, and people already on the board keep their place.",
  "whiteboard.inviteSourceClass": "Class",
  "whiteboard.inviteSourceCourse": "Course or club",
  "whiteboard.inviteSourceEvent": "Event",
  "whiteboard.inviteSelect": "Choose a group",
  "whiteboard.inviteAction": "Invite",
  "whiteboard.inviteAdded": "{count} people added.",
  "whiteboard.inviteNoneAdded": "Everyone in that group is already a participant.",
  "whiteboard.inviteTooMany":
    "That group would push the board past {max} participants, so nobody was added. Remove some participants or invite a smaller group.",
  "whiteboard.inviteNotFound": "That group no longer exists. Refresh the list.",
  "whiteboard.inviteEmptySource": "Nothing to pick here yet.",
  "nav.children": "My children",
  "nav.school": "School",
  "nav.notes": "Notebook",
  "nav.events": "Events",
  "nav.exams": "Exams",
  "nav.questionBank": "Question bank",
  "nav.homework": "Homework",
  "nav.courses": "Courses",
  "nav.meals": "Meals",
  "nav.marks": "Report card",
  "nav.messages": "Messages",
  "rightPanel.messagesTitle": "Messages",
  "rightPanel.calendarTitle": "Calendar & events",
  "rightPanel.openFullMessages": "Open all messages",
  "rightPanel.openFullCalendar": "Open full calendar",
  "rightPanel.noUnread": "No unread messages",
  "rightPanel.noUpcoming": "No upcoming events or exams",
  "rightPanel.unreadBadge": "Unread",
  "notifications.title": "Notifications",
  "notifications.clearAll": "Clear all",
  "notifications.dismiss": "Dismiss",
  "notifications.empty": "No new notifications yet.",
  "notifications.tabAll": "All",
  "notifications.tabSystem": "System",
  "errors.notFoundDescription": "The page you're looking for may have moved or been deleted.",
  "errors.accessDeniedDescription": "Your role can't view this section. Ask an administrator if you need access.",
  "network.offlineTitle": "You're offline",
  "network.offlineDescription": "Some actions won't complete until your connection returns.",
  "network.reconnect": "Reconnect",
  "nav.pomodoro": "Pomodoro",
  "nav.attendance": "Attendance",
  "nav.questions": "Question pool",
  "nav.work": "Shift",
  "nav.staffWork": "Staff shifts",
  "nav.users": "Users & roles",
  "nav.studentMarks": "Student marks",
  "nav.studentAttendance": "Student attendance",
  "nav.studentPomodoro": "Student pomodoros",
  "nav.settings": "Settings",
  "nav.terms": "Terms",
  "nav.guide": "Guide",
  "nav.calendar": "Calendar",
  "nav.admin": "Admin",
  "nav.logout": "Log out",
  "nav.menu": "Menu",
  "nav.close": "Close",
  "nav.collapse": "Collapse sidebar",
  "nav.expand": "Expand sidebar",
  "nav.account": "Account",
  "nav.preferences": "Preferences",
  "nav.group.students": "Student management",
  "nav.group.school": "School management",
  "nav.group.classes": "Academics",
  "nav.group.planning": "Planning",
  "nav.group.workspace": "Workspace",
  "nav.group.grades": "Grades",
  "nav.group.community": "Community",
  "nav.group.services": "School services",
  "nav.group.operations": "Operations",
  "nav.group.ai": "AI",
  "nav.group.institution": "Institution",
  "nav.group.myClassroom": "My classroom",
  "nav.group.study": "Study",
  "nav.group.other": "Other",
  "nav.group.myStudent": "My student",
  "nav.group.teaching": "Teaching & content",
  "nav.group.tracking": "Student tracking",
  "nav.studentsRoster": "Students",
  "nav.teachersRoster": "Teachers",
  "nav.schedule": "Class schedule",
  "nav.mySchedule": "My schedule",
  "nav.mockExams": "Mock exams",
  "nav.opticalReading": "Optical reading",
  "nav.hezarfenZeka": "Hezarfen AI",
  "nav.celebi": "Çelebi",
  "nav.soundStudio": "Sound studio",
  "nav.reports": "Reports",
  "nav.licenseModules": "License & modules",
  "nav.dataProtection": "Data protection & audit",
  "nav.schoolMeals": "Cafeteria management",
  "nav.myClasses": "My classes",
  "nav.studentAnalysis": "Student analysis",
  "nav.pendingApprovals": "Pending approvals",
  "nav.questionGeneration": "Question generation",
  "nav.parentCommunication": "Parent communication",
  "nav.studyPlan": "Study plan",
  "nav.topicMastery": "Topic mastery",
  "nav.examResults": "My exam results",
  "nav.myHomework": "My homework",
  "nav.progressReport": "Progress report",
  "nav.absence": "Absence",
  "nav.childExamResults": "Exam results",
  "nav.childStudyPlan": "Study plan",
  "nav.appointmentsAndCommunication": "Appointments & messages",
  "nav.soon": "Coming soon",
  "comingSoon.title": "Coming soon",
  "comingSoon.description": "This module is on its way — there is nothing to show here yet.",
  "comingSoon.emptyTitle": "Not available yet",
  "comingSoon.emptyDescription": "This part of Hezarfen is still being built. Check back soon.",
  "roster.student": "Student",
  "roster.teacher": "Teacher",
  "roster.class": "Class",
  "roster.classAll": "Class: All",
  "roster.term": "Term",
  "roster.termAll": "Term: All",
  "roster.mastery": "Topic mastery",
  "roster.attendance": "Attendance",
  "roster.planAdherence": "Plan adherence",
  "roster.status": "Status",
  "roster.branch": "Branch",
  "roster.weeklyLessons": "Weekly lessons",
  "roster.suggestionAcceptance": "Suggestion acceptance",
  "roster.tabAll": "All",
  "roster.tabActive": "Active",
  "roster.tabNew": "New enrolment",
  "roster.tabAtRisk": "At risk",
  "roster.tabLeft": "Left",
  "roster.tabPermanent": "Permanent",
  "roster.tabContract": "Contract",
  "roster.tabAdvisor": "Advisor",
  "roster.import": "Import",
  "roster.addStudent": "Add student",
  "roster.addTeacher": "Add teacher",
  "roster.studentsSubtitle": "Every student in the school, with their class.",
  "roster.teachersSubtitle": "Every teacher in the school and the classes they lead.",
  "roster.searchStudents": "Search student name or username…",
  "roster.searchTeachers": "Search teacher name or username…",
  "roster.noTeachers": "No teachers yet.",
  "builder.console": "Operator console",
  "builder.logout": "Sign out",
  "builder.loginTitle": "Operator sign-in",
  "builder.loginSubtitle": "Manage the schools on this deployment.",
  "builder.backToSchoolLogin": "Back to school sign-in",
  "builder.operatorLogin": "Operator sign-in",
  "builder.statusActive": "Active",
  "builder.statusSuspended": "Suspended",
  "builder.createSchool": "New school",
  "builder.createSchoolHint": "Creates the school's database and its first admin in one step.",
  "builder.slug": "School code",
  "builder.slugHint": "Lowercase letters, digits and hyphens. Cannot be changed later.",
  "builder.schoolName": "School name",
  "builder.adminUsername": "Admin username",
  "builder.adminPassword": "Admin password",
  "builder.sellEverything": "Enable every module in the catalog",
  "builder.schools": "Schools",
  "builder.schoolsSubtitle": "Every school on this deployment",
  "builder.status": "Status",
  "builder.modules": "Modules",
  "builder.createdAt": "Created",
  "builder.suspend": "Suspend",
  "builder.activate": "Activate",
  "builder.noSchools": "No schools yet.",
  "builder.deleteSchool": "Delete school",
  "builder.deleteSchoolWarning": "All of this school's data and uploaded files are destroyed for good. This cannot be undone.",
  "builder.enterSchool": "Enter school",
  "builder.enterSchoolHint": "Signs this browser in as one of the school's admins for support. Your operator session ends.",
  "builder.enterSuspendedHint": "A suspended school cannot be entered.",
  "builder.resetAdminPassword": "Reset admin password",
  "builder.resetAdminPasswordHint": "Sets a new password for an admin of this school and signs that account out everywhere.",
  "builder.newPassword": "New password",
  "builder.passwordResetDone": "Password reset. That admin's sessions were revoked.",
  "builder.modulesHint": "Changes apply on the school's very next request.",
  "builder.editSchool": "Edit school",
  "builder.editSchoolHint": "Rename the school or change its status.",
  "builder.suspendHint": "Suspension is immediate: every user of the school is refused, login included.",
  "modules.subtitle": "Modular by design: the school has only the components it needs.",
  "modules.readOnlyHint": "Modules are enabled or disabled by your Hezarfen provider.",
  "modules.enabledCount": "{on} of {total} enabled",
  "modules.enableAll": "Enable all",
  "modules.disableAll": "Disable all",
  "modules.requires": "Requires",
  "modules.on": "On",
  "modules.conflictRequires": "{module} needs {needed}, which is not enabled.",
  "modules.conflictRequiredBy": "{module} cannot be turned off: {dependents} depend on it.",
  "modules.module": "Module",
  "modules.active": "Active",
  "modules.unitPrice": "Unit price",
  "modules.activeSeats": "Active seats",
  "modules.annualAmount": "Annual amount",
  "modules.annualTotal": "annual total",
  "modules.tabOverview": "Overview",
  "modules.tabUsage": "Usage",
  "modules.tabInvoices": "Invoices",
  "modules.tabContract": "Contract",
  "modules.downloadInvoices": "Download invoices",
  "modules.addLicense": "Add license",
  "modules.fullPackage": "Full package",
  "modules.customPackage": "Custom package",
  "modules.renewal": "Renewal",
  "modules.recentInvoices": "Recent invoices",
  "modules.off": "Off",
  "module.appointments": "Appointments",
  "module.attendance": "Attendance",
  "module.bank_questions": "Question bank",
  "module.boards": "Board",
  "module.chatbot": "Çelebi assistant",
  "module.classes": "Classes",
  "module.course_notes": "Course notes",
  "module.courses": "Courses",
  "module.events": "Events",
  "module.exams": "Exams",
  "module.homework": "Homework",
  "module.marks": "Marks",
  "module.meals": "Meals",
  "module.messages": "Messages",
  "module.notes": "Notebook",
  "module.payments": "Payments",
  "module.pomodoro": "Pomodoro",
  "module.questions": "Question pool",
  "module.sessions": "Lesson sessions",
  "module.subjects": "Subjects",
  "module.work": "Shift",
  "package.academics": "Academics",
  "package.ai": "AI",
  "package.communication": "Communication",
  "package.operations": "Operations",
  "nav.darkMode": "Dark mode",
  "parents.title": "My Students",
  "parents.subtitle": "Review academic records for the students linked to your account.",
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.create": "Create",
  "common.edit": "Edit",
  "common.done": "Done",
  "common.delete": "Delete",
  "common.update": "Update",
  "common.remove": "Remove",
  "common.back": "Back",
  "common.view": "View",
  "common.reply": "Reply",
  "common.approve": "Approve",
  "common.reject": "Reject",
  "common.action": "Action",
  "common.actions": "Actions",
  "common.columns": "Columns",
  "common.visibleColumns": "Visible columns",
  "common.pageRange": "{start}-{end} of {total}",
  "common.rowsPerPage": "{size} / page",
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
  "confirm.review": "Please review your changes before saving.",
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
  "confirm.removeEventRegistration": "Remove registration for user {user}?",
  "confirm.removeResult": "Remove grade for user {user}?",
  "confirm.updateRole": "Change role of {user} from {from} to {to}?",
  "confirm.gradeStudent": "Grade user {user} with mark {mark}/100?",
  "common.prev": "Previous",
  "common.next": "Next",
  "common.pageOf": "{page} / {total}",
  "common.noResults": "No results.",
  "common.creator": "Created by",
  "common.searchPlaceholder": "Search…",
  "common.all": "All",
  "common.resetFilters": "Reset filters",
  "common.saveAttendance": "Save my attendance",
  "common.created": "Created.",
  "common.deleted": "Deleted.",
  "common.saved": "Saved successfully.",
  "common.createItem": "Create new {item}",
  "common.countItem": "{count} {item}",
  "pool.title": "Question pool",
  "pool.subtitle": "Post questions and discuss solutions with teachers and classmates.",
  "pool.ask": "Ask a question",
  "pool.subject": "Subject",
  "pool.body": "Question details",
  "pool.image": "Attachment (Image)",
  "pool.status": "Status",
  "pool.pending": "Pending",
  "pool.approved": "Approved",
  "pool.author": "Author",
  "pool.solutions": "Solutions",
  "pool.offerSolution": "Offer a solution",
  "pool.noQuestions": "No questions found.",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.toggle": "Toggle theme",
  "lang.en": "English",
  "lang.tr": "Türkçe",
  "lang.label": "Language",
  "auth.login": "Log in",
  "auth.register": "Create account",
  "auth.username": "Username",
  "auth.school": "School",
  "auth.schoolHint": "{min}–{max} characters",
  "auth.password": "Password",
  "auth.noAccount": "New here?",
  "auth.hasAccount": "Already registered?",
  "auth.confirmPassword": "Confirm password",
  "auth.passwordMismatch": "Passwords do not match",
  "auth.loginTitle": "Sign in to your account",
  "auth.loginSubtitle": "Sign in to continue with your school workspace.",
  "auth.chooseSchoolTitle": "Choose your school",
  "auth.chooseSchoolSubtitle": "Select the workspace to open for @{username}.",
  "auth.differentAccount": "Use a different account",
  "auth.registerTitle": "Join Hezarfen",
  "auth.registerSubtitle": "New accounts start as student. Teachers and admins are assigned later.",
  "auth.usernameHint": "3–32 characters",
  "auth.passwordHint": "6–128 characters",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "auth.welcomeBack": "Good to see you again",
  "auth.createStudent": "Create student account",
  "dashboard.greeting": "Hello, {name}",
  "dashboard.subtitle": "A quick overview of what’s happening across your school today.",
  "dashboard.overview": "Overview",
  "dashboard.quickActions": "Quick actions",
  "dashboard.action.note": "New note",
  "dashboard.action.noteHint": "Capture something quickly",
  "dashboard.action.event": "Create event",
  "dashboard.action.eventHint": "Schedule a session",
  "dashboard.action.course": "New education item",
  "dashboard.action.courseHint": "Open an education item",
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
  "command.group.actions": "Quick actions",
  "command.group.people": "Students",
  "command.group.navigation": "Pages & navigation",
  "command.group.system": "System & preferences",
  "command.action.createHomework": "Create homework",
  "command.action.createHomeworkDesc": "Assign new homework for a course",
  "command.action.createCourse": "Create course",
  "command.action.createCourseDesc": "Create a new course in system",
  "command.action.createEvent": "Schedule event",
  "command.action.createEventDesc": "Schedule event or lesson in calendar",
  "command.action.createExam": "Create exam",
  "command.action.createExamDesc": "Prepare new exam for students",
  "command.action.createNote": "Create note",
  "command.action.createNoteDesc": "Save a personal or class note",
  "command.action.importNote": "Import note assistant",
  "command.action.importNoteDesc": "Convert PDF or text files to note",
  "command.action.askQuestion": "Ask / add question",
  "command.action.askQuestionDesc": "Ask question or add to community pool",
  "command.action.askCelebi": "Ask Çelebi AI",
  "command.action.askCelebiDesc": "Chat with smart AI assistant",
  "command.action.myProfile": "My profile",
  "command.action.myProfileDesc": "User account and profile details",
  "command.action.themeDark": "Dark theme",
  "command.action.themeLight": "Light theme",
  "command.action.themeSystem": "System theme",
  "command.action.langTr": "Language: Türkçe",
  "command.action.langEn": "Language: English",
  "command.action.logout": "Log out",
  "command.action.logoutDesc": "Sign out of your account",
  "command.shortcutHint": "Use arrow keys to navigate, press Enter to select",
  "command.key.navigate": "navigate",
  "command.key.select": "select",
  "command.key.close": "close",
  "command.action.themeDarkDesc": "Switch to dark mode",
  "command.action.themeLightDesc": "Switch to light mode",
  "command.action.langTrDesc": "Switch to Turkish",
  "command.action.langEnDesc": "Switch to English",
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
  "dashboard.portal.coursesDesc": "Browse course rosters, subjects, and exams.",
  "dashboard.portal.studiesDesc": "Browse study sessions, rosters, and exams.",
  "dashboard.portal.clubsDesc": "Browse clubs, rosters, and exams.",
  "dashboard.portal.examsDesc": "Course exams, deadlines, and results.",
  "dashboard.portal.eventsDesc": "Events with student attendance records.",
  "dashboard.portal.marksDesc": "Your grades and overall report card.",
  "dashboard.portal.pomodoroDesc": "Track focused study sessions.",
  "dashboard.portal.notesDesc": "Private scratchpad for quick ideas.",
  "dashboard.portal.usersDesc": "Manage user accounts and roles.",
  "dashboard.portal.attendanceDesc": "Review student attendance records.",
  "dashboard.portal.workDesc": "Track your work hours and shifts.",
  "dashboard.portal.studentMarksDesc": "View and grade student results.",
  "dashboard.portal.settingsDesc": "System preferences and configuration.",
  "dashboard.portal.termsDesc": "Manage academic terms and periods.",
  "dashboard.portal.mealsDesc": "Menus, bookings, dietary alerts, and meal balance.",
  "dashboard.highlights": "Highlights",
  "dashboard.progressOverview": "Progress overview",
  "dashboard.progressOverviewDesc": "Your performance across courses.",
  "dashboard.activitySplit": "Attendance split",
  "dashboard.activitySplitDesc": "Your attendance breakdown.",
  "dashboard.successTrend": "Success trend",
  "dashboard.successTrendMine": "Your exam marks over time.",
  "dashboard.successTrendSchool": "Class averages of recent exams.",
  "dashboard.courseAveragesSchool": "Average of recent exams, by course.",
  "dashboard.examGraded": "{count} graded",
  "dashboard.chartExamCount": "Exams",
  "dashboard.chartLatest": "Latest score",
  "dashboard.chartAverage": "Chart average",
  "dashboard.chartRange": "Score range",
  "dashboard.chartLatestExam": "Latest exam",
  "dashboard.focusHeatmap": "Focus activity",
  "dashboard.focusHeatmapDesc": "Your pomodoro sessions, day by day.",
  "dashboard.activityHeatmap": "School activity",
  "dashboard.activityHeatmapDesc": "Exams, events, and homework, day by day.",
  "dashboard.heatmapLess": "Less",
  "dashboard.heatmapMore": "More",
  "dashboard.heatmapFocusDay": "{date}: {count} min focus",
  "dashboard.heatmapFocusEmpty": "{date}: no focus session",
  "dashboard.heatmapRecordDay": "{date}: {count} records",
  "dashboard.heatmapRecordEmpty": "{date}: no records",
  "dashboard.heatmapFocusTotal": "{count} min in the last {weeks} weeks",
  "dashboard.heatmapRecordTotal": "{count} records in the last {weeks} weeks",
  "dashboard.deadlines": "Upcoming deadlines",
  "dashboard.courseAverages": "Course averages",
  "dashboard.chartEmpty": "No records found",
  "dashboard.chartEmptyHint": "Not enough data to display yet.",
  "dashboard.col.task": "Task",
  "dashboard.col.dueDate": "Due date",
  "dashboard.col.type": "Type",
  "dashboard.col.status": "Status",
  "dashboard.type.exam": "Exam",
  "dashboard.type.event": "Event",
  "dashboard.type.payment": "Payment",
  "dashboard.type.appointment": "Appointment",
  "dashboard.type.homework": "Homework",
  "dashboard.stats.attendance": "Attendance",
  "dashboard.stats.homework": "Homework",
  "dashboard.stats.students": "Students",
  "dashboard.stats.children": "Children",
  "dashboard.stats.childAttendance": "Child attendance",
  "dashboard.stats.meals": "Meal menus",
  "dashboard.stats.appointments": "Appointments",
  "dashboard.attend.present": "Present",
  "dashboard.attend.absent": "Absent",
  "dashboard.attend.late": "Late",
  "dashboard.attend.excused": "Excused",
  "dashboard.welcomeBack": "Welcome back, {name}!",
  "dashboard.welcomeHint": "Here's what needs your attention today.",
  "dashboard.quickReview.title": "Quick review",
  "dashboard.quickReview.subtitle": "Refresh what you’ve learned in just two minutes.",
  "dashboard.quickReview.placeholder": "Choose a topic to review…",
  "dashboard.quickReview.practice": "Practice",
  "dashboard.quickReview.startQuiz": "Start quiz",
  "dashboard.analytics": "Analytics",
  "dashboard.hero.heading": "What are we doing today?",
  "dashboard.hero.searchPlaceholder": "Search for a student",
  "dashboard.hero.searchPlaceholderAdmin": "Search students, pages or actions",
  "dashboard.hero.searchPlaceholderAll": "Search pages or actions",
  "dashboard.hero.searchEmpty": "No matching students.",
  "dashboard.teacher.pendingAppointments": "Pending requests",
  "dashboard.teacher.pendingAppointmentsDesc": "Appointment requests waiting on you.",
  "dashboard.teacher.pendingAppointmentsEmpty": "No pending requests.",
  "dashboard.teacher.schedule": "Today's schedule",
  "dashboard.teacher.classPerformance": "Class performance",
  "dashboard.student.thisWeek": "This week",
  "dashboard.student.thisWeekDesc": "Focus minutes, Monday to Sunday.",
  "dashboard.student.thisWeekTotal": "{minutes} min this week",
  "dashboard.student.todayPlan": "Today's plan",
  "dashboard.student.mastery": "Topic mastery",
  "dashboard.student.audioWorkshop": "Audio workshop",
  "dashboard.parent.progress": "Progress",
  "dashboard.parent.teacherNotes": "Teacher notes",
  "dashboard.parent.child": "Child",
  "dashboard.parent.homeroom": "Homeroom teacher: {name}",
  "dashboard.parent.attendanceDetail": "Attendance",
  "dashboard.parent.attendanceDetailDesc": "This child's attendance breakdown.",
  "dashboard.parent.attendanceRate": "Attendance rate",
  "dashboard.parent.payment": "Payment status",
  "dashboard.parent.paymentDesc": "This child's fee plan.",
  "dashboard.parent.paymentEmpty": "No fee plan assigned.",
  "dashboard.parent.installmentsPaid": "{paid} / {total} installments paid",
  "dashboard.parent.nextInstallment": "Next installment",
  "dashboard.parent.balance": "Balance",
  "dashboard.quicklinks.students": "Students",
  "dashboard.quicklinks.classes": "Classes",
  "dashboard.quicklinks.modules": "Modules",
  "dashboard.quicklinks.empty": "Nothing here yet.",
  "dashboard.admin.rangeThisMonth": "This month",
  "courseNotes.title": "Lesson notes",
  "courseNotes.item": "lesson note",
  "courseNotes.new": "New lesson note",
  "courseNotes.add": "Add note",
  "courseNotes.empty": "No notes on this course yet.",
  "courseNotes.emptyManageHint": "Write a note the whole class can read, and attach files to it.",
  "courseNotes.ragTitle": "AI outputs",
  "courseNotes.ragEmpty": "No AI outputs on this note yet.",
  "notes.title": "Notebook",
  "notes.subtitle": "Your private notebook for class ideas and reminders.",
  "notes.new": "New note",
  "notes.write": "Write",
  "notes.preview": "Preview",
  "notes.empty": "Nothing here yet. Write your first note.",
  "notes.noContent": "No content",
  "notes.files": "Attachments",
  "notes.filesHelp": "Up to 10 files. Max {size} each.",
  "notes.addFile": "Add file",
  "notes.import": "Import",
  "notes.importHelp": "Upload a PDF, TXT, or Markdown file. Line breaks, page numbers, and noise will be automatically cleaned into a structured note.",
  "notes.importReadError": "Text could not be extracted from this file. If it is a scanned PDF, run OCR first.",
  "notes.draw": "Draw",
  "notes.drawTitle": "Draw a picture",
  "draw.pen": "Pen",
  "draw.eraser": "Eraser",
  "draw.pan": "Move around",
  "draw.zoomIn": "Zoom in",
  "draw.zoomOut": "Zoom out",
  "draw.resetZoom": "Reset zoom",
  "draw.color": "Colour",
  "draw.width": "Line thickness",
  "draw.paper": "Paper",
  "draw.undo": "Undo",
  "draw.clear": "Clear all",
  "draw.save": "Save drawing",
  "draw.hint": "Draw here with your finger, pen, or mouse.",
  "draw.downloadPng": "Download PNG",
  "draw.downloadJpeg": "Download JPEG",
  "draw.bgNone": "Plain",
  "draw.bgLines": "Lines",
  "draw.bgGrid": "Grid",
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
  "events.subtitle": "See all school events and their student attendance records in one place.",
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
  "events.registrationRoster": "Registration list",
  "events.registrationRosterHelp": "Add students before attendance and review who is expected for this event.",
  "events.registerStudent": "Register student",
  "events.unregister": "Remove registration",
  "events.noRoster": "No students registered yet.",
  "events.notMarked": "Not marked",
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
  "calendar.title": "Calendar",
  "calendar.today": "Today",
  "calendar.noEvents": "Nothing scheduled on this day.",
  "calendar.events": "Events",
  "calendar.exams": "Exams",
  "calendar.appointments": "Appointments",
  "calendar.lessons": "Lessons",
  "calendar.studies": "Studies & clubs",
  "calendar.homework": "Homework due",
  "calendar.viewDay": "Day",
  "calendar.viewWeek": "Week",
  "calendar.viewMonth": "Month",
  "nav.appointments": "Appointments",
  "appointments.title": "Appointments",
  "appointments.subtitle": "Pick one of the times a teacher opened for meetings, then follow your request here.",
  "appointments.subtitleStaff": "Open the hours you can meet, then approve or decline the requests that come in.",
  "appointments.myBookingsHint": "Meetings you booked or asked for, and where each request stands.",
  "appointments.requestsHint": "Requests from students and parents waiting on your answer.",
  "appointments.availableSlotsHint": "Hours teachers opened for meetings. Pick one to send a booking request.",
  "appointments.mySlotsHint": "Hours you opened. Anyone who picks one reaches you as a request.",
  "appointments.empty": "No appointments yet.",
  "appointments.mySlots": "Times I opened",
  "appointments.availableSlots": "Teachers’ open times",
  "appointments.requests": "Booking requests",
  "appointments.myBookings": "My bookings",
  "appointments.publish": "Open a time",
  "appointments.book": "Book",
  "appointments.approve": "Approve",
  "appointments.reject": "Reject",
  "appointments.cancel": "Cancel",
  "appointments.reschedule": "Propose new time",
  "appointments.acceptReschedule": "Accept new time",
  "appointments.declineReschedule": "Decline new time",
  "appointments.deleteSlot": "Delete this time",
  "appointments.deleteSeries": "Delete whole series",
  "appointments.note": "Note",
  "appointments.reason": "Reason",
  "appointments.repeatWeekly": "Repeat weekly",
  "appointments.until": "Repeat until",
  "appointments.starts": "Start",
  "appointments.ends": "End",
  "appointments.teacher": "Teacher",
  "appointments.student": "Requested by",
  "appointments.proposedTime": "Proposed time",
  "appointments.newTime": "New time",
  "appointments.status.pending": "Pending",
  "appointments.status.approved": "Approved",
  "appointments.status.rejected": "Rejected",
  "appointments.status.cancelled": "Cancelled",
  "appointments.confirmCancel": "Cancel this appointment? This cannot be undone.",
  "appointments.confirmDeleteSlot": "Delete this available time? Any pending request for it will be dropped.",
  "appointments.confirmDeleteSeries": "Delete the whole weekly series? All of its times will be removed.",
  "appointments.rescheduleProposed": "A new time has been proposed and is waiting for the requester to accept.",
  "appointments.slotTaken": "This time was just taken by someone else. Please pick another.",
  "appointments.noSlots": "No available times right now.",
  "appointments.series": "Series",
  "appointments.time": "Time",
  "appointments.status": "Status",
  "appointments.publishSubtitle": "Offer a time window students can book. Repeat it weekly if you like.",
  "appointments.bookSubtitle": "Tell the teacher why you would like to meet.",
  "appointments.rescheduleSubtitle": "Propose a different time; the requester can accept or decline it.",
  "appointments.reasonPlaceholder": "What would you like to talk about?",
  "appointments.notePlaceholder": "Optional note for students (e.g. topic, location).",
  "appointments.noRequests": "No booking requests.",
  "appointments.noBookings": "You have no bookings yet.",
  "appointments.repeatWeeklyHelp": "Creates the same time every week until the chosen date (max 52 times).",
  "appointments.untilRequired": "Pick a date to repeat until.",
  "appointments.tooManyOccurrences": "This range would create {count} weekly slots; the limit is {max}. Choose an earlier end date.",
  "appointments.cancelTitle": "Cancel appointment?",
  "appointments.cancelAction": "Yes, cancel",
  "appointments.cancelReasonLabel": "Reason (optional)",
  "appointments.cancelReasonPlaceholder": "Why are you cancelling?",
  "appointments.cancelledBy": "Cancelled by",
  "appointments.details": "Details",
  "appointments.cancelReason": "Cancellation reason",
  "appointments.rejectTitle": "Reject booking?",
  "appointments.rejectAction": "Reject",
  "appointments.confirmReject": "Reject this booking request? The slot frees up for others.",
  "appointments.rejectReasonLabel": "Reason (optional)",
  "appointments.rejectReasonPlaceholder": "Why are you rejecting?",
  "appointments.rejectReason": "Rejection reason",
  "appointments.rejectedBy": "Rejected by",
  "appointments.reasonRequired": "Please give a reason for the meeting.",
  "events.clearStart": "Will clear start time",
  "events.clearEnd": "Will clear end time",
  "events.upcoming": "Upcoming",
  "events.past": "Past",
  "exams.title": "Exams",
  "exams.subtitle": "Every exam across your classes. Create a new exam from within its class.",
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
  "exams.details": "Exam details",
  "exams.schedule": "Schedule",
  "exams.examStatistics": "Exam statistics",
  "exams.examQuestions": "Exam questions",
  "exams.studentResults": "Student grades",
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
  "exams.attemptsLeft": "Remaining",
  "exams.retakes": "Retakes",
  "exams.retakesHelp": "Students can retake the exam this many times before the window closes.",
  "exams.allowRejoin": "Allow rejoin",
  "exams.allowRejoinHelp": "If off, a student who leaves the exam room cannot return to answer.",
  "exams.allowReview": "Let students review their answers",
  "exams.allowReviewHelp": "Students can see their own paper and past attempts once you've marked this exam.",
  "exams.draft": "Draft",
  "exams.draftHelp": "Keep hidden from students until published.",
  "exams.publish": "Publish exam",
  "exams.published": "Exam published",
  "exams.startTime": "Start time",
  "exams.endTime": "End time",
  "exams.scheduleRequired": "Sync/Async exams require a start and end time",
  "exams.step1Details": "1. Exam details",
  "exams.step2Questions": "2. Questions",
  "exams.hasDuration": "Enable time limit",
  "exams.hasDurationHelp": "Sets how many minutes students get in the exam room.",
  "exams.accessAndAttempts": "Access & attempts",
  "exams.singleAttempt": "Single attempt (1)",
  "exams.multipleAttempts": "Multiple attempts",
  "exams.finishAndClose": "Finish & close",
  "exams.nextQuestions": "Save & add questions",
  "exams.sectionBasic": "Basic information",
  "exams.sectionSchedule": "Schedule & mode",
  "exams.sectionDuration": "Time limit",
  "exams.sectionAccess": "Participation & attempts",
  "exams.times": "times",
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
  "questions.image": "Question image",
  "questions.draw": "Draw the image",
  "questions.drawTitle": "Draw the question image",
  "questions.editDrawing": "Edit drawing",
  "questions.choiceImage": "Choice image",
  "questions.subjectRequired": "Select a subject for this question",
  "questions.subjectUnavailable": "Current subject — no longer available to you",
  "questions.subjectUnavailableHelp": "The subject saved on this question is not in the list you can pick from. Choose a subject from the list to save.",
  "questions.textRequired": "Question text is required",
  "questions.pointsRange": "Points must be an integer from 1 to 100",
  "questions.choicesRange": "Choice questions need 2–10 choices, each at most 500 characters",
  "questions.correctRequired": "Mark one choice as the correct answer before saving.",
  "questions.correctRange": "Correct index must point to one of the choices",
  "bank.title": "Question bank",
  "bank.subtitle": "Shared, reusable question templates that any teacher can add to an exam.",
  "bank.empty": "No templates yet.",
  "bank.create": "New template",
  "bank.edit": "Edit template",
  "bank.owner": "Added by",
  "bank.mine": "Mine",
  "bank.usedCount": "Used",
  "bank.created": "Created",
  "bank.copyNotice": "Adding a template to an exam makes a copy. Editing the template later does not change questions already added.",
  "bank.courseSelect": "Select course",
  "bank.courseUnavailable": "Original course — not one of your courses",
  "bank.targetSubjectHint": "Pick the subject this copy belongs to in this exam.",
  "bank.courseHint": "Templates are tagged with a subject, so pick the course that subject belongs to. The template stays usable in every course.",
  "bank.fromBank": "Add from bank",
  "bank.pickTemplate": "Pick a template",
  "bank.targetSubject": "Subject in this exam",
  "bank.insert": "Add to exam",
  "bank.inserted": "Question copied from the bank.",
  "bank.saveToBank": "Save to bank",
  "bank.saveCopyToBank": "Save another copy to bank",
  "bank.saveCopyTitle": "Save a second copy?",
  "bank.saveCopyBody": "This question is already linked to a bank template. Saving creates a second, separate template instead of updating the existing one. The two copies are independent: editing one never changes the other. The new template is private: only you can see it until you choose to share it.",
  "bank.saveCopyConfirm": "Save another copy",
  "bank.savedToBank": "Question copied to the bank. Only you can see it until you share it.",
  "bank.fromBankBadge": "Added from bank",
  "bank.savedToBankBadge": "Saved to bank",
  "bank.search": "Search question text",
  "bank.pickerEmpty": "No matching template.",
  "bank.noSubjects": "This exam's course has no subjects yet. Add a subject to the course first.",
  "bank.countTotal": "{total} templates in total.",
  "bank.countShown": "Showing {shown} of {total} — search to narrow it down.",
  "bank.whoCanSee": "Who can see it",
  "bank.onlyMe": "Only me",
  "bank.sharedWithSchool": "Shared with the school",
  "bank.onlyMeHint": "Only you can see this question and its answer. This is the safe choice.",
  "bank.sharedWithSchoolHint": "Every teacher in the school can see this question and its correct answer.",
  "bank.shareTitle": "Share this question with the whole school?",
  "bank.shareBody": "Every teacher in the school will be able to see this question and its correct answer. If the question is on an exam that has not finished yet, they can see the answer before your students sit it. Other teachers can copy it into their own exams, and those copies stay with them even if you make the question private again or delete it. You cannot take a copy back.",
  "bank.shareConfirm": "Yes, share it",
  "bank.startsPrivate": "The saved template starts private: only you can see it until you choose to share it.",
  "bank.usedInExams": "Copies in exams",
  "bank.refresh": "Update from template",
  "bank.refreshTitle": "Update this question from its template?",
  "bank.refreshBody": "This question is a copy made from a bank template. Updating replaces its text, points, options, correct answer and pictures with what the template says today. Anything you changed on this copy is lost. It only works before anyone starts the exam, so no student's answers can be affected.",
  "bank.difficulty": "Difficulty",
  "bank.correctRate": "Correct rate",
  "bank.objective": "Objective",
  "bank.source": "Source",
  "bank.source.institution": "Institution",
  "bank.source.publisher": "Publisher",
  "bank.source.ai": "AI-generated",
  "bank.refreshConfirm": "Yes, update it",
  "bank.refreshed": "Question updated from its template.",
  "subjects.title": "Subjects",
  "subjects.item": "Subject",
  "subjects.subject": "Subject",
  "subjects.name": "Subject name",
  "subjects.add": "Add subject",
  "subjects.edit": "Edit subject",
  "subjects.empty": "No subjects yet.",
  "subjects.select": "Select subject",
  "subjects.help": "Curriculum topics for this education item. Every exam question must be tagged with one.",
  "pomodoro.title": "Pomodoro",
  "pomodoro.subtitle": "Run focused study sessions and track the time you spend.",
  "pomodoro.total": "Total focus",
  "pomodoro.running": "Running",
  "pomodoro.idle": "Idle",
  "pomodoro.start": "Start focus",
  "pomodoro.finish": "Finish focus",
  "pomodoro.started": "Focus session started.",
  "pomodoro.finished": "Focus session finished.",
  "pomodoro.history": "Recent sessions",
  "pomodoro.empty": "No focus sessions yet.",
  "pomodoro.lookup": "Select a student to review their pomodoro focus history.",
  "pomodoro.forUser": "Pomodoros for {user}",
  "pomodoro.startedAt": "Started",
  "pomodoro.finishedAt": "Finished",
  "pomodoro.duration": "Duration",
  "pomodoro.sessionLabel": "Focus label",
  "pomodoro.sessionLabelPlaceholder": "What are you working on?",
  "pomodoro.counted": "Counts",
  "pomodoro.countedYes": "Counted",
  "pomodoro.countedNo": "Not counted",
  "pomodoro.focusConsole": "Focus console",
  "pomodoro.current": "Current focus",
  "pomodoro.today": "Today",
  "pomodoro.average": "Average",
  "pomodoro.sessions": "Sessions",
  "pomodoro.idleHelp": "Ready when you are. Start one focused study block.",
  "pomodoro.runningSince": "Started {time}",
  "pomodoro.lastSession": "Last finished {time}",
  "pomodoro.noRecentSession": "No completed session yet.",
  "pomodoro.remaining": "Time remaining",
  "pomodoro.overtime": "Overtime",
  "pomodoro.targetReached": "Time's up! Wrap up or keep going.",
  "pomodoro.customMinutes": "Custom (min)",
  "attempt.title": "Exam room",
  "attempt.openRoom": "Open exam room",
  "attempt.start": "Start exam",
  "attempt.resume": "Resume exam",
  "attempt.finish": "Finish exam",
  "attempt.finishConfirm": "Yes, finish exam",
  "attempt.finishHint": "This ends the exam and turns in your answers. You can't change them afterwards.",
  "attempt.status": "Status",
  "attempt.remaining": "Remaining",
  "attempt.attempt": "Attempt",
  "attempt.left": "Left",
  "attempt.progress": "Progress",
  "attempt.deadline": "Deadline",
  "attempt.notStarted": "Start the scheduled exam to see questions.",
  "attempt.unscheduled": "This exam is not scheduled for online sitting.",
  "attempt.saved": "Saved",
  "attempt.saving": "Saving…",
  "attempt.notSaved": "Not saved",
  "attempt.notSavedHint": "Your answer was not saved. It is still written here — press \"Save answer again\" to try once more.",
  "attempt.saveTimeout": "The exam did not confirm your answer, so it is not saved yet. Your answer is still on screen — please try saving again.",
  "attempt.saveDisconnected": "The connection dropped before your answer was saved. Your answer is still on screen — please try saving again.",
  "attempt.saveAnswerRetry": "Save answer again",
  "attempt.savedAt": "Saved at",
  "attempt.serverNow": "Server time",
  "attempt.mark": "Mark",
  "attempt.saveAnswer": "Save answer",
  "attempt.submitted": "Submitted",
  "attempt.submittedCanRetakeInfo": "You have submitted this attempt. You can take the exam again using your remaining attempts.",
  "attempt.submittedFinalInfo": "You have submitted this exam. It cannot be reopened.",
  "attempt.submittedAt": "Submitted at",
  "exams.startsAt": "Start date",
  "exams.endsAt": "End date",
  "attempt.expired": "Expired",
  "attempt.expiredInfo": "The time for this exam has expired. It cannot be reopened.",
  "attempt.noAttemptsLeft": "No rights left",
  "attempt.closed": "This attempt is closed. Answers are read-only.",
  "attempt.inProgress": "In progress",
  "attempt.absent": "No-show",
  "exams.helpTitle": "About exams",
  "exams.helpBody":
    "Exams belong to an education item. Teachers add them from that detail page with a kind; weighting is defined by the exam kind. Students only see their own mark (or “not graded yet”). Weighted averages appear on the report card.",
  "admin.title": "People & roles",
  "admin.subtitle": "Promote or demote accounts. You cannot change your own role.",
  "admin.tabAll": "All users",
  "admin.tabManagers": "Managers",
  "admin.tabTeachers": "Teachers",
  "admin.tabParents": "Parents",
  "admin.tabStudents": "Students",
  "admin.tabInvites": "Invites",
  "admin.inviteUser": "Invite user",
  "admin.username": "Username",
  "admin.id": "Id",
  "admin.role": "Role",
  "admin.directory": "Directory",
  "admin.helpTitle": "Role hierarchy",
  "admin.helpBody":
    "student < teacher < manager < admin. Higher roles inherit lower permissions. Registration always creates a student. Only admins list users and change roles.",
  "admin.noUsers": "No users registered yet.",
  "guide.title": "Product guide",
  "guide.subtitle": "How the platform fits together, from classes and exams to report cards, notes, and events.",
  "guide.roles.title": "Role permission map",
  "guide.roles.subtitle": "What each role on the platform can reach and manage.",
  "guide.roles.adminTab": "Manager & admin",
  "guide.roles.student.heading": "Student study and participation tools",
  "guide.roles.student.i1": "Keep notes in a private notebook, import PDFs and draw",
  "guide.roles.student.i2": "Ask in the question pool and write solutions for others",
  "guide.roles.student.i3": "Enter the exam room for enrolled courses and sit timed exams",
  "guide.roles.student.i4": "Follow their own report-card average and attendance",
  "guide.roles.teacher.heading": "Teacher management and teaching panel",
  "guide.roles.teacher.i1": "Create courses, study sessions and clubs, and enrol students",
  "guide.roles.teacher.i2": "Take roll call in lesson sessions (present, absent, late, excused)",
  "guide.roles.teacher.i3": "Create exams, add questions and run live exam monitoring",
  "guide.roles.teacher.i4": "Review answer sheets, award marks and confirm report cards",
  "guide.roles.parent.heading": "Parent tracking and information portal",
  "guide.roles.parent.i1": "Follow linked students' attendance records as they happen",
  "guide.roles.parent.i2": "See a student's per-course report-card averages",
  "guide.roles.parent.i3": "Follow the upcoming exam and event calendar",
  "guide.roles.parent.i4": "Message teachers and the school office directly",
  "guide.roles.admin.heading": "Manager and system policy panel",
  "guide.roles.admin.i1": "Create accounts and assign their roles (student, teacher, parent)",
  "guide.roles.admin.i2": "Define academic terms, exam kinds and their weights",
  "guide.roles.admin.i3": "Manage every course and event record at audit level",
  "guide.roles.admin.i4": "Review staff work logs and system records",
  "guide.modules.title": "Core flows and features",
  "guide.modules.subtitle": "The platform's main modules and how each one is used.",
  "guide.step.ai.badge": "AI",
  "guide.step.ai.title": "Çelebi AI assistant",
  "guide.step.ai.description": "The assistant reachable from every page through “Ask Çelebi” in the top bar. It answers about your campus data, your course topics and the system itself.",
  "guide.step.ai.cta": "Try Çelebi",
  "guide.step.ai.f1": "One click from every page",
  "guide.step.ai.f2": "Campus and course-aware answers",
  "guide.step.ai.f3": "Contextual study guidance",
  "guide.step.notes.badge": "Notes and drawing",
  "guide.step.notes.title": "Smart notebook and drawing canvas",
  "guide.step.notes.description": "Turn PDF, TXT and Markdown material into clean Markdown notes. Add freehand sketches and diagrams with the built-in .hzdraw canvas.",
  "guide.step.notes.cta": "Go to notes",
  "guide.step.notes.f1": "Automatic PDF and TXT converter",
  "guide.step.notes.f2": "Built-in .hzdraw freehand canvas",
  "guide.step.notes.f3": "Markdown formatting and an OCR warning",
  "guide.step.questions.badge": "Question pool",
  "guide.step.questions.title": "Question pool and solutions",
  "guide.step.questions.description": "Share your questions in the community pool and add written or multiple-choice solutions. Teacher-approved solutions mark the answer to trust.",
  "guide.step.questions.cta": "Question pool",
  "guide.step.questions.f1": "Written and multiple-choice solutions",
  "guide.step.questions.f2": "Teacher-approved solution badge",
  "guide.step.questions.f3": "Filterable topic and status categories",
  "guide.step.courses.badge": "Courses and study",
  "guide.step.courses.title": "Courses, study sessions and clubs",
  "guide.step.courses.description": "The course, study-session and club programme. Teachers enrol students, take lesson roll call (present, absent, late, excused) and follow the syllabus.",
  "guide.step.courses.cta": "My courses",
  "guide.step.courses.f1": "Student enrolment management",
  "guide.step.courses.f2": "Roll call as the session runs",
  "guide.step.courses.f3": "Exam and study calendar alignment",
  "guide.step.exams.badge": "Exam room",
  "guide.step.exams.title": "Exam room and live monitoring",
  "guide.step.exams.description": "A live exam room with a countdown and autosave. Teachers follow answer sheets and instant marking suggestions from the live monitor.",
  "guide.step.exams.cta": "Exam room",
  "guide.step.exams.f1": "Countdown synced to the server clock",
  "guide.step.exams.f2": "WebSocket and REST autosave",
  "guide.step.exams.f3": "Live teacher monitoring and marking",
  "guide.step.marks.badge": "Report card",
  "guide.step.marks.title": "Report card and progress",
  "guide.step.marks.description": "Term course averages and an overall score computed from exam-kind weights, alongside attendance statistics.",
  "guide.step.marks.cta": "My report card",
  "guide.step.marks.f1": "Weighted exam average",
  "guide.step.marks.f2": "Attendance and excuse summaries",
  "guide.step.marks.f3": "Detailed charts and course reports",
  "guide.tips.title": "Practical tips and shortcuts",
  "guide.tips.subtitle": "Small things that make the platform quicker to work with.",
  "guide.tips.locale.title": "Language and theme",
  "guide.tips.locale.body": "Open the account menu at the bottom of the sidebar to switch between Turkish and English, and between the light and dark themes.",
  "guide.tips.sync.title": "Automatic saving",
  "guide.tips.sync.body": "Your exam-room answers and canvas drafts are saved in the background against the server clock.",
  "guide.tips.import.title": "Quick note import",
  "guide.tips.import.body": "Use the import button on the notes page to turn PDF and TXT course documents into clean Markdown.",
  "guide.tips.weights.title": "Weighted marking",
  "guide.tips.weights.body": "Exam results feed your report-card average using the exam-kind weights the school office defines.",
  "guide.rolesTitle": "Who can do what?",
  "guide.rolesBody":
    "Student: notes, events attendance, view courses/exams, own results & report card. Teacher: create courses/events, enroll, add exams, grade. Manager: manage any course/event. Admin: user roles.",
  "guide.tipsTitle": "Tips",
  "courses.helpTitle": "About education",
  "courses.helpBody":
    "Education items can be courses, study sessions, or clubs. Teachers enroll students and add exams here; exam kind weights drive averages. Deleting one removes its exams, results, and enrollments.",
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
  "form.noTeachers": "No available teachers",
  "form.searchNoPermission": "You do not have permission to search users.",
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
  "role.parent": "Parent",
  "role.teacher": "Teacher",
  "role.manager": "Manager",
  "role.admin": "Admin",
  "courses.title": "Education",
  "courses.listTitle": "{item} records",
  "courses.subtitle": "Manage {item}, enrollment, and exams in one place.",
  "courses.pageSubtitle": "Classes, study groups, and clubs, all in one place.",
  "courses.create": "New education item",
  "courses.empty": "No {item} yet.",
  "courses.enrolled": "Enrolled",
  "courses.roster": "Roster",
  "courses.rosterItem": "Student",
  "courses.enroll": "Enroll student",
  "courses.exams": "Course exams",
  "courses.examItem": "Exam",
  "courses.addExam": "Add exam",
  "courses.weight": "Weight",
  "courses.delete": "Delete course",
  "courses.kind": "Course type",
  "courses.kind.course": "Classes",
  "courses.kind.study": "Study",
  "courses.kind.club": "Club",
  "courses.kind.courseSingular": "Class",
  "courses.kind.studySingular": "Study session",
  "courses.kind.clubSingular": "Club",
  "courses.capacity": "Capacity",
  "courses.unlimited": "Unlimited",
  "courses.capacityOptional": "Optional seat cap",
  "courses.teachers": "Teachers",
  "courses.assignTeacher": "Assign teacher",
  "courses.unassignTeacher": "Unassign teacher",
  "courses.confirmUnassignTeacher": "Are you sure you want to remove this teacher from the course?",
  "courses.teacherAssigned": "Teacher assigned successfully.",
  "courses.teacherUnassigned": "Teacher unassigned successfully.",
  "courses.noTeachers": "No assigned teachers.",
  "courses.overview": "Overview",
  "courses.work": "Work",
  "courses.people": "People",
  "courses.upcoming": "Upcoming work",
  "courses.noUpcoming": "No upcoming work.",
  "courses.nextExam": "Next exam",
  "courses.nextHomework": "Next homework",
  "courses.weeklyHours": "Weekly hours",
  "courses.competency": "Competency",
  "courses.attendanceRate": "Attendance",
  "courses.progress": "Progress",
  "courses.takeAttendance": "Take roll call",
  "courses.analysis": "Analysis",
  "homework.title": "Homework",
  "homework.item": "Homework",
  "homework.add": "Add homework",
  "homework.edit": "Edit homework",
  "homework.empty": "No homework yet.",
  "homework.help": "Assign homework for this course and track its due date.",
  "homework.listHelp": "All visible homework. Open a row to manage it in its course.",
  "homework.dueAt": "Due date",
  "homework.assigned": "Assigned to",
  "homework.wholeCourse": "Whole course",
  "homework.wholeCourseHelp": "This first version assigns homework to the whole course. Use the backend API for student subsets until the multi-select UI exists.",
  "homework.dueRequired": "Choose a valid due date and time.",
  "homework.mineTitle": "My homework",
  "homework.submit": "Submit homework",
  "homework.submitHelp": "Save a text answer and attach files if needed.",
  "homework.withdraw": "Withdraw submission",
  "homework.withdrawHint": "Deletes your answer and every attached file. Not possible once the homework is graded.",
  "homework.answerPlaceholder": "Write an optional answer...",
  "homework.fileUploaded": "File uploaded.",
  "homework.submittedAt": "Submitted at",
  "homework.late": "Late",
  "homework.submission": "Submission",
  "homework.submissions": "Submissions",
  "homework.submissionsHelp": "Review student submissions and record the result.",
  "homework.submitted": "Submitted",
  "homework.notSubmitted": "Not submitted",
  "homework.tab.todo": "To do",
  "homework.tab.submitted": "Submitted",
  "homework.tab.graded": "Graded",
  "homework.tab.open": "Open",
  "homework.tab.past": "Past due",
  "homework.result": "Result",
  "homework.grade": "Grade",
  "homework.ungrade": "Ungrade",
  "homework.student": "Student",
  "homework.noAnswer": "No text answer.",
  "homework.status.done": "Done",
  "homework.status.incomplete": "Incomplete",
  "homework.status.missing": "Missing",
  "marks.title": "Report card",
  "marks.subtitle": "Your weighted grade averages across every course you’re enrolled in.",
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
  "marks.tabGeneral": "General",
  "marks.tabByCourse": "By course",
  "marks.selectCourse": "Course",
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
  "exams.liveMonitor": "Live monitor",
  "exams.liveMonitorDesc": "Real-time exam roster, progress, and marks.",
  "exams.finalState": "Final state",
  "exams.finalStateDesc": "Final exam results, progress, and marks.",
  "exams.liveRoster": "Live roster",
  "exams.notStarted": "Not started",
  "exams.lastActivity": "Last activity",
  "exams.answerSheet": "Answer Sheet",
  "exams.autoScore": "Auto-score",
  "exams.answersRight": "Correct",
  "exams.answersWrong": "Wrong",
  "exams.answersEmpty": "Empty",
  "exams.answersPending": "Ungraded",
  "exams.earned": "Earned",
  "exams.possible": "Possible",
  "exams.isCorrect": "Correct",
  "exams.textAnswer": "Text answer",
  "exams.drawAnswer": "Draw answer",
  "exams.previousAttempts": "Previous attempts",
  "exams.attemptN": "Attempt {n}",
  "exams.markHistory": "Mark history",
  "exams.currentAttempt": "current",
  "exams.pastAttemptReadOnly": "Viewing a previous attempt — read-only. Grading applies to the current attempt.",
  "exams.reviewInProgress": "Submit your current attempt before you can review it.",
  "exams.uploadAnswerImage": "Upload image",
  "exams.playDrawing": "Play drawing",
  "exams.showImage": "Show image",
  "exams.play": "Play",
  "exams.pause": "Pause",
  "exams.restart": "Restart",
  "exams.editDrawing": "Edit drawing",
  "exams.removeDrawing": "Remove drawing",
  "exams.nameless": "Unnamed",
  "exams.emptyRoster": "No enrolled students yet.",
  "exams.selectStudent": "Select a student from the roster",
  "exams.viewSheet": "View answers",
  "profile.title": "Profile",
  "profile.subtitle": "Your personal information. All fields are optional.",
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
  "course.fromClass": "from {name}",
  "course.removeStudentConfirm": "Are you sure you want to remove",
  "events.userIdRequired": "Please select a student first.",
  "settings.title": "School settings",
  "settings.subtitle": "Configure exam types, attendance statuses, and grade bands used across the school.",
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
  "settings.maxFileSizeHelp": "Per-file upload cap for note attachments, in MiB. Allowed range: 0.001–25 MiB.",
  "whiteboard.participantCount": "Participants: {count}",
  "settings.maxFileSizeInvalid": "Enter a valid file size.",
  "settings.mealSlotNameInvalid": "A meal slot name can't contain / \\ ? # or %.",
  "settings.aiPolicy": "AI policy",
  "settings.aiPolicyHelp": "Limits for conversation context, threads, and message length.",
  "settings.modules": "Modules",
  "settings.modulesHelp": "Features your school has switched on, grouped by package. Switched-off features stay hidden in navigation.",
  "settings.chatHistory": "History turns",
  "settings.chatThreads": "Maximum threads",
  "settings.chatMessage": "Message length",
  "settings.foodPolicy": "Food policy",
  "settings.foodPolicyHelp": "Meal slots use UTC serving times. Empty lists disable the meal program.",
  "settings.mealCutoff": "Booking/cancellation cutoff (minutes)",
  "settings.noCutoff": "No cutoff",
  "settings.mealSlot": "Meal slot",
  "settings.servingTimeUtc": "Serving time (UTC)",
  "settings.addMealSlot": "Add meal slot",
  "settings.dietaryTags": "Dietary tags",
  "settings.addDietaryTag": "Add dietary tag",
  "settings.tabAssessment": "Assessment",
  "settings.tabMeals": "Meals",
  "settings.tabSystem": "System",
  "settings.tabAppearance": "Appearance",
  "settings.colorPalette": "Colour palette",
  "settings.colorPaletteHelp": "Choose an accent from Coolors trending palettes. Saved only in this browser.",
  "settings.colorPaletteSource": "Browse trending palettes",
  "settings.defaultColor": "Use default colour",
  "meals.title": "Meals",
  "meals.subtitle": "Browse menus by date, manage dietary requirements, and track meal accounts.",
  "meals.publish": "Publish menu",
  "meals.publishHelp": "One menu per date and meal slot.",
  "meals.date": "Menu date",
  "meals.slot": "Meal slot",
  "meals.capacity": "Capacity",
  "meals.reservations": "Reservations",
  "meals.from": "Starting date",
  "meals.empty": "No menus in this date range.",
  "meals.dishes": "dishes",
  "meals.conflict": "Dietary warning",
  "meals.topPick": "Most picked",
  "meals.menu": "Menu",
  "meals.detailHelp": "Dishes, booking state, dietary warnings, service, and account records.",
  "meals.total": "Total price",
  "meals.cutoff": "Cutoff",
  "meals.noCutoff": "No cutoff",
  "meals.bookingStatus": "Booking",
  "meals.closed": "Closed",
  "meals.open": "Open",
  "meals.child": "Child",
  "meals.myAccount": "Account",
  "meals.service": "Service register",
  "meals.manage": "Manage",
  "meals.noDishes": "No dishes have been added.",
  "meals.booked": "Booked",
  "meals.notBooked": "Not booked",
  "meals.cutoffPassed": "The booking and cancellation cutoff has passed.",
  "meals.bookingHelp": "The backend confirms capacity, cutoff, conflicts, and price.",
  "meals.book": "Book seat",
  "meals.cancelBooking": "Cancel booking",
  "meals.cancelSummary": "Cancellation releases the seat and appends an exact reversal of the original charge. It is refused after cutoff.",
  "meals.cancelled": "Booking cancelled.",
  "meals.dietaryProfile": "Dietary profile",
  "meals.noDietaryNotes": "No dietary notes recorded.",
  "meals.balance": "Balance",
  "meals.ledger": "Ledger",
  "meals.ledger.charge": "Meal charge",
  "meals.ledger.credit": "Credit",
  "meals.ledger.reversal": "Refund",
  "meals.noLedger": "No ledger entries.",
  "meals.attendance": "Meal attendance",
  "meals.walkIn": "Walk-in",
  "meals.served": "Served",
  "meals.missed": "Missed",
  "meals.notMarked": "Not marked",
  "meals.addDish": "Add dish",
  "meals.studentRecord": "Student meal record",
  "meals.student": "Student",
  "meals.dietaryNote": "Kitchen note",
  "meals.bookingAudit": "Booking audit",
  "meals.recordCredit": "Record credit",
  "meals.creditAppendOnly": "Credits are append-only. Corrections require a compensating entry.",
  "meals.amountTry": "Amount (TRY)",
  "meals.method": "Method",
  "meals.note": "Note",
  "meals.creditRecorded": "Credit recorded.",
  "meals.deleteMenu": "Delete menu",
  "meals.deleteDish": "Delete dish",
  "meals.editMenu": "Edit menu",
  "meals.editDish": "Edit dish",
  "meals.dishName": "Dish name",
  "meals.priceTry": "Price (TRY)",
  "nav.payments": "Payments & collection",
  "nav.paymentStatement": "My Fees",
  "nav.whiteboards": "Board",
  "whiteboard.title": "Whiteboards",
  "whiteboard.subtitle": "Live collaborative sketch boards.",
  "whiteboard.searchPlaceholder": "Search by title…",
  "whiteboard.empty": "No whiteboards yet.",
  "whiteboard.create": "New whiteboard",
  "whiteboard.edit": "Edit whiteboard",
  "whiteboard.titleLabel": "Title",
  "whiteboard.participants": "Participants",
  "whiteboard.participantsHint": "Invite students and staff who may draw.",
  "whiteboard.open": "Open",
  "whiteboard.createdAt": "Created",
  "whiteboard.limitReached": "You have reached your whiteboard limit.",
  "whiteboard.canvasHint": "Draw here — everyone on the board sees it live.",
  "whiteboard.closedBadge": "Closed",
  "whiteboard.lockedBadge": "Locked",
  "whiteboard.readOnlyBadge": "Read-only",
  "whiteboard.lock": "Lock",
  "whiteboard.unlock": "Unlock",
  "whiteboard.clear": "Clear",
  "whiteboard.clearConfirm": "Clear the live canvas? The history is kept and stays replayable.",
  "whiteboard.close": "Close board",
  "whiteboard.closeConfirm": "Close this board? It becomes permanently read-only.",
  "whiteboard.delete": "Delete board",
  "whiteboard.deleteConfirm": "Delete this board and its whole history? This cannot be undone.",
  "whiteboard.creator": "Creator",
  "whiteboard.roster": "Participants",
  "whiteboard.addParticipant": "Add participant",
  "whiteboard.removeParticipant": "Remove",
  "whiteboard.history": "History",
  "whiteboard.noHistory": "No past sessions yet.",
  "whiteboard.replaySession": "Replay session",
  "whiteboard.play": "Play",
  "whiteboard.pause": "Pause",
  "whiteboard.restart": "Restart",
  "whiteboard.notFound": "This whiteboard does not exist or you are not on it.",
  "whiteboard.back": "Back to whiteboards",
  "payments.title": "School fees",
  "payments.subtitle": "Fee plans, assignments, and the payment ledger.",
  "payments.empty": "No fee plans yet.",
  "payments.createPlan": "New plan",
  "payments.editPlan": "Edit plan",
  "payments.deletePlan": "Delete plan",
  "payments.planName": "Plan name",
  "payments.installments": "Installments",
  "payments.addInstallment": "Add installment",
  "payments.amountTry": "Amount (TRY)",
  "payments.dueDate": "Due date",
  "payments.total": "Total",
  "payments.assign": "Assign",
  "payments.assignHelp": "Assigning bills every installment as a charge at once. Students already on the plan are not billed again.",
  "payments.selectStudent": "Select student",
  "payments.assignments": "Assigned students",
  "payments.noAssignments": "No students assigned yet.",
  "payments.outcomeAssigned": "Assigned",
  "payments.outcomeAlready": "Already assigned",
  "payments.outcomeRejected": "Rejected",
  "payments.studentLedger": "Student ledger",
  "payments.balance": "Balance",
  "payments.ledger": "Ledger",
  "payments.noLedger": "No ledger entries.",
  "payments.recordPayment": "Record payment",
  "payments.recordRefund": "Refund",
  "payments.reverse": "Reverse",
  "payments.method": "Method",
  "payments.note": "Note",
  "payments.reason": "Reason",
  "payments.kindCharge": "Charge",
  "payments.kindCredit": "Payment",
  "payments.kindRefund": "Refund",
  "payments.kindReversal": "Reversal",
  "payments.statementTitle": "My fees",
  "payments.statementSubtitle": "What you owe the school and every charge behind it.",
  "payments.noStatement": "No charges yet.",
  "payments.due": "Due",
  "payments.credited": "Paid",
  "payments.refunded": "Refunded",
  "payments.outstanding": "Outstanding",
  "payments.status": "Status",
  "payments.overdue": "Overdue",
  "payments.reversed": "Reversed",
  "payments.paid": "Paid",
  "payments.appendOnly": "The ledger is append-only. A correction needs a balancing entry, never an edit.",
  "payments.tabCollect": "Collection",
  "payments.tabPlans": "Fee plans",
  "payments.periodBilled": "Billed this period",
  "payments.periodCollected": "Collected",
  "payments.periodOverdue": "Overdue",
  "payments.periodExpected": "Expected this month",
  "payments.exportStatement": "Export statement",
  "payments.entryTabAll": "All",
  "payments.entryTabOverdue": "Overdue",
  "payments.entryTabMonth": "This month",
  "payments.entryTabClosed": "Closed",
  "payments.collect": "Collect",
  "payments.collectFrom": "Collect payment",
  "payments.totalDebt": "Total billed",
  "payments.collected": "Collected",
  "payments.overdueCount": "Overdue",
  "payments.statusPending": "Pending",
  "payments.statusPartial": "Partial",
  "payments.statusCancelled": "Cancelled",
  "payments.noDebt": "No charges for this student yet.",
  "payments.noDebtHint": "Assign a fee plan from the Fee plans tab to bill this student.",
  "payments.methodCash": "Cash",
  "payments.methodTransfer": "Transfer / EFT",
  "payments.methodCard": "Card",
  "payments.methodCheck": "Cheque",
  "payments.methodOther": "Other",
  "payments.methodRequired": "Enter a payment method.",
  "payments.addStudent": "Add student",
  "payments.selectedStudents": "Selected students ({count})",
  "payments.assignSelected": "Assign selected",
  "payments.assignmentSummary": "Assigned: {assigned} · Already assigned: {alreadyAssigned} · Rejected: {rejected}",
  "payments.ledgerAudit": "Account activity",
  "payments.showLedger": "Show account activity",
  "payments.hideLedger": "Hide account activity",
  "payments.plan": "Plan",
  "payments.student": "Student",
  "payments.username": "Username",
  "payments.allStudents": "All students",
  "payments.allPlans": "All plans",
  "payments.inDebt": "In debt",
  "payments.settled": "Settled",
  "terms.title": "Academic terms",
  "terms.subtitle": "Manage academic terms and assign courses to each one.",
  "terms.create": "Create term",
  "terms.edit": "Edit term",
  "terms.empty": "No terms yet.",
  "terms.term": "Term",
  "terms.unassigned": "Unassigned",
  "terms.dateRequired": "Start and end dates are required.",
  "terms.archive": "Archive term",
  "terms.unarchive": "Reopen term",
  "terms.archived": "Archived",
  "sessions.title": "Lesson sessions",
  "sessions.item": "Session",
  "sessions.subtitle": "Schedule lesson sessions and record roll call for each class.",
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
  "attendance.subtitle": "Your attendance rates for events and lesson roll calls.",
  "attendance.events": "Events",
  "attendance.sessions": "Lesson sessions",
  "attendance.rate": "Rate",
  "attendance.courseBreakdown": "Course breakdown",
  "attendance.emptyCourses": "No lesson attendance rows yet.",
  "attendance.lookup": "Look up a student's attendance report.",
  "attendance.show": "Show attendance",
  "attendance.forUser": "Attendance for {user}",
  "attendance.totalAbsence": "Total absence",
  "attendance.overallRate": "Attendance rate",
  "work.title": "Work log",
  "work.subtitle": "Check in and out to log your working hours.",
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
  "work.daysThisMonth": "{count} days worked this month",
  "work.totalEntries": "{count} entries logged",
  "work.noActivity": "No activity yet",
  "work.searchPlaceholder": "Search staff…",
  "work.location": "Location",
  "work.quality": "Work quality",
  "work.addEntry": "Add entry",
  "work.planShift": "Plan shift",
  "lookup.searchHint": "Type at least 2 characters to search.",
  "work.userNotFound": "No work log found for this user.",
  "work.show": "Show log",
  "work.forUser": "Log for {user}",
  "work.correct": "Correct entry",
  "work.correctHelp": "Only closed stints can be corrected.",
  "work.cannotEditOpen": "Open stints cannot be corrected. Check out or delete them first.",
  "work.timesRequired": "Enter check-in and check-out date and time.",
  "work.deleteSummary": "Delete work entry from {time}?",
  "messages.inbox": "Inbox",
  "messages.sent": "Sent",
  "messages.archive": "Archive",
  "messages.trash": "Trash",
  "messages.unread": "unread",
  "messages.newMessage": "New message",
  "messages.recipient": "Recipient",
  "messages.recipientPlaceholder": "Search for name or username...",
  "messages.search": "Search messages",
  "messages.noMessages": "No messages found.",
  "messages.noSelection": "No message selected.",
  "messages.reply": "Reply",
  "messages.send": "Send",
  "messages.moveToArchive": "Archive",
  "messages.moveOutOfArchive": "Move out of Archive",
  "messages.moveToTrash": "Move to trash",
  "messages.deleteForever": "Delete permanently",
  "messages.movedToast": "Message moved.",
  "messages.deletedToast": "Message deleted.",
  "messages.sentToast": "Message sent.",
  "messages.to": "To: ",
  "messages.from": "From: ",
  "messages.markAsRead": "Mark as read",
  "messages.markAsUnread": "Mark as unread",
  "messages.selectRecipient": "Please select a recipient.",
  "messages.expand": "Expand",
  "messages.minimize": "Minimise",
  "messages.replyTo": "Reply to:",
  "messages.refreshedToast": "Messages refreshed.",
  "messages.deleteForeverOnlyTrash": "Permanent delete only applies to messages in the trash.",
  "messages.readOnlyReceived": "Only received messages can be marked read or unread.",
  "messages.trashEmptiedToast": "Trash emptied.",
};

const tr: Dict = {
  "app.name": "Hezarfen",
  "app.tagline": "Kampüs çalışma alanın — notlar, etkinlikler ve sınavlar tek yerde.",
  "ai.askCelebi": "Çelebi’ye sor",
  "ai.title": "Çelebi",
  "ai.description": "Kampüs asistanı",
  "ai.empty": "Okul günün, derslerin, sınavların veya yoklamaların hakkında Çelebi’ye sor.",
  "ai.placeholder": "Dersler, sınavlar, yoklamalar hakkında sor...",
  "ai.send": "Gönder",
  "ai.unavailable": "Çelebi şu anda kullanılamıyor. Lütfen biraz sonra tekrar dene.",
  "ai.copy": "Kopyala",
  "ai.copied": "Kopyalandı",
  "ai.thinking1": "Çelebi düşünüyor…",
  "ai.thinking2": "Araştırıyor…",
  "ai.thinking3": "Neredeyse hazır…",
  "ai.hint": "Enter gönder · Shift+Enter alt satır · Yapay zekâ üretimi",
  "ai.suggest1": "Bugün hangi derslerim var?",
  "ai.suggest2": "Yaklaşan sınavlarım neler?",
  "ai.suggest3": "Eksik ödevim var mı?",
  "ai.suggest4": "Bu dönem devamsızlığım nasıl?",
  "ai.suggestStaff1": "Bugün programda neler var?",
  "ai.suggestStaff2": "Yaklaşan sınavlar neler?",
  "ai.suggestStaff3": "Hangi öğrencilerin devamsızlığı yüksek?",
  "ai.suggestStaff4": "Bu haftanın etkinliklerini özetle.",
  "ai.suggestParent1": "Çocuğumun bugün hangi dersleri var?",
  "ai.suggestParent2": "Çocuğumun yaklaşan sınavları neler?",
  "ai.suggestParent3": "Çocuğumun bu dönem devamsızlığı nasıl?",
  "ai.suggestParent4": "Bu haftanın yemek menüsünde ne var?",
  "ai.goTo": "Sayfaya git",
  "ai.didYouMean": "Bunu mu demek istedin?",
  "ai.skipTyping": "Cevabın tamamını göster",
  "nav.today": "Bugün",
  "nav.classes": "Eğitim",
  "nav.classGroups": "Sınıflar",
  "classGroups.title": "Şubeler",
  "classGroups.subtitle": "Aynı dersleri paylaşan öğrenci grupları.",
  "classGroups.newClass": "Yeni şube",
  "classGroups.className": "Ad",
  "classGroups.grade": "Sınıf",
  "classGroups.empty": "Henüz şube yok.",
  "classGroups.open": "Aç",
  "classGroups.student": "Öğrenci",
  "classGroups.addedBy": "Ekleyen",
  "classGroups.courseColumn": "Ders",
  "classGroups.attachedBy": "Ekleyen",
  "classGroups.membersTab": "Öğrenciler",
  "classGroups.coursesTab": "Dersler",
  "classGroups.addStudent": "Öğrenci ekle",
  "classGroups.addStudentHelp": "Öğrenciyi bu şubeye bağlı tüm derslere kaydeder.",
  "classGroups.attachCourse": "Ders ekle",
  "classGroups.attachCourseHelp": "Bu şubedeki tüm öğrencileri derse kaydeder.",
  "classGroups.removeStudent": "Öğrenciyi çıkar",
  "classGroups.removeStudentConfirm": "{name} bu şubeden çıkarılsın mı? Bu şubenin onun için eklediği kayıtlar da silinir.",
  "classGroups.detachCourse": "Dersi çıkar",
  "classGroups.detachCourseConfirm": "{course} çıkarılsın mı? Bu şubenin bu ders için eklediği kayıtlar da silinir.",
  "classGroups.deleteClass": "Şubeyi sil",
  "classGroups.deleteConfirm": "Bu şube silinsin mi? Şubede öğrenci veya ders kalmamış olmalı.",
  "classGroups.selectCourse": "Bir ders seç",
  "classGroups.noMembers": "Bu şubede henüz öğrenci yok.",
  "classGroups.noCourses": "Henüz ders eklenmemiş.",
  "classGroups.homeroomTeacher": "Sınıf öğretmeni",
  "classGroups.noTeacher": "Atanmadı",
  "classGroups.selectTeacher": "Bir öğretmen seç",
  "classGroups.yourClass": "Şube",
  "classGroups.searchPlaceholder": "Şube, sınıf veya danışman ara…",
  "classGroups.allGrades": "Tüm sınıflar",
  "classGroups.studentsCount": "{count} öğrenci",
  "classGroups.noGrade": "Sınıf yok",
  "classGroups.attendanceRate": "Devam",
  "classGroups.competency": "Yetkinlik",
  "classGroups.weakestTopic": "En zayıf konu",
  "classGroups.mergeClasses": "Şube birleştir",
  "classBlueprints.tab": "Seviye şablonları",
  "classBlueprints.classesTab": "Şubeler",
  "classBlueprints.title": "Seviye şablonları",
  "classBlueprints.subtitle": "Bir seviyedeki her şube bu ders kümesini alır.",
  "classBlueprints.new": "Yeni şablon",
  "classBlueprints.edit": "Şablonu düzenle",
  "classBlueprints.grade": "Seviye",
  "classBlueprints.gradeHint": "Her seviyenin tek bir şablonu olur, bu yüzden seviye sonradan değiştirilemez.",
  "classBlueprints.courses": "Dersler",
  "classBlueprints.courseCount": "{count} ders",
  "classBlueprints.courseCountColumn": "Ders sayısı",
  "classBlueprints.selected": "{count} / {max} seçildi",
  "classBlueprints.empty": "Henüz şablon yok.",
  "classBlueprints.selectCourses": "Bu seviyedeki her şubenin aldığı dersleri seç.",
  "classBlueprints.wholeSetHint":
    "Bu liste tamamıdır — işaretini kaldırdığın dersler bu seviyedeki her şubeden çıkarılır. Elle eklenen dersler kalır.",
  "classBlueprints.filterCourses": "Derslerde ara",
  "classBlueprints.noCourseMatch": "Bu aramayla eşleşen ders yok.",
  "classBlueprints.saved": "Şablon kaydedildi ve bu seviyedeki her şubeye uygulandı.",
  "classBlueprints.delete": "Şablonu sil",
  "classBlueprints.deleteConfirm":
    "{grade} seviyesinin şablonu silinsin mi? Şablonun eklediği dersler bu seviyedeki her şubeden çıkarılır. Elle eklenen dersler kalır.",
  "classBlueprints.deleted": "Şablon silindi.",
  "classBlueprints.status": "Eşitleme kontrolü",
  "classBlueprints.statusTitle": "{grade} seviyesi eşitleme durumu",
  "classBlueprints.statusEmpty": "Bu seviyedeki her şube şablonun tamamını taşıyor.",
  "classBlueprints.statusSection": "Şube",
  "classBlueprints.statusMissing": "Eksik dersler",
  "classBlueprints.apply": "Şablonu uygula",
  "classBlueprints.applyHint": "Bu seviyenin şablon derslerini bu şubeye ekler.",
  "classBlueprints.applyNoGrade": "Önce bu şubeye bir seviye ata.",
  "classBlueprints.applied": "Şablon uygulandı.",
  "classBlueprints.noBlueprintForGrade": "{grade} seviyesi için henüz bir şablon yok.",
  "classBlueprints.conflictExists": "Bu seviye için zaten bir şablon var. Bunun yerine listeden düzenle.",
  "classBlueprints.staleReload":
    "Sen düzenlerken bu şablon değişti. Liste yenilendi — gözden geçirip tekrar kaydet.",
  "classBlueprints.skippedSummary": "Kaydedildi. {count} şube-ders eşleşmesi eklenemedi.",
  "classBlueprints.skippedDetails": "Detayları gör",
  "classBlueprints.skippedTitle": "Eklenemeyenler",
  "classBlueprints.skippedSubtitle": "Geri kalan her şey uygulandı. Aşağıdaki eşleşmelere dokunulmadı.",
  "classBlueprints.skippedClass": "Şube",
  "classBlueprints.skippedCourse": "Ders",
  "classBlueprints.skippedReason": "Sebep",
  "classBlueprints.skipClassGone": "Şablon uygulanırken bu şube silindi.",
  "classBlueprints.skipCoursePruned": "Bu ders artık yok ve şablondan çıkarıldı.",
  "classBlueprints.skipCeiling": "Şube en fazla ders sayısına ulaşmış.",
  "classBlueprints.skipOverloaded": "Şubede, tek seferde eklenebilecek olandan daha çok öğrenci var.",
  "classBlueprints.skipNoSeat": "{course} dersinde tüm şube için yeterli kontenjan yok.",
  "classBlueprints.skipCourseGone": "{course} artık yok — önce bu şubeden çıkar.",
  "classBlueprints.skipOther": "Bu eşleşme eklenemedi.",
  "profile.myProfile": "Profilim",
  "profile.viewProfile": "Profili gör",
  "profile.displayName": "Görünen ad",
  "profile.displayNameHint": "Diğer kişilere kullanıcı adın yerine bu gösterilir.",
  "profile.bio": "Hakkında",
  "profile.bioHint": "Kendinle ilgili kısa bir not.",
  "profile.bioEmpty": "Henüz bir not yok.",
  "profile.classes": "Şubeler",
  "profile.noClasses": "Hiçbir şubede değil.",
  "profile.courses": "Dersler",
  "profile.noCourses": "Gösterilecek ders yok.",
  "profile.stats": "İstatistikler",
  "profile.statFocusHours": "Odak saati",
  "profile.statSessions": "Odak oturumu",
  "profile.statHomework": "Teslim edilen ödev",
  "profile.statOnTime": "Zamanında teslim",
  "profile.statExams": "Girilen sınav",
  "profile.statCourses": "Ders",
  "profile.statClasses": "Şube",
  "common.clearSearch": "Aramayı temizle",
  "common.refresh": "Yenile",
  "editor.bold": "Kalın (Ctrl+B)",
  "editor.italic": "İtalik (Ctrl+I)",
  "editor.underline": "Altı çizili (Ctrl+U)",
  "editor.strike": "Üstü çizili",
  "editor.bulletList": "Madde işaretli liste",
  "editor.numberedList": "Numaralı liste",
  "editor.clearFormatting": "Biçimlendirmeyi temizle",
  "editor.bulletListLabel": "Liste",
  "editor.numberedListLabel": "1. Liste",
  "editor.clearFormattingLabel": "Biçimi temizle",
  "editor.bodyPlaceholder": "Mesajınızı buraya yazın…",
  "messages.refreshList": "Mesajları yenile",
  "messages.deleteDraft": "Taslağı sil",
  "messages.restoreFromTrash": "Çöp kutusundan çıkar",
  "messages.labelsPlaceholder": "ör. Etüt, Sınav (isteğe bağlı)",
  "messages.bodyPlaceholder": "Mesajınızı buraya yazın…",
  "messages.replyPlaceholder": "Yanıtınızı yazın…",
  "questions.deleteConfirm": "Bu soru silinsin mi?",
  "profile.forbiddenParent": "Yalnızca kendi profilini ve çocuklarının profilini görebilirsin.",
  "profile.notFound": "Böyle bir kişi yok.",
  "parentLink.manage": "Bağlı öğrenciler",
  "parentLink.title": "Bağlı öğrenciler",
  "parentLink.subtitle": "{name} adlı velinin sorumlu olduğu öğrenciler.",
  "parentLink.selectStudent": "Öğrenci seç",
  "parentLink.add": "Bağla",
  "parentLink.empty": "Bu veliye bağlı öğrenci yok.",
  "parentLink.linked": "Öğrenci bağlandı.",
  "parentLink.remove": "Bağlantıyı kaldır",
  "parentLink.removeConfirm": "{student} öğrencisinin {parent} ile bağlantısı kaldırılsın mı? Veli, o öğrencinin kayıtlarına erişimini kaybeder.",
  "parentLink.removed": "Bağlantı kaldırıldı.",
  "avatar.title": "Fotoğraf",
  "avatar.change": "Fotoğrafı değiştir",
  "avatar.upload": "Fotoğraf yükle",
  "avatar.remove": "Fotoğrafı kaldır",
  "avatar.removeConfirm": "Profil fotoğrafın kaldırılsın mı?",
  "avatar.removed": "Fotoğraf kaldırıldı.",
  "avatar.uploaded": "Fotoğraf güncellendi.",
  "avatar.hint": "PNG, JPEG, WebP veya GIF, en fazla {size}.",
  "avatar.typeInvalid": "PNG, JPEG, WebP veya GIF bir görsel kullan.",
  "avatar.tooLarge": "Bu görsel {size} sınırından büyük.",
  "badges.title": "Rozetler",
  "badges.subtitle": "Çalışma biriktikçe otomatik kazanılır.",
  "badges.earnedOn": "{date} tarihinde kazanıldı",
  "badges.locked": "Henüz kazanılmadı",
  "badges.remaining": "{count} tane kaldı",
  "badges.remainingHours": "{count} saat kaldı",
  "badges.none": "Henüz rozet yok.",
  "badges.earnedCount": "{earned} / {total} kazanıldı",
  "badge.homework_submitted_1.name": "İlk Adım",
  "badge.homework_submitted_1.desc": "İlk ödevini teslim et.",
  "badge.homework_submitted_10.name": "Düzenli Teslim",
  "badge.homework_submitted_10.desc": "10 ödev teslim et.",
  "badge.homework_submitted_50.name": "Ödev Ustası",
  "badge.homework_submitted_50.desc": "50 ödev teslim et.",
  "badge.homework_on_time_10.name": "Dakik",
  "badge.homework_on_time_10.desc": "10 ödevi zamanında teslim et.",
  "badge.homework_on_time_25.name": "Saat Gibi",
  "badge.homework_on_time_25.desc": "25 ödevi zamanında teslim et.",
  "badge.exam_sat_1.name": "İlk Sınav",
  "badge.exam_sat_1.desc": "İlk sınavına gir.",
  "badge.exam_sat_10.name": "Sınav Yolcusu",
  "badge.exam_sat_10.desc": "10 sınava gir.",
  "badge.exam_sat_25.name": "Sınav Kurdu",
  "badge.exam_sat_25.desc": "25 sınava gir.",
  "badge.pomodoro_finished_10.name": "Odağa Başlangıç",
  "badge.pomodoro_finished_10.desc": "10 odak oturumu tamamla.",
  "badge.pomodoro_finished_50.name": "Odak Alışkanlığı",
  "badge.pomodoro_finished_50.desc": "50 odak oturumu tamamla.",
  "badge.pomodoro_finished_200.name": "Odak Şampiyonu",
  "badge.pomodoro_finished_200.desc": "200 odak oturumu tamamla.",
  "badge.pomodoro_focus_ms_36000000.name": "10 Saat Odak",
  "badge.pomodoro_focus_ms_36000000.desc": "Odak oturumlarında toplam 10 saat geçir.",
  "badge.pomodoro_focus_ms_180000000.name": "50 Saat Odak",
  "badge.pomodoro_focus_ms_180000000.desc": "Odak oturumlarında toplam 50 saat geçir.",
  "badge.marks_given_10.name": "İlk Notlar",
  "badge.marks_given_10.desc": "10 not kaydet.",
  "badge.marks_given_50.name": "Deneyimli Değerlendirici",
  "badge.marks_given_50.desc": "50 not kaydet.",
  "badge.marks_given_250.name": "Değerlendirme Ustası",
  "badge.marks_given_250.desc": "250 not kaydet.",
  "badge.lessons_held_10.name": "Sınıfa İlk Adım",
  "badge.lessons_held_10.desc": "10 ders işle.",
  "badge.lessons_held_50.name": "Deneyimli Eğitimci",
  "badge.lessons_held_50.desc": "50 ders işle.",
  "badge.lessons_held_200.name": "Eğitimin Direği",
  "badge.lessons_held_200.desc": "200 ders işle.",
  "badge.pool_approved_5.name": "Kalite Kontrolü",
  "badge.pool_approved_5.desc": "Soru havuzunda 5 soruyu onayla.",
  "badge.pool_approved_25.name": "Güvenilir İnceleyici",
  "badge.pool_approved_25.desc": "Soru havuzunda 25 soruyu onayla.",
  "badge.pool_approved_100.name": "Havuz Küratörü",
  "badge.pool_approved_100.desc": "Soru havuzunda 100 soruyu onayla.",
  "badge.pool_published_1.name": "İlk Katkı",
  "badge.pool_published_1.desc": "İlk sorunu okul havuzunda yayımla.",
  "badge.pool_published_10.name": "Soru Üreticisi",
  "badge.pool_published_10.desc": "10 soruyu okul havuzunda yayımla.",
  "badge.pool_published_50.name": "Bilgi Katkıcısı",
  "badge.pool_published_50.desc": "50 soruyu okul havuzunda yayımla.",
  "badge.lessons_attended_10.name": "Derste ve Öğreniyor",
  "badge.lessons_attended_10.desc": "10 derse katıl.",
  "badge.lessons_attended_50.name": "Azimli Öğrenci",
  "badge.lessons_attended_50.desc": "50 derse katıl.",
  "badge.lessons_attended_200.name": "Sınıf Müdavimi",
  "badge.lessons_attended_200.desc": "200 derse katıl.",
  "badge.high_mark_1.name": "Yüksek Başlangıç",
  "badge.high_mark_1.desc": "İlk yüksek notunu al.",
  "badge.high_mark_10.name": "Yüksek Form",
  "badge.high_mark_10.desc": "10 yüksek not al.",
  "badge.high_mark_25.name": "Başarı Serisi",
  "badge.high_mark_25.desc": "25 yüksek not al.",
  "badge.study_streak_3.name": "Üç Günlük Kıvılcım",
  "badge.study_streak_3.desc": "3 gün üst üste çalış.",
  "badge.study_streak_7.name": "Çalışma Haftası",
  "badge.study_streak_7.desc": "7 gün üst üste çalış.",
  "badge.study_streak_30.name": "Aylık İvme",
  "badge.study_streak_30.desc": "30 gün üst üste çalış.",
  "whiteboard.bulkInvite": "Toplu davet",
  "whiteboard.bulkInviteHint":
    "Gruptaki herkesi katılımcı olarak ekler. Veliler eklenmez, zaten tahtada olanların yeri korunur.",
  "whiteboard.inviteSourceClass": "Şube",
  "whiteboard.inviteSourceCourse": "Ders veya kulüp",
  "whiteboard.inviteSourceEvent": "Etkinlik",
  "whiteboard.inviteSelect": "Bir grup seç",
  "whiteboard.inviteAction": "Davet et",
  "whiteboard.inviteAdded": "{count} kişi eklendi.",
  "whiteboard.inviteNoneAdded": "O gruptaki herkes zaten katılımcı.",
  "whiteboard.inviteTooMany":
    "Bu grup tahtayı {max} katılımcı sınırının üstüne çıkarırdı, bu yüzden kimse eklenmedi. Bazı katılımcıları çıkar veya daha küçük bir grup davet et.",
  "whiteboard.inviteNotFound": "O grup artık yok. Listeyi yenile.",
  "whiteboard.inviteEmptySource": "Burada henüz seçilecek bir şey yok.",
  "nav.children": "Çocuklarım",
  "nav.school": "Okul",
  "nav.notes": "Defter",
  "nav.events": "Etkinlikler",
  "nav.exams": "Sınavlar",
  "nav.questionBank": "Soru bankası",
  "nav.homework": "Ödevler",
  "nav.courses": "Ders",
  "nav.meals": "Yemekler",
  "nav.marks": "Karnem",
  "nav.messages": "Mesajlar",
  "rightPanel.messagesTitle": "Mesajlar",
  "rightPanel.calendarTitle": "Takvim ve etkinlikler",
  "rightPanel.openFullMessages": "Tüm mesajları aç",
  "rightPanel.openFullCalendar": "Tüm takvimi aç",
  "rightPanel.noUnread": "Okunmamış mesaj yok",
  "rightPanel.noUpcoming": "Yaklaşan etkinlik veya sınav yok",
  "rightPanel.unreadBadge": "Okunmamış",
  "notifications.title": "Bildirimler",
  "notifications.clearAll": "Tümünü sil",
  "notifications.dismiss": "Sil",
  "notifications.empty": "Henüz yeni bir bildiriminiz yok.",
  "notifications.tabAll": "Tümü",
  "notifications.tabSystem": "Sistem",
  "errors.notFoundDescription": "Aradığın sayfa taşınmış ya da silinmiş olabilir.",
  "errors.accessDeniedDescription": "Rolün bu bölümü görüntülemeye yetkili değil. Gerekliyse kurum yöneticinden yetki iste.",
  "network.offlineTitle": "Bağlantın koptu",
  "network.offlineDescription": "Bağlantı geri gelene kadar bazı işlemler tamamlanmayabilir.",
  "network.reconnect": "Yeniden bağlan",
  "nav.pomodoro": "Pomodoro",
  "nav.attendance": "Yoklama",
  "nav.questions": "Soru havuzu",
  "nav.work": "Mesai",
  "nav.staffWork": "Personel Mesai",
  "nav.users": "Kullanıcılar ve roller",
  "nav.studentMarks": "Öğrenci notları",
  "nav.studentAttendance": "Öğrenci yoklamaları",
  "nav.studentPomodoro": "Öğrenci pomodoroları",
  "nav.settings": "Ayarlar",
  "nav.terms": "Dönemler",
  "nav.guide": "Rehber",
  "nav.calendar": "Takvim",
  "nav.admin": "Yönetim",
  "nav.logout": "Çıkış yap",
  "nav.menu": "Menü",
  "nav.close": "Kapat",
  "nav.collapse": "Kenar çubuğunu daralt",
  "nav.expand": "Kenar çubuğunu genişlet",
  "nav.account": "Hesap",
  "nav.preferences": "Tercihler",
  "nav.group.students": "Öğrenci yönetimi",
  "nav.group.school": "Okul yönetimi",
  "nav.group.classes": "Akademik",
  "nav.group.planning": "Planlama",
  "nav.group.workspace": "Çalışma alanı",
  "nav.group.grades": "Notlar",
  "nav.group.community": "Topluluk",
  "nav.group.services": "Okul hizmetleri",
  "nav.group.operations": "Operasyon",
  "nav.group.ai": "Yapay zekâ",
  "nav.group.institution": "Kurum",
  "nav.group.myClassroom": "Sınıfım",
  "nav.group.study": "Çalışma",
  "nav.group.other": "Diğer",
  "nav.group.myStudent": "Öğrencim",
  "nav.group.teaching": "Eğitim ve içerik",
  "nav.group.tracking": "Öğrenci takibi",
  "nav.studentsRoster": "Öğrenciler",
  "nav.teachersRoster": "Öğretmenler",
  "nav.schedule": "Ders programı",
  "nav.mySchedule": "Ders programım",
  "nav.mockExams": "Deneme sınavları",
  "nav.opticalReading": "Optik okuma",
  "nav.hezarfenZeka": "Hezarfen Zekâ",
  "nav.celebi": "Çelebi",
  "nav.soundStudio": "Ses Atölyesi",
  "nav.reports": "Raporlar",
  "nav.licenseModules": "Lisans ve modüller",
  "nav.dataProtection": "KVKK ve denetim",
  "nav.schoolMeals": "Yemekhane Yönetimi",
  "nav.myClasses": "Sınıflarım",
  "nav.studentAnalysis": "Öğrenci analizi",
  "nav.pendingApprovals": "Bekleyen onaylar",
  "nav.questionGeneration": "Soru üretimi",
  "nav.parentCommunication": "Veli iletişimi",
  "nav.studyPlan": "Çalışma programım",
  "nav.topicMastery": "Konu yetkinliğim",
  "nav.examResults": "Sınav sonuçlarım",
  "nav.myHomework": "Ödevlerim",
  "nav.progressReport": "Gelişim raporu",
  "nav.absence": "Devamsızlık",
  "nav.childExamResults": "Sınav sonuçları",
  "nav.childStudyPlan": "Çalışma planı",
  "nav.appointmentsAndCommunication": "Randevu ve iletişim",
  "nav.soon": "Yakında",
  "comingSoon.title": "Yakında",
  "comingSoon.description": "Bu modül hazırlanıyor — henüz gösterecek bir şey yok.",
  "comingSoon.emptyTitle": "Henüz kullanıma açık değil",
  "comingSoon.emptyDescription": "Hezarfen'in bu bölümü hâlâ hazırlanıyor. Yakında tekrar bakın.",
  "roster.student": "Öğrenci",
  "roster.teacher": "Öğretmen",
  "roster.class": "Sınıf",
  "roster.classAll": "Sınıf: Tümü",
  "roster.term": "Dönem",
  "roster.termAll": "Dönem: Tümü",
  "roster.mastery": "Konu yetkinliği",
  "roster.attendance": "Devam",
  "roster.planAdherence": "Plan uyumu",
  "roster.status": "Durum",
  "roster.branch": "Branş",
  "roster.weeklyLessons": "Haftalık ders",
  "roster.suggestionAcceptance": "Öneri kabulü",
  "roster.tabAll": "Tümü",
  "roster.tabActive": "Aktif",
  "roster.tabNew": "Yeni kayıt",
  "roster.tabAtRisk": "Risk altında",
  "roster.tabLeft": "Ayrılan",
  "roster.tabPermanent": "Kadrolu",
  "roster.tabContract": "Ücretli",
  "roster.tabAdvisor": "Danışman",
  "roster.import": "İçe aktar",
  "roster.addStudent": "Öğrenci ekle",
  "roster.addTeacher": "Öğretmen ekle",
  "roster.studentsSubtitle": "Kurumdaki tüm öğrenciler, sınıflarıyla birlikte.",
  "roster.teachersSubtitle": "Kurumdaki öğretmenler ve sınıf öğretmenliği yaptıkları sınıflar.",
  "roster.searchStudents": "Öğrenci adı veya kullanıcı adı ara…",
  "roster.searchTeachers": "Öğretmen adı veya kullanıcı adı ara…",
  "roster.noTeachers": "Henüz öğretmen yok.",
  "builder.console": "Operatör konsolu",
  "builder.logout": "Çıkış yap",
  "builder.loginTitle": "Operatör girişi",
  "builder.loginSubtitle": "Bu kurulumdaki okulları yönet.",
  "builder.backToSchoolLogin": "Okul girişine dön",
  "builder.operatorLogin": "Operatör girişi",
  "builder.statusActive": "Aktif",
  "builder.statusSuspended": "Askıda",
  "builder.createSchool": "Yeni okul",
  "builder.createSchoolHint": "Okulun veritabanını ve ilk yöneticisini tek adımda oluşturur.",
  "builder.slug": "Okul kodu",
  "builder.slugHint": "Küçük harf, rakam ve tire. Sonradan değiştirilemez.",
  "builder.schoolName": "Okul adı",
  "builder.adminUsername": "Yönetici kullanıcı adı",
  "builder.adminPassword": "Yönetici şifresi",
  "builder.sellEverything": "Katalogdaki tüm modülleri aç",
  "builder.schools": "Okullar",
  "builder.schoolsSubtitle": "Bu kurulumdaki tüm okullar",
  "builder.status": "Durum",
  "builder.modules": "Modüller",
  "builder.createdAt": "Oluşturulma",
  "builder.suspend": "Askıya al",
  "builder.activate": "Aktifleştir",
  "builder.noSchools": "Henüz okul yok.",
  "builder.deleteSchool": "Okulu sil",
  "builder.deleteSchoolWarning": "Bu okulun tüm verileri ve yüklenen dosyaları kalıcı olarak silinir. Geri alınamaz.",
  "builder.enterSchool": "Okula gir",
  "builder.enterSchoolHint": "Destek için bu tarayıcıda okulun bir yöneticisi olarak oturum açar. Operatör oturumun kapanır.",
  "builder.enterSuspendedHint": "Askıdaki bir okula girilemez.",
  "builder.resetAdminPassword": "Yönetici şifresini sıfırla",
  "builder.resetAdminPasswordHint": "Bu okulun bir yöneticisine yeni şifre verir ve o hesabın tüm oturumlarını kapatır.",
  "builder.newPassword": "Yeni şifre",
  "builder.passwordResetDone": "Şifre sıfırlandı. O yöneticinin oturumları kapatıldı.",
  "builder.modulesHint": "Değişiklikler okulun bir sonraki isteğinde geçerli olur.",
  "builder.editSchool": "Okulu düzenle",
  "builder.editSchoolHint": "Okulun adını veya durumunu değiştir.",
  "builder.suspendHint": "Askıya alma anında geçerlidir: okulun tüm kullanıcıları, giriş dahil, reddedilir.",
  "modules.subtitle": "Modüler yapı: okulun yalnızca ihtiyaç duyduğu bileşenlere sahip olur.",
  "modules.readOnlyHint": "Modüller Hezarfen sağlayıcın tarafından açılır veya kapatılır.",
  "modules.enabledCount": "{total} modülden {on} açık",
  "modules.enableAll": "Hepsini aç",
  "modules.disableAll": "Hepsini kapat",
  "modules.requires": "Gerektirir",
  "modules.on": "Açık",
  "modules.conflictRequires": "{module} için {needed} açık olmalı.",
  "modules.conflictRequiredBy": "{module} kapatılamaz: {dependents} buna bağlı.",
  "modules.module": "Modül",
  "modules.active": "Etkin",
  "modules.unitPrice": "Birim fiyat",
  "modules.activeSeats": "Aktif lisans",
  "modules.annualAmount": "Yıllık tutar",
  "modules.annualTotal": "yıllık toplam",
  "modules.tabOverview": "Genel bakış",
  "modules.tabUsage": "Kullanım",
  "modules.tabInvoices": "Faturalar",
  "modules.tabContract": "Sözleşme",
  "modules.downloadInvoices": "Faturaları indir",
  "modules.addLicense": "Lisans ekle",
  "modules.fullPackage": "Tam paket",
  "modules.customPackage": "Özel paket",
  "modules.renewal": "Yenileme",
  "modules.recentInvoices": "Son faturalar",
  "modules.off": "Kapalı",
  "module.appointments": "Randevular",
  "module.attendance": "Yoklama",
  "module.bank_questions": "Soru bankası",
  "module.boards": "Tahta",
  "module.chatbot": "Çelebi asistanı",
  "module.classes": "Sınıflar",
  "module.course_notes": "Ders notları",
  "module.courses": "Dersler",
  "module.events": "Etkinlikler",
  "module.exams": "Sınavlar",
  "module.homework": "Ödevler",
  "module.marks": "Notlar",
  "module.meals": "Yemekler",
  "module.messages": "Mesajlar",
  "module.notes": "Defter",
  "module.payments": "Ödemeler",
  "module.pomodoro": "Pomodoro",
  "module.questions": "Soru havuzu",
  "module.sessions": "Ders oturumları",
  "module.subjects": "Konular",
  "module.work": "Mesai",
  "package.academics": "Akademik",
  "package.ai": "Yapay zekâ",
  "package.communication": "İletişim",
  "package.operations": "Operasyon",
  "nav.darkMode": "Karanlık mod",
  "parents.title": "Öğrencilerim",
  "parents.subtitle": "Size bağlı öğrencilerin akademik kayıtlarını inceleyin.",
  "common.loading": "Yükleniyor…",
  "common.cancel": "Vazgeç",
  "common.save": "Kaydet",
  "common.create": "Oluştur",
  "common.edit": "Düzenle",
  "common.done": "Bitti",
  "common.delete": "Sil",
  "common.update": "Güncelle",
  "common.remove": "Kaldır",
  "common.back": "Geri",
  "common.view": "Görüntüle",
  "common.reply": "Yanıtla",
  "common.approve": "Onayla",
  "common.reject": "Reddet",
  "common.action": "İşlem",
  "common.actions": "İşlemler",
  "common.columns": "Sütunlar",
  "common.visibleColumns": "Görünür sütunlar",
  "common.pageRange": "{total} kayıttan {start}-{end}",
  "common.rowsPerPage": "{size} / sayfa",
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
  "confirm.review": "Lütfen kaydetmeden önce değişiklikleri gözden geçirin.",
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
  "confirm.removeEventRegistration": "{user} kullanıcısının etkinlik kaydı kaldırılsın mı?",
  "confirm.removeResult": "{user} kullanıcısının notu kaldırılsın mı?",
  "confirm.updateRole": "{user} rolü {from} → {to} olarak değiştirilsin mi?",
  "confirm.gradeStudent": "{user} kullanıcısına {mark}/100 notu verilsin mi?",
  "common.prev": "Önceki",
  "common.next": "Sonraki",
  "common.pageOf": "{page} / {total}",
  "common.noResults": "Sonuç yok.",
  "common.creator": "Oluşturan",
  "common.searchPlaceholder": "Ara…",
  "common.all": "Tümü",
  "common.resetFilters": "Sıfırla",
  "common.saveAttendance": "Yoklamamı kaydet",
  "common.created": "Oluşturuldu.",
  "common.deleted": "Silindi.",
  "common.saved": "Başarıyla kaydedildi.",
  "common.createItem": "Yeni {item} oluştur",
  "common.countItem": "{count} {item}",
  "pool.title": "Soru havuzu",
  "pool.subtitle": "Öğretmenlerinize ve arkadaşlarınıza soru sorun, çözümleri birlikte tartışın.",
  "pool.ask": "Soru sor",
  "pool.subject": "Konu",
  "pool.body": "Soru detayı",
  "pool.image": "Görsel (İsteğe bağlı)",
  "pool.status": "Durum",
  "pool.pending": "Bekliyor",
  "pool.approved": "Onaylandı",
  "pool.author": "Yazar",
  "pool.solutions": "Çözümler",
  "pool.offerSolution": "Çözüm gönder",
  "pool.noQuestions": "Soru bulunamadı.",
  "theme.light": "Açık",
  "theme.dark": "Koyu",
  "theme.toggle": "Tema",
  "lang.en": "English",
  "lang.tr": "Türkçe",
  "lang.label": "Dil",
  "auth.login": "Giriş yap",
  "auth.register": "Hesap oluştur",
  "auth.username": "Kullanıcı adı",
  "auth.school": "Okul",
  "auth.schoolHint": "{min}–{max} karakter",
  "auth.password": "Şifre",
  "auth.noAccount": "Yeni misin?",
  "auth.hasAccount": "Zaten kayıtlı mısın?",
  "auth.confirmPassword": "Şifreyi onayla",
  "auth.passwordMismatch": "Şifreler eşleşmiyor",
  "auth.loginTitle": "Hesabına giriş yap",
  "auth.loginSubtitle": "Okul çalışma alanına devam etmek için giriş yap.",
  "auth.chooseSchoolTitle": "Okulunu seç",
  "auth.chooseSchoolSubtitle": "@{username} için açılacak çalışma alanını seç.",
  "auth.differentAccount": "Başka bir hesap kullan",
  "auth.registerTitle": "Hezarfen’e katıl",
  "auth.registerSubtitle": "Yeni hesaplar öğrenci olarak başlar. Öğretmen ve admin rolleri sonradan verilir.",
  "auth.usernameHint": "3–32 karakter",
  "auth.passwordHint": "6–128 karakter",
  "auth.showPassword": "Şifreyi göster",
  "auth.hidePassword": "Şifreyi gizle",
  "auth.welcomeBack": "Seni yeniden görmek güzel",
  "auth.createStudent": "Öğrenci hesabı oluştur",
  "dashboard.greeting": "Merhaba, {name}",
  "dashboard.subtitle": "Okulunuzda bugün olup bitenlerin kısa bir özeti.",
  "dashboard.overview": "Özet",
  "dashboard.quickActions": "Hızlı işlemler",
  "dashboard.action.note": "Yeni not",
  "dashboard.action.noteHint": "Hızlıca bir şey kaydet",
  "dashboard.action.event": "Etkinlik oluştur",
  "dashboard.action.eventHint": "Oturum planla",
  "dashboard.action.course": "Yeni eğitim kaydı",
  "dashboard.action.courseHint": "Eğitim kaydı aç",
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
  "command.group.actions": "Hızlı işlemler",
  "command.group.people": "Öğrenciler",
  "command.group.navigation": "Sayfalar & gezinme",
  "command.group.system": "Sistem & tercihler",
  "command.action.createHomework": "Yeni ödev ekle",
  "command.action.createHomeworkDesc": "Ders için yeni ödev tanımla",
  "command.action.createCourse": "Yeni ders / kurs oluştur",
  "command.action.createCourseDesc": "Sisteme yeni ders kaydı ekle",
  "command.action.createEvent": "Etkinlik planla",
  "command.action.createEventDesc": "Takvime etkinlik veya ders ekle",
  "command.action.createExam": "Yeni sınav hazırla",
  "command.action.createExamDesc": "Öğrenciler için yeni sınav tanımla",
  "command.action.createNote": "Ders notu ekle",
  "command.action.createNoteDesc": "Kişisel veya ders notu kaydet",
  "command.action.importNote": "Not içe aktar assistant",
  "command.action.importNoteDesc": "PDF veya metin belgesini not haline getir",
  "command.action.askQuestion": "Soru sor / havuza ekle",
  "command.action.askQuestionDesc": "Soru havuzuna yeni soru ekle",
  "command.action.askCelebi": "Çelebi AI ile konuş",
  "command.action.askCelebiDesc": "Yapay zeka asistanı ile sohbet et",
  "command.action.myProfile": "Profil bilgilerim",
  "command.action.myProfileDesc": "Kullanıcı hesabı ve profil detayları",
  "command.action.themeDark": "Koyu tema",
  "command.action.themeLight": "Açık tema",
  "command.action.themeSystem": "Sistem teması",
  "command.action.langTr": "Dil: Türkçe",
  "command.action.langEn": "Dil: English",
  "command.action.logout": "Oturumu kapat",
  "command.action.logoutDesc": "Mevcut oturumu sonlandır",
  "command.shortcutHint": "Yön tuşlarıyla gezinebilir, Enter ile seçebilirsiniz",
  "command.key.navigate": "gezin",
  "command.key.select": "seç",
  "command.key.close": "kapat",
  "command.action.themeDarkDesc": "Koyu moda geç",
  "command.action.themeLightDesc": "Açık moda geç",
  "command.action.langTrDesc": "Türkçe diline geç",
  "command.action.langEnDesc": "İngilizce diline geç",
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
  "dashboard.portal.coursesDesc": "Dersleri, konuları, kayıtları ve sınavları görüntüle.",
  "dashboard.portal.studiesDesc": "Etütleri, kayıtları ve sınavları görüntüle.",
  "dashboard.portal.clubsDesc": "Kulüpleri, kayıtları ve sınavları görüntüle.",
  "dashboard.portal.examsDesc": "Eğitim sınavları, tarihler ve sonuçlar.",
  "dashboard.portal.eventsDesc": "Öğrenci yoklamalı etkinlikler.",
  "dashboard.portal.marksDesc": "Notların ve genel karnen.",
  "dashboard.portal.pomodoroDesc": "Odaklı çalışma oturumlarını takip et.",
  "dashboard.portal.notesDesc": "Hızlı fikirler için özel not defteri.",
  "dashboard.portal.usersDesc": "Kullanıcı hesaplarını ve rollerini yönet.",
  "dashboard.portal.attendanceDesc": "Öğrenci yoklama kayıtlarını incele.",
  "dashboard.portal.workDesc": "Çalışma saatlerini ve mesainizi takip edin.",
  "dashboard.portal.studentMarksDesc": "Öğrenci sonuçlarını görüntüle ve notlandır.",
  "dashboard.portal.settingsDesc": "Sistem tercihleri ve yapılandırma.",
  "dashboard.portal.termsDesc": "Akademik dönemleri ve periyotları yönet.",
  "dashboard.portal.mealsDesc": "Menüler, rezervasyonlar, beslenme uyarıları ve bakiye.",
  "dashboard.highlights": "Öne çıkanlar",
  "dashboard.progressOverview": "Performans özeti",
  "dashboard.progressOverviewDesc": "Derslere göre performansın.",
  "dashboard.activitySplit": "Yoklama dağılımı",
  "dashboard.activitySplitDesc": "Yoklama dağılımın.",
  "dashboard.successTrend": "Başarı eğilimi",
  "dashboard.successTrendMine": "Sınav notlarının zaman içindeki seyri.",
  "dashboard.successTrendSchool": "Son sınavların sınıf ortalamaları.",
  "dashboard.courseAveragesSchool": "Son sınavlara göre ders bazında ortalama.",
  "dashboard.examGraded": "{count} notlandırıldı",
  "dashboard.chartExamCount": "Sınav",
  "dashboard.chartLatest": "Son değer",
  "dashboard.chartAverage": "Grafik ortalaması",
  "dashboard.chartRange": "Değer aralığı",
  "dashboard.chartLatestExam": "Son sınav",
  "dashboard.focusHeatmap": "Odaklanma etkinliği",
  "dashboard.focusHeatmapDesc": "Gün gün pomodoro oturumların.",
  "dashboard.activityHeatmap": "Okul etkinliği",
  "dashboard.activityHeatmapDesc": "Gün gün sınav, etkinlik ve ödevler.",
  "dashboard.heatmapLess": "Az",
  "dashboard.heatmapMore": "Çok",
  "dashboard.heatmapFocusDay": "{date}: {count} dk odaklanma",
  "dashboard.heatmapFocusEmpty": "{date}: odaklanma yok",
  "dashboard.heatmapRecordDay": "{date}: {count} kayıt",
  "dashboard.heatmapRecordEmpty": "{date}: kayıt yok",
  "dashboard.heatmapFocusTotal": "Son {weeks} haftada {count} dk",
  "dashboard.heatmapRecordTotal": "Son {weeks} haftada {count} kayıt",
  "dashboard.deadlines": "Yaklaşan son tarihler",
  "dashboard.courseAverages": "Ders ortalamaları",
  "dashboard.chartEmpty": "Kayıt bulunamadı",
  "dashboard.chartEmptyHint": "Gösterilecek yeterli veri yok.",
  "dashboard.col.task": "Görev",
  "dashboard.col.dueDate": "Son tarih",
  "dashboard.col.type": "Tür",
  "dashboard.col.status": "Durum",
  "dashboard.type.exam": "Sınav",
  "dashboard.type.event": "Etkinlik",
  "dashboard.type.payment": "Ödeme",
  "dashboard.type.appointment": "Randevu",
  "dashboard.type.homework": "Ödev",
  "dashboard.stats.attendance": "Yoklama",
  "dashboard.stats.homework": "Ödev",
  "dashboard.stats.students": "Öğrenciler",
  "dashboard.stats.children": "Çocuklar",
  "dashboard.stats.childAttendance": "Öğrenci devamı",
  "dashboard.stats.meals": "Yemek menüleri",
  "dashboard.stats.appointments": "Randevular",
  "dashboard.attend.present": "Var",
  "dashboard.attend.absent": "Yok",
  "dashboard.attend.late": "Geç",
  "dashboard.attend.excused": "İzinli",
  "dashboard.welcomeBack": "Tekrar hoş geldin, {name}!",
  "dashboard.welcomeHint": "Bugün dikkat etmen gerekenler burada.",
  "dashboard.quickReview.title": "Hızlı tekrar",
  "dashboard.quickReview.subtitle": "Öğrendiklerinizi yalnızca iki dakikada tazeleyin.",
  "dashboard.quickReview.placeholder": "Tekrar için konu seç…",
  "dashboard.quickReview.practice": "Alıştır",
  "dashboard.quickReview.startQuiz": "Teste başla",
  "dashboard.analytics": "Analitik",
  "dashboard.hero.heading": "Bugün ne yapıyoruz?",
  "dashboard.hero.searchPlaceholder": "Öğrenci ara",
  "dashboard.hero.searchPlaceholderAdmin": "Öğrenci, sayfa veya işlem ara",
  "dashboard.hero.searchPlaceholderAll": "Sayfa veya işlem ara",
  "dashboard.hero.searchEmpty": "Eşleşen öğrenci yok.",
  "dashboard.teacher.pendingAppointments": "Bekleyen talepler",
  "dashboard.teacher.pendingAppointmentsDesc": "Senden yanıt bekleyen randevu talepleri.",
  "dashboard.teacher.pendingAppointmentsEmpty": "Bekleyen talep yok.",
  "dashboard.teacher.schedule": "Bugünün programı",
  "dashboard.teacher.classPerformance": "Sınıf performansı",
  "dashboard.student.thisWeek": "Bu hafta",
  "dashboard.student.thisWeekDesc": "Pazartesiden pazara odaklanma dakikaları.",
  "dashboard.student.thisWeekTotal": "Bu hafta {minutes} dk",
  "dashboard.student.todayPlan": "Bugünün planı",
  "dashboard.student.mastery": "Konu yetkinliğim",
  "dashboard.student.audioWorkshop": "Ses atölyesi",
  "dashboard.parent.progress": "Gelişim",
  "dashboard.parent.teacherNotes": "Öğretmen notları",
  "dashboard.parent.child": "Öğrenci",
  "dashboard.parent.homeroom": "Danışman: {name}",
  "dashboard.parent.attendanceDetail": "Devamsızlık",
  "dashboard.parent.attendanceDetailDesc": "Bu öğrencinin devam dökümü.",
  "dashboard.parent.attendanceRate": "Devam oranı",
  "dashboard.parent.payment": "Ödeme durumu",
  "dashboard.parent.paymentDesc": "Bu öğrencinin ödeme planı.",
  "dashboard.parent.paymentEmpty": "Atanmış bir ödeme planı yok.",
  "dashboard.parent.installmentsPaid": "{paid} / {total} taksit ödendi",
  "dashboard.parent.nextInstallment": "Sonraki taksit",
  "dashboard.parent.balance": "Bakiye",
  "dashboard.quicklinks.students": "Öğrenciler",
  "dashboard.quicklinks.classes": "Sınıflar",
  "dashboard.quicklinks.modules": "Modüller",
  "dashboard.quicklinks.empty": "Henüz bir şey yok.",
  "dashboard.admin.rangeThisMonth": "Bu ay",
  "courseNotes.title": "Ders notları",
  "courseNotes.item": "ders notu",
  "courseNotes.new": "Yeni ders notu",
  "courseNotes.add": "Not ekle",
  "courseNotes.empty": "Bu derse ait henüz not yok.",
  "courseNotes.emptyManageHint": "Tüm sınıfın okuyabileceği bir not yazın, dosya da ekleyebilirsiniz.",
  "courseNotes.ragTitle": "YZ çıktıları",
  "courseNotes.ragEmpty": "Bu notta henüz YZ çıktısı yok.",
  "notes.title": "Defter",
  "notes.subtitle": "Ders fikirleriniz ve hatırlatmalarınız için özel defteriniz.",
  "notes.new": "Yeni not",
  "notes.write": "Yaz",
  "notes.preview": "Önizleme",
  "notes.empty": "Henüz bir şey yok. İlk notunu yaz.",
  "notes.noContent": "İçerik yok",
  "notes.files": "Ekler",
  "notes.filesHelp": "En fazla 10 dosya. Dosya başına {size} sınırı.",
  "notes.addFile": "Dosya ekle",
  "notes.import": "İçe aktar",
  "notes.importHelp": "PDF, TXT veya Markdown dosyanızı yükleyin. Satır sonları, sayfa numaraları ve gürültüler temizlenip düzenli bir nota dönüştürülür.",
  "notes.importReadError": "Bu dosyadan metin çıkarılamadı. Taranmış PDF ise önce OCR uygulayın.",
  "notes.draw": "Çiz",
  "notes.drawTitle": "Resim çiz",
  "draw.pen": "Kalem",
  "draw.eraser": "Silgi",
  "draw.pan": "Gezin",
  "draw.zoomIn": "Yakınlaştır",
  "draw.zoomOut": "Uzaklaştır",
  "draw.resetZoom": "Sıfırla",
  "draw.color": "Renk",
  "draw.width": "Çizgi kalınlığı",
  "draw.paper": "Kağıt",
  "draw.undo": "Geri al",
  "draw.clear": "Hepsini sil",
  "draw.save": "Çizimi kaydet",
  "draw.hint": "Parmağınla, kalemle ya da fareyle buraya çiz.",
  "draw.downloadPng": "PNG indir",
  "draw.downloadJpeg": "JPEG indir",
  "draw.bgNone": "Düz",
  "draw.bgLines": "Çizgili",
  "draw.bgGrid": "Kareli",
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
  "events.subtitle": "Tüm okul etkinliklerini ve öğrenci yoklama kayıtlarını tek bir listede görün.",
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
  "events.registrationRoster": "Kayıt listesi",
  "events.registrationRosterHelp": "Yoklama öncesi öğrencileri ekle ve bu etkinlikte beklenenleri kontrol et.",
  "events.registerStudent": "Öğrenciyi kaydet",
  "events.unregister": "Kaydı kaldır",
  "events.noRoster": "Henüz kayıtlı öğrenci yok.",
  "events.notMarked": "İşaretlenmedi",
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
  "calendar.title": "Takvim",
  "calendar.today": "Bugün",
  "calendar.noEvents": "Bu güne ait bir şey yok.",
  "calendar.events": "Etkinlikler",
  "calendar.exams": "Sınavlar",
  "calendar.appointments": "Randevular",
  "calendar.lessons": "Dersler",
  "calendar.studies": "Etütler ve kulüpler",
  "calendar.homework": "Ödev teslimi",
  "calendar.viewDay": "Gün",
  "calendar.viewWeek": "Hafta",
  "calendar.viewMonth": "Ay",
  "nav.appointments": "Randevular",
  "appointments.title": "Randevular",
  "appointments.subtitle": "Bir öğretmenin görüşmeye açtığı saatlerden birini seç, talebini buradan takip et.",
  "appointments.subtitleStaff": "Görüşebileceğin saatleri aç, gelen randevu taleplerini onayla ya da reddet.",
  "appointments.myBookingsHint": "Aldığın ve talep ettiğin görüşmeler ile her talebin son durumu.",
  "appointments.requestsHint": "Öğrenci ve velilerden gelen, cevabını bekleyen talepler.",
  "appointments.availableSlotsHint": "Öğretmenlerin görüşmeye açtığı saatler. Birini seçip randevu talebi gönder.",
  "appointments.mySlotsHint": "Görüşmeye açtığın saatler. Birini seçen kişi sana talep olarak ulaşır.",
  "appointments.empty": "Henüz randevu yok.",
  "appointments.mySlots": "Açtığım saatler",
  "appointments.availableSlots": "Öğretmenlerin açık saatleri",
  "appointments.requests": "Randevu talepleri",
  "appointments.myBookings": "Randevularım",
  "appointments.publish": "Saat aç",
  "appointments.book": "Randevu al",
  "appointments.approve": "Onayla",
  "appointments.reject": "Reddet",
  "appointments.cancel": "İptal et",
  "appointments.reschedule": "Yeni saat öner",
  "appointments.acceptReschedule": "Yeni saati kabul et",
  "appointments.declineReschedule": "Yeni saati reddet",
  "appointments.deleteSlot": "Bu saati sil",
  "appointments.deleteSeries": "Tüm seriyi sil",
  "appointments.note": "Not",
  "appointments.reason": "Sebep",
  "appointments.repeatWeekly": "Haftalık tekrarla",
  "appointments.until": "Şu tarihe kadar tekrarla",
  "appointments.starts": "Başlangıç",
  "appointments.ends": "Bitiş",
  "appointments.teacher": "Öğretmen",
  "appointments.student": "Talep eden",
  "appointments.proposedTime": "Önerilen saat",
  "appointments.newTime": "Yeni saat",
  "appointments.status.pending": "Bekliyor",
  "appointments.status.approved": "Onaylandı",
  "appointments.status.rejected": "Reddedildi",
  "appointments.status.cancelled": "İptal edildi",
  "appointments.confirmCancel": "Bu randevu iptal edilsin mi? Bu işlem geri alınamaz.",
  "appointments.confirmDeleteSlot": "Bu uygun saat silinsin mi? Bekleyen talepleri de düşecektir.",
  "appointments.confirmDeleteSeries": "Tüm haftalık seri silinsin mi? Serinin bütün saatleri kaldırılacak.",
  "appointments.rescheduleProposed": "Yeni bir saat önerildi ve talep edenin kabul etmesi bekleniyor.",
  "appointments.slotTaken": "Bu saat az önce başka biri tarafından alındı. Lütfen başka bir saat seçin.",
  "appointments.noSlots": "Şu anda uygun saat yok.",
  "appointments.series": "Seri",
  "appointments.time": "Saat",
  "appointments.status": "Durum",
  "appointments.publishSubtitle": "Öğrencilerin alabileceği bir saat aralığı sunun. İsterseniz haftalık tekrarlayın.",
  "appointments.bookSubtitle": "Öğretmene neden görüşmek istediğinizi belirtin.",
  "appointments.rescheduleSubtitle": "Farklı bir saat önerin; talep eden bunu kabul edebilir ya da reddedebilir.",
  "appointments.reasonPlaceholder": "Ne hakkında konuşmak istiyorsunuz?",
  "appointments.notePlaceholder": "Öğrenciler için isteğe bağlı not (ör. konu, yer).",
  "appointments.noRequests": "Randevu talebi yok.",
  "appointments.noBookings": "Henüz randevunuz yok.",
  "appointments.repeatWeeklyHelp": "Seçilen tarihe kadar her hafta aynı saati oluşturur (en fazla 52 kez).",
  "appointments.untilRequired": "Tekrarlanacak son tarihi seçin.",
  "appointments.tooManyOccurrences": "Bu aralık {count} haftalık saat oluşturur; sınır {max}. Daha yakın bir bitiş tarihi seçin.",
  "appointments.cancelTitle": "Randevu iptal edilsin mi?",
  "appointments.cancelAction": "Evet, iptal et",
  "appointments.cancelReasonLabel": "Neden (isteğe bağlı)",
  "appointments.cancelReasonPlaceholder": "Neden iptal ediyorsunuz?",
  "appointments.cancelledBy": "İptal eden",
  "appointments.details": "Detaylar",
  "appointments.cancelReason": "İptal nedeni",
  "appointments.rejectTitle": "Randevu talebi reddedilsin mi?",
  "appointments.rejectAction": "Reddet",
  "appointments.confirmReject": "Bu randevu talebi reddedilsin mi? Saat başkalarına açılır.",
  "appointments.rejectReasonLabel": "Neden (isteğe bağlı)",
  "appointments.rejectReasonPlaceholder": "Neden reddediyorsunuz?",
  "appointments.rejectReason": "Ret nedeni",
  "appointments.rejectedBy": "Reddeden",
  "appointments.reasonRequired": "Lütfen görüşme için bir sebep belirtin.",
  "events.clearStart": "Başlangıç saati temizlenecek",
  "events.clearEnd": "Bitiş saati temizlenecek",
  "events.upcoming": "Yaklaşan",
  "events.past": "Geçmiş",
  "exams.title": "Sınavlar",
  "exams.subtitle": "Derslerinizdeki tüm sınavlar. Yeni bir sınavı ilgili dersin içinden ekleyebilirsiniz.",
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
  "exams.details": "Sınav detayları",
  "exams.schedule": "Zamanlama",
  "exams.examStatistics": "Sınav istatistikleri",
  "exams.examQuestions": "Sınav soruları",
  "exams.studentResults": "Öğrenci notları",
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
  "exams.attemptsLeft": "Kalan",
  "exams.retakes": "Deneme hakkı",
  "exams.retakesHelp": "Öğrenciler sınav bitmeden bu kadar kez deneme yapabilir.",
  "exams.allowRejoin": "Yeniden girişe izin ver",
  "exams.allowRejoinHelp": "Kapalıysa sınav odasından çıkan öğrenci cevap vermek için geri giremez.",
  "exams.allowReview": "Öğrenciler cevaplarını inceleyebilsin",
  "exams.allowReviewHelp": "Bu sınavı notlandırdığınızda öğrenciler kendi kağıtlarını ve geçmiş denemelerini görebilir.",
  "exams.draft": "Taslak",
  "exams.draftHelp": "Yayınlanana kadar öğrencilerden gizle.",
  "exams.publish": "Sınavı yayınla",
  "exams.published": "Sınav yayınlandı",
  "exams.startTime": "Başlangıç saati",
  "exams.endTime": "Bitiş saati",
  "exams.scheduleRequired": "Zamanlı sınav için başlangıç ve bitiş gerekli",
  "exams.step1Details": "1. Sınav bilgileri",
  "exams.step2Questions": "2. Sorular",
  "exams.hasDuration": "Süre sınırı ekle",
  "exams.hasDurationHelp": "Öğrencilerin sınav odasında kaç dakikası olacağını belirler.",
  "exams.accessAndAttempts": "Erişim ve haklar",
  "exams.singleAttempt": "Tek hak (1)",
  "exams.multipleAttempts": "Çoklu hak",
  "exams.finishAndClose": "Tamamla ve kapat",
  "exams.nextQuestions": "Kaydet ve sorulara geç",
  "exams.sectionBasic": "Temel bilgiler",
  "exams.sectionSchedule": "Mod ve zamanlama",
  "exams.sectionDuration": "Süre sınırı",
  "exams.sectionAccess": "Katılım ve haklar",
  "exams.times": "defa",
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
  "questions.image": "Soru görseli",
  "questions.draw": "Görseli çiz",
  "questions.drawTitle": "Soru görselini çiz",
  "questions.editDrawing": "Çizimi düzenle",
  "questions.choiceImage": "Seçenek görseli",
  "questions.subjectRequired": "Bu soru için konu seç",
  "questions.subjectUnavailable": "Şu anki konu — artık sana açık değil",
  "questions.subjectUnavailableHelp": "Bu soruda kayıtlı konu, seçebileceğin listede yok. Kaydetmek için listeden bir konu seç.",
  "questions.textRequired": "Soru metni gerekli",
  "questions.pointsRange": "Puan 1–100 arası tam sayı olmalı",
  "questions.choicesRange": "Seçmeli soruda 2–10 seçenek gerekir; her biri en fazla 500 karakter olmalı",
  "questions.correctRequired": "Kaydetmeden önce bir seçeneği doğru cevap olarak işaretle.",
  "questions.correctRange": "Doğru indeks seçeneklerden birini göstermeli",
  "bank.title": "Soru bankası",
  "bank.subtitle": "Her öğretmenin sınavlarında kullanabileceği, paylaşımlı ve yeniden kullanılabilir soru şablonları.",
  "bank.empty": "Henüz şablon yok.",
  "bank.create": "Yeni şablon",
  "bank.edit": "Şablonu düzenle",
  "bank.owner": "Ekleyen",
  "bank.mine": "Benimkiler",
  "bank.usedCount": "Kullanım",
  "bank.created": "Eklenme",
  "bank.copyNotice": "Şablonu sınava eklemek bir kopya oluşturur. Şablonu sonradan düzenlemek, daha önce eklenmiş soruları değiştirmez.",
  "bank.courseSelect": "Ders seç",
  "bank.courseUnavailable": "Özgün ders — senin derslerinden değil",
  "bank.targetSubjectHint": "Bu kopyanın bu sınavda hangi konuya gireceğini seç.",
  "bank.courseHint": "Şablonlar bir konuyla etiketlenir; o konunun bağlı olduğu dersi seç. Şablon yine de her derste kullanılabilir.",
  "bank.fromBank": "Bankadan ekle",
  "bank.pickTemplate": "Şablon seç",
  "bank.targetSubject": "Bu sınavdaki konu",
  "bank.insert": "Sınava ekle",
  "bank.inserted": "Soru bankadan kopyalandı.",
  "bank.saveToBank": "Bankaya kaydet",
  "bank.saveCopyToBank": "Bankaya yeni bir kopya kaydet",
  "bank.saveCopyTitle": "İkinci bir kopya kaydedilsin mi?",
  "bank.saveCopyBody": "Bu soru bir banka şablonuna zaten bağlı. Kaydetmek mevcut şablonu güncellemez; bankada ikinci, ayrı bir şablon oluşturur. İki kopya birbirinden bağımsızdır: birini düzenlemek diğerini hiçbir zaman değiştirmez. Yeni şablon gizlidir: sen paylaşmayı seçene kadar onu yalnızca sen görebilirsin.",
  "bank.saveCopyConfirm": "Yeni kopya kaydet",
  "bank.savedToBank": "Soru bankaya kopyalandı. Sen paylaşana kadar onu yalnızca sen görebilirsin.",
  "bank.fromBankBadge": "Bankadan eklendi",
  "bank.savedToBankBadge": "Bankaya kaydedildi",
  "bank.search": "Soru metninde ara",
  "bank.pickerEmpty": "Eşleşen şablon yok.",
  "bank.noSubjects": "Bu sınavın dersinde henüz konu yok. Önce derse bir konu ekle.",
  "bank.countTotal": "Toplam {total} şablon.",
  "bank.countShown": "{total} şablondan {shown} tanesi gösteriliyor — daraltmak için arama yap.",
  "bank.whoCanSee": "Kimler görebilir",
  "bank.onlyMe": "Yalnızca ben",
  "bank.sharedWithSchool": "Okulla paylaşıldı",
  "bank.onlyMeHint": "Bu soruyu ve cevabını yalnızca sen görebilirsin. Güvenli seçenek budur.",
  "bank.sharedWithSchoolHint": "Okuldaki bütün öğretmenler bu soruyu ve doğru cevabını görebilir.",
  "bank.shareTitle": "Bu soru bütün okulla paylaşılsın mı?",
  "bank.shareBody": "Okuldaki bütün öğretmenler bu soruyu ve doğru cevabını görebilecek. Soru henüz bitmemiş bir sınavdaysa, öğrencilerin sınava girmeden önce cevabı görebilirler. Diğer öğretmenler soruyu kendi sınavlarına kopyalayabilir; sen soruyu sonradan yeniden gizlesen ya da silsen bile o kopyalar onlarda kalır. Alınan kopyaları geri alamazsın.",
  "bank.shareConfirm": "Evet, paylaş",
  "bank.startsPrivate": "Kaydedilen şablon gizli başlar: sen paylaşmayı seçene kadar onu yalnızca sen görebilirsin.",
  "bank.usedInExams": "Sınavlardaki kopyalar",
  "bank.refresh": "Şablondan güncelle",
  "bank.refreshTitle": "Bu soru şablonundan güncellensin mi?",
  "bank.refreshBody": "Bu soru, bir soru bankası şablonundan alınmış bir kopya. Güncellersen sorunun metni, puanı, seçenekleri, doğru cevabı ve resimleri şablonun bugünkü hâliyle değiştirilir. Bu kopyada yaptığın değişiklikler kaybolur. Bu işlem yalnızca sınava kimse başlamadan önce yapılabilir, bu yüzden hiçbir öğrencinin cevabı etkilenmez.",
  "bank.difficulty": "Zorluk",
  "bank.correctRate": "Doğru oranı",
  "bank.objective": "Kazanım",
  "bank.source": "Kaynak",
  "bank.source.institution": "Kurum",
  "bank.source.publisher": "Yayınevi",
  "bank.source.ai": "Yapay zekâ üretimi",
  "bank.refreshConfirm": "Evet, güncelle",
  "bank.refreshed": "Soru şablonundan güncellendi.",
  "subjects.title": "Konular",
  "subjects.item": "Konu",
  "subjects.subject": "Konu",
  "subjects.name": "Konu adı",
  "subjects.add": "Konu ekle",
  "subjects.edit": "Konuyu düzenle",
  "subjects.empty": "Henüz konu yok.",
  "subjects.select": "Konu seç",
  "subjects.help": "Bu eğitim kaydının müfredat konuları. Her sınav sorusu bir konuya bağlanmalı.",
  "pomodoro.title": "Pomodoro",
  "pomodoro.subtitle": "Odaklı çalışma oturumları başlatın ve harcadığınız süreyi takip edin.",
  "pomodoro.total": "Toplam odak",
  "pomodoro.running": "Devam ediyor",
  "pomodoro.idle": "Boşta",
  "pomodoro.start": "Odağı başlat",
  "pomodoro.finish": "Odağı bitir",
  "pomodoro.started": "Odak oturumu başladı.",
  "pomodoro.finished": "Odak oturumu bitti.",
  "pomodoro.history": "Son oturumlar",
  "pomodoro.empty": "Henüz odak oturumu yok.",
  "pomodoro.lookup": "Öğrencinin pomodoro odak geçmişini görmek için öğrenci seç.",
  "pomodoro.forUser": "{user} için pomodorolar",
  "pomodoro.startedAt": "Başlangıç",
  "pomodoro.finishedAt": "Bitiş",
  "pomodoro.duration": "Süre",
  "pomodoro.sessionLabel": "Odak etiketi",
  "pomodoro.sessionLabelPlaceholder": "Ne üzerinde çalışıyorsun?",
  "pomodoro.counted": "Katkı",
  "pomodoro.countedYes": "Sayıldı",
  "pomodoro.countedNo": "Sayılmadı",
  "pomodoro.focusConsole": "Odak paneli",
  "pomodoro.current": "Mevcut odak",
  "pomodoro.today": "Bugün",
  "pomodoro.average": "Ortalama",
  "pomodoro.sessions": "Oturum",
  "pomodoro.idleHelp": "Hazır olduğunda tek bir odaklı çalışma bloğu başlat.",
  "pomodoro.runningSince": "Başlangıç: {time}",
  "pomodoro.lastSession": "Son bitiş: {time}",
  "pomodoro.noRecentSession": "Henüz tamamlanmış oturum yok.",
  "pomodoro.remaining": "Kalan süre",
  "pomodoro.overtime": "Ek süre",
  "pomodoro.targetReached": "Süre doldu! Bitirebilir ya da devam edebilirsin.",
  "pomodoro.customMinutes": "Özel (dk)",
  "attempt.title": "Sınav odası",
  "attempt.openRoom": "Sınav odasını aç",
  "attempt.start": "Sınava başla",
  "attempt.resume": "Sınava devam et",
  "attempt.finish": "Sınavı bitir",
  "attempt.finishConfirm": "Evet, sınavı bitir",
  "attempt.finishHint": "Bu, sınavı bitirir ve cevaplarını teslim eder. Sonrasında cevaplarını değiştiremezsin.",
  "attempt.status": "Durum",
  "attempt.remaining": "Kalan süre",
  "attempt.attempt": "Deneme",
  "attempt.left": "Çıkış",
  "attempt.progress": "İlerleme",
  "attempt.deadline": "Bitiş zamanı",
  "attempt.notStarted": "Soruları görmek için zamanlı sınavı başlat.",
  "attempt.unscheduled": "Bu sınav çevrim içi oturum için zamanlanmamış.",
  "attempt.saved": "Kaydedildi",
  "attempt.saving": "Kaydediliyor…",
  "attempt.notSaved": "Kaydedilmedi",
  "attempt.notSavedHint": "Cevabın kaydedilmedi. Yazdığın cevap burada duruyor — \"Cevabı tekrar kaydet\"e basıp yeniden dene.",
  "attempt.saveTimeout": "Sınav cevabını onaylamadı, yani cevabın henüz kaydedilmedi. Cevabın ekranda duruyor — lütfen tekrar kaydetmeyi dene.",
  "attempt.saveDisconnected": "Cevabın kaydedilmeden bağlantı koptu. Cevabın ekranda duruyor — lütfen tekrar kaydetmeyi dene.",
  "attempt.saveAnswerRetry": "Cevabı tekrar kaydet",
  "attempt.savedAt": "Kayıt zamanı",
  "attempt.serverNow": "Sunucu saati",
  "attempt.mark": "Not",
  "attempt.saveAnswer": "Cevabı kaydet",
  "attempt.submitted": "Teslim edildi",
  "attempt.submittedCanRetakeInfo": "Bu denemenizi teslim ettiniz. Kalan haklarınızı kullanarak sınava tekrardan başlayabilirsiniz.",
  "attempt.submittedFinalInfo": "Bu sınavı zaten teslim ettin. Yeniden açılamaz.",
  "attempt.submittedAt": "Teslim tarihi",
  "exams.startsAt": "Başlangıç tarihi",
  "exams.endsAt": "Bitiş tarihi",
  "attempt.expired": "Süresi doldu",
  "attempt.expiredInfo": "Bu sınavın süresi doldu. Yeniden açılamaz.",
  "attempt.noAttemptsLeft": "Hak bitti",
  "attempt.closed": "Bu oturum kapalı. Cevaplar salt okunur.",
  "attempt.inProgress": "Devam ediyor",
  "attempt.absent": "Katılmadı",
  "exams.helpTitle": "Sınavlar hakkında",
  "exams.helpBody":
    "Sınavlar bir eğitim kaydına aittir. Öğretmenler detay sayfasından tür seçerek ekler; ağırlık sınav türünde tanımlıdır. Öğrenciler yalnızca kendi notunu görür. Ağırlıklı ortalamalar Karnem’dedir.",
  "admin.title": "Kişiler ve roller",
  "admin.subtitle": "Hesapların rolünü yükseltin veya düşürün. Kendi rolünüzü değiştiremezsiniz.",
  "admin.tabAll": "Tüm kullanıcılar",
  "admin.tabManagers": "Yöneticiler",
  "admin.tabTeachers": "Öğretmenler",
  "admin.tabParents": "Veliler",
  "admin.tabStudents": "Öğrenciler",
  "admin.tabInvites": "Davetler",
  "admin.inviteUser": "Kullanıcı davet et",
  "admin.username": "Kullanıcı adı",
  "admin.id": "Id",
  "admin.role": "Rol",
  "admin.directory": "Kayıt listesi",
  "admin.helpTitle": "Rol hiyerarşisi",
  "admin.helpBody":
    "öğrenci < öğretmen < yönetici < admin. Üst roller alt yetkileri miras alır. Kayıt her zaman öğrenci oluşturur. Rolleri yalnız admin değiştirir.",
  "admin.noUsers": "Henüz kayıtlı kullanıcı yok.",
  "guide.title": "Ürün rehberi",
  "guide.subtitle": "Derslerden sınavlara, karnelerden notlara ve etkinliklere kadar platformun nasıl bir arada çalıştığı.",
  "guide.roles.title": "Rol bazlı yetki haritası",
  "guide.roles.subtitle": "Platformdaki her bir rolün erişebildiği ve yönetebildiği alanlar.",
  "guide.roles.adminTab": "Yönetici ve admin",
  "guide.roles.student.heading": "Öğrenci çalışma ve katılım araçları",
  "guide.roles.student.i1": "Kendi özel defterinde not tutma, PDF aktarma ve çizim yapma",
  "guide.roles.student.i2": "Soru havuzunda soru sorma, diğer sorulara çözüm yazma",
  "guide.roles.student.i3": "Kaydolunan derslerin sınav odasına girme ve süreli sınav çözme",
  "guide.roles.student.i4": "Kendi karne ortalamasını ve devamsızlık durumunu izleme",
  "guide.roles.teacher.heading": "Öğretmen yönetim ve eğitici paneli",
  "guide.roles.teacher.i1": "Ders, etüt ve kulüp oluşturma, öğrencileri derse kaydetme",
  "guide.roles.teacher.i2": "Ders oturumlarında öğrenci yoklaması alma (Var, Yok, Geç, Mazeretli)",
  "guide.roles.teacher.i3": "Sınav oluşturma, sorular ekleme ve canlı sınav takibi yürütme",
  "guide.roles.teacher.i4": "Öğrenci sınav kağıtlarını inceleme, puan verme ve karne onaylama",
  "guide.roles.parent.heading": "Veli takip ve bilgilendirme portalı",
  "guide.roles.parent.i1": "Bağlı öğrencilerin ders devamsızlık kayıtlarını anlık izleme",
  "guide.roles.parent.i2": "Öğrencinin ders bazlı karne başarı ortalamalarını görüntüleme",
  "guide.roles.parent.i3": "Yaklaşan sınav ve etkinlik takvimini takip etme",
  "guide.roles.parent.i4": "Öğretmenler ve okul yönetimi ile doğrudan mesajlaşma",
  "guide.roles.admin.heading": "Yönetici ve sistem politikaları paneli",
  "guide.roles.admin.i1": "Kullanıcı hesapları oluşturma, rollerini atama (öğrenci, öğretmen, veli)",
  "guide.roles.admin.i2": "Okul akademik dönemleri, sınav türleri ve ağırlık oranlarını tanımlama",
  "guide.roles.admin.i3": "Tüm ders ve etkinlik kayıtlarını genel denetim seviyesinde yönetme",
  "guide.roles.admin.i4": "Personel çalışma günlüklerini ve sistem loglarını inceleme",
  "guide.modules.title": "Temel akışlar ve özellikler",
  "guide.modules.subtitle": "Hezarfen platformundaki ana modülleri ve kullanım adımlarını inceleyin.",
  "guide.step.ai.badge": "Yapay zeka",
  "guide.step.ai.title": "Çelebi AI asistanı",
  "guide.step.ai.description": "Tüm sayfalardan üst barda bulunan “Çelebi’ye Sor” butonuyla erişilebilir akıllı yapay zeka asistanı. Kampüs verileriniz, ders konularınız ve sistem hakkında anlık yanıtlar verir.",
  "guide.step.ai.cta": "Çelebi'yi dene",
  "guide.step.ai.f1": "Tüm sayfalardan tek tıkla erişim",
  "guide.step.ai.f2": "Kampüs ve ders odaklı yanıtlar",
  "guide.step.ai.f3": "Bağlamsal çalışma rehberliği",
  "guide.step.notes.badge": "Notlar ve çizim",
  "guide.step.notes.title": "Akıllı defter ve çizim tuvali",
  "guide.step.notes.description": "PDF, TXT ve Markdown materyallerinizi temiz Markdown notlarına dönüştürün. Dahili .hzdraw tuvali ile derslerinize serbest el çizimleri ve grafikler ekleyin.",
  "guide.step.notes.cta": "Notlara git",
  "guide.step.notes.f1": "PDF ve TXT otomatik dönüştürücü",
  "guide.step.notes.f2": "Dahili .hzdraw serbest çizim tuvali",
  "guide.step.notes.f3": "Markdown biçimlendirme ve OCR uyarısı",
  "guide.step.questions.badge": "Soru havuzu",
  "guide.step.questions.title": "Soru havuzu ve çözümler",
  "guide.step.questions.description": "Topluluk soru havuzunda sorularınızı paylaşın, yazılı ve çoktan seçmeli çözümler ekleyin. Öğretmen onaylı çözümlerle ders konularında uzmanlaşın.",
  "guide.step.questions.cta": "Soru havuzu",
  "guide.step.questions.f1": "Yazılı ve test çözümleri",
  "guide.step.questions.f2": "Öğretmen onaylı çözüm rozeti",
  "guide.step.questions.f3": "Filtrelenebilir konu ve durum kategorileri",
  "guide.step.courses.badge": "Dersler ve etütler",
  "guide.step.courses.title": "Dersler, etütler ve kulüpler",
  "guide.step.courses.description": "Ders, etüt ve kulüp programı. Öğretmenler öğrenci kaydeder, ders içi oturum yoklaması (Var, Yok, Geç, Mazeretli) alır ve müfredat takibi yapar.",
  "guide.step.courses.cta": "Derslerim",
  "guide.step.courses.f1": "Öğrenci ders kayıt yönetimi",
  "guide.step.courses.f2": "Anlık oturum yoklaması alma",
  "guide.step.courses.f3": "Sınav ve etüt takvimi hizalaması",
  "guide.step.exams.badge": "Sınav odası",
  "guide.step.exams.title": "Sınav odası ve canlı takip",
  "guide.step.exams.description": "Geri sayım ve otomatik kaydetmeli canlı sınav odası. Öğretmenler canlı izleme panelinden yanıt kağıtlarını ve anlık puanlama önerilerini takip eder.",
  "guide.step.exams.cta": "Sınav odası",
  "guide.step.exams.f1": "Sunucu saati senkronize geri sayım",
  "guide.step.exams.f2": "WebSocket ve REST otomatik kaydetme",
  "guide.step.exams.f3": "Canlı öğretmen izleme ve puanlama",
  "guide.step.marks.badge": "Karne ve devam",
  "guide.step.marks.title": "Karne ve ilerleme raporu",
  "guide.step.marks.description": "Dönem ders ortalamaları ve sınav türü ağırlıklarına göre hesaplanan genel başarı puanı. Devamsızlık istatistikleri ile anlık gelişim takibi.",
  "guide.step.marks.cta": "Karnem",
  "guide.step.marks.f1": "Ağırlıklı sınav puan ortalaması",
  "guide.step.marks.f2": "Devamsızlık ve mazeret özetleri",
  "guide.step.marks.f3": "Detaylı grafik ve ders raporları",
  "guide.tips.title": "Pratik ipuçları ve kısayollar",
  "guide.tips.subtitle": "Hezarfen deneyimini en verimli şekilde kullanmanızı sağlayan püf noktaları.",
  "guide.tips.locale.title": "Dil ve tema seçimi",
  "guide.tips.locale.body": "Kenar çubuğunun altındaki hesap menüsünden Türkçe / İngilizce dilleri ve açık / koyu temalar arasında anında geçiş yapabilirsiniz.",
  "guide.tips.sync.title": "Otomatik senkronizasyon",
  "guide.tips.sync.body": "Sınav odasındaki yanıtlarınız ve çizim tuvalindeki taslaklarınız sunucu saatiyle arka planda güvenle kaydedilir.",
  "guide.tips.import.title": "Hızlı not içe aktarma",
  "guide.tips.import.body": "Notlar sayfasındaki içe aktar butonuyla PDF ve TXT ders dokümanlarınızı temiz Markdown metinlerine dönüştürebilirsiniz.",
  "guide.tips.weights.title": "Ağırlıklı not hesaplaması",
  "guide.tips.weights.body": "Sınav sonuçlarınız, okul yönetiminin tanımladığı sınav türü ağırlıklarına göre doğrudan karne ortalamanıza yansıtılır.",
  "guide.rolesTitle": "Kim ne yapabilir?",
  "guide.rolesBody":
    "Öğrenci: notlar, yoklama, ders/sınav görüntüleme, kendi sonucu ve karne. Öğretmen: ders/etkinlik, kayıt, sınav, not. Yönetici: her ders/etkinlik. Admin: roller.",
  "guide.tipsTitle": "İpuçları",
  "courses.helpTitle": "Eğitim hakkında",
  "courses.helpBody":
    "Eğitim kayıtları ders, etüt veya kulüp olabilir. Öğretmen öğrenci kaydeder ve buradan sınav ekler; ortalamalarda sınav türü ağırlığı kullanılır. Bir kaydı silmek sınavları, sonuçları ve kayıtları da siler.",
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
  "form.noTeachers": "Uygun öğretmen yok",
  "form.searchNoPermission": "Kullanıcı aramak için yetkin yok.",
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
  "role.parent": "Veli",
  "role.teacher": "Öğretmen",
  "role.manager": "Yönetici",
  "role.admin": "Sistem yöneticisi",
  "courses.title": "Eğitim",
  "courses.listTitle": "{item} kayıtları",
  "courses.subtitle": "{item}, kayıtları ve sınavları tek bir yerden yönetin.",
  "courses.pageSubtitle": "Dersler, etütler ve kulüplerin tümü tek bir yerde.",
  "courses.create": "Yeni eğitim kaydı",
  "courses.empty": "Henüz {item} yok.",
  "courses.enrolled": "Kayıtlı",
  "courses.roster": "Sınıf listesi",
  "courses.rosterItem": "Öğrenci",
  "courses.enroll": "Öğrenci kaydet",
  "courses.exams": "Ders sınavları",
  "courses.examItem": "Sınav",
  "courses.addExam": "Sınav ekle",
  "courses.weight": "Ağırlık",
  "courses.delete": "Dersi sil",
  "courses.kind": "Ders türü",
  "courses.kind.course": "Dersler",
  "courses.kind.study": "Etüt",
  "courses.kind.club": "Kulüp",
  "courses.kind.courseSingular": "Ders",
  "courses.kind.studySingular": "Etüt",
  "courses.kind.clubSingular": "Kulüp",
  "courses.capacity": "Kapasite",
  "courses.unlimited": "Sınırsız",
  "courses.capacityOptional": "İsteğe bağlı kontenjan",
  "courses.teachers": "Öğretmenler",
  "courses.assignTeacher": "Öğretmen ata",
  "courses.unassignTeacher": "Öğretmeni çıkar",
  "courses.confirmUnassignTeacher": "Bu öğretmeni dersten çıkarmak istediğinize emin misiniz?",
  "courses.teacherAssigned": "Öğretmen başarıyla atandı.",
  "courses.teacherUnassigned": "Öğretmen başarıyla çıkarıldı.",
  "courses.noTeachers": "Atanmış öğretmen yok.",
  "courses.overview": "Genel bakış",
  "courses.work": "Çalışmalar",
  "courses.people": "Kişiler",
  "courses.upcoming": "Yaklaşan çalışmalar",
  "courses.noUpcoming": "Yaklaşan çalışma yok.",
  "courses.nextExam": "Sıradaki sınav",
  "courses.nextHomework": "Sıradaki ödev",
  "courses.weeklyHours": "Haftalık saat",
  "courses.competency": "Yetkinlik",
  "courses.attendanceRate": "Devam",
  "courses.progress": "İlerleme",
  "courses.takeAttendance": "Yoklama al",
  "courses.analysis": "Analiz",
  "homework.title": "Ödevler",
  "homework.item": "Ödev",
  "homework.add": "Ödev ekle",
  "homework.edit": "Ödevi düzenle",
  "homework.empty": "Henüz ödev yok.",
  "homework.help": "Bu ders için ödev ver ve son teslim tarihini takip et.",
  "homework.listHelp": "Görebildiğin tüm ödevler. Yönetmek için satırı açıp dersine git.",
  "homework.dueAt": "Son teslim",
  "homework.assigned": "Atanan",
  "homework.wholeCourse": "Tüm ders",
  "homework.wholeCourseHelp": "İlk sürüm ödevi tüm derse atar. Öğrenci alt grupları için çoklu seçim arayüzü gelene kadar backend API kullanılabilir.",
  "homework.dueRequired": "Geçerli bir son teslim tarihi ve saati seç.",
  "homework.mineTitle": "Ödevlerim",
  "homework.submit": "Ödevi teslim et",
  "homework.submitHelp": "İstersen yazılı cevap kaydet ve dosya ekle.",
  "homework.withdraw": "Teslimi geri çek",
  "homework.withdrawHint": "Cevabını ve eklediğin tüm dosyaları siler. Ödev notlandırıldıysa yapılamaz.",
  "homework.answerPlaceholder": "İsteğe bağlı cevabını yaz...",
  "homework.fileUploaded": "Dosya yüklendi.",
  "homework.submittedAt": "Teslim zamanı",
  "homework.late": "Geç",
  "homework.submission": "Teslim",
  "homework.submissions": "Teslimler",
  "homework.submissionsHelp": "Öğrenci teslimlerini incele ve sonucu kaydet.",
  "homework.submitted": "Teslim edildi",
  "homework.notSubmitted": "Teslim edilmedi",
  "homework.tab.todo": "Yapılacak",
  "homework.tab.submitted": "Teslim edilen",
  "homework.tab.graded": "Değerlendirilen",
  "homework.tab.open": "Açık",
  "homework.tab.past": "Süresi geçen",
  "homework.result": "Sonuç",
  "homework.grade": "Notlandır",
  "homework.ungrade": "Notu kaldır",
  "homework.student": "Öğrenci",
  "homework.noAnswer": "Yazılı cevap yok.",
  "homework.status.done": "Tamamlandı",
  "homework.status.incomplete": "Eksik",
  "homework.status.missing": "Yok",
  "marks.title": "Karnem",
  "marks.subtitle": "Kayıtlı olduğunuz tüm derslerdeki ağırlıklı not ortalamalarınız.",
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
  "marks.tabGeneral": "Genel",
  "marks.tabByCourse": "Derslere göre",
  "marks.selectCourse": "Ders",
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
  "exams.liveMonitor": "Canlı izleme",
  "exams.liveMonitorDesc": "Sınav durumu, ilerleme ve notlar gerçek zamanlı.",
  "exams.finalState": "Son durum",
  "exams.finalStateDesc": "Sınav sonuçları, ilerleme ve notlar.",
  "exams.liveRoster": "Canlı liste",
  "exams.notStarted": "Başlamadı",
  "exams.lastActivity": "Son hareket",
  "exams.answerSheet": "Cevap Kâğıdı",
  "exams.autoScore": "Otomatik puan",
  "exams.answersRight": "Doğru",
  "exams.answersWrong": "Yanlış",
  "exams.answersEmpty": "Boş",
  "exams.answersPending": "Değerlendirilmedi",
  "exams.earned": "Alınan",
  "exams.possible": "Mümkün",
  "exams.isCorrect": "Doğru",
  "exams.textAnswer": "Metin cevap",
  "exams.drawAnswer": "Cevabı çiz",
  "exams.previousAttempts": "Önceki denemeler",
  "exams.attemptN": "{n}. deneme",
  "exams.markHistory": "Not geçmişi",
  "exams.currentAttempt": "güncel",
  "exams.pastAttemptReadOnly": "Önceki bir deneme görüntüleniyor — salt okunur. Puanlama güncel denemeye uygulanır.",
  "exams.reviewInProgress": "İncelemek için önce mevcut denemeni gönder.",
  "exams.uploadAnswerImage": "Görsel yükle",
  "exams.playDrawing": "Çizimi oynat",
  "exams.showImage": "Görseli göster",
  "exams.play": "Oynat",
  "exams.pause": "Duraklat",
  "exams.restart": "Baştan al",
  "exams.editDrawing": "Çizimi düzenle",
  "exams.removeDrawing": "Çizimi kaldır",
  "exams.nameless": "İsimsiz",
  "exams.emptyRoster": "Henüz kayıtlı öğrenci yok.",
  "exams.selectStudent": "Listeden bir öğrenci seç",
  "exams.viewSheet": "Cevapları gör",
  "profile.title": "Profil",
  "profile.subtitle": "Kişisel bilgileriniz. Tüm alanların doldurulması isteğe bağlıdır.",
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
  "course.fromClass": "{name} şubesinden",
  "course.removeStudentConfirm": "Bu öğrenciyi çıkarmak istediğine emin misin?",
  "events.userIdRequired": "Önce bir öğrenci seçmelisin.",
  "settings.title": "Okul ayarları",
  "settings.subtitle": "Okul genelinde kullanılan sınav türlerini, yoklama durumlarını ve not bantlarını buradan yapılandırın.",
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
  "settings.maxFileSizeHelp": "Not ekleri için dosya başına yükleme sınırı, MiB cinsinden. İzin verilen aralık: 0,001–25 MiB.",
  "whiteboard.participantCount": "Katılımcı: {count}",
  "settings.maxFileSizeInvalid": "Geçerli bir dosya boyutu gir.",
  "settings.mealSlotNameInvalid": "Öğün adı / \\ ? # veya % içeremez.",
  "settings.aiPolicy": "Yapay zekâ politikası",
  "settings.aiPolicyHelp": "Konuşma bağlamı, konu sayısı ve mesaj uzunluğu sınırları.",
  "settings.modules": "Modüller",
  "settings.modulesHelp": "Okulunuzda açık olan özellikler, pakete göre gruplu. Kapalı özellikler gezgin menüde gizlenir.",
  "settings.chatHistory": "Geçmiş turu",
  "settings.chatThreads": "En fazla konu",
  "settings.chatMessage": "Mesaj uzunluğu",
  "settings.foodPolicy": "Yemek politikası",
  "settings.foodPolicyHelp": "Öğün saatleri UTC girilir. Boş listeler yemek programını kapatır.",
  "settings.mealCutoff": "Rezervasyon/iptal kapanışı (dakika)",
  "settings.noCutoff": "Kapanış yok",
  "settings.mealSlot": "Öğün",
  "settings.servingTimeUtc": "Servis saati (UTC)",
  "settings.addMealSlot": "Öğün ekle",
  "settings.dietaryTags": "Beslenme etiketleri",
  "settings.addDietaryTag": "Beslenme etiketi ekle",
  "settings.tabAssessment": "Değerlendirme",
  "settings.tabMeals": "Yemekhane",
  "settings.tabSystem": "Sistem",
  "settings.tabAppearance": "Görünüm",
  "settings.colorPalette": "Renk paleti",
  "settings.colorPaletteHelp": "Coolors trend paletlerinden bir vurgu rengi seç. Yalnızca bu tarayıcıda saklanır.",
  "settings.colorPaletteSource": "Trend paletlere göz at",
  "settings.defaultColor": "Varsayılan rengi kullan",
  "meals.title": "Yemekler",
  "meals.subtitle": "Menüleri tarihe göre inceleyin, beslenme gereksinimlerini yönetin ve yemek hesaplarını takip edin.",
  "meals.publish": "Menü yayınla",
  "meals.publishHelp": "Her tarih ve öğün için tek menü.",
  "meals.date": "Menü tarihi",
  "meals.slot": "Öğün",
  "meals.capacity": "Kapasite",
  "meals.reservations": "Rezervasyon",
  "meals.from": "Başlangıç tarihi",
  "meals.empty": "Bu tarih aralığında menü yok.",
  "meals.dishes": "yemek",
  "meals.conflict": "Beslenme uyarısı",
  "meals.topPick": "En çok tercih",
  "meals.menu": "Menü",
  "meals.detailHelp": "Yemekler, rezervasyon, beslenme uyarıları, servis ve hesap kayıtları.",
  "meals.total": "Toplam fiyat",
  "meals.cutoff": "Kapanış",
  "meals.noCutoff": "Kapanış yok",
  "meals.bookingStatus": "Rezervasyon",
  "meals.closed": "Kapalı",
  "meals.open": "Açık",
  "meals.child": "Çocuk",
  "meals.myAccount": "Hesap",
  "meals.service": "Servis kaydı",
  "meals.manage": "Yönet",
  "meals.noDishes": "Henüz yemek eklenmedi.",
  "meals.booked": "Rezerve edildi",
  "meals.notBooked": "Rezervasyon yok",
  "meals.cutoffPassed": "Rezervasyon ve iptal süresi geçti.",
  "meals.bookingHelp": "Kapasiteyi, kapanışı, çakışmaları ve fiyatı sunucu doğrular.",
  "meals.book": "Yer ayır",
  "meals.cancelBooking": "Rezervasyonu iptal et",
  "meals.cancelSummary": "İptal yeri serbest bırakır ve ilk ücretin tam ters kaydını ekler. Kapanıştan sonra reddedilir.",
  "meals.cancelled": "Rezervasyon iptal edildi.",
  "meals.dietaryProfile": "Beslenme profili",
  "meals.noDietaryNotes": "Beslenme notu yok.",
  "meals.balance": "Bakiye",
  "meals.ledger": "Hesap hareketleri",
  "meals.ledger.charge": "Yemek ücreti",
  "meals.ledger.credit": "Kredi",
  "meals.ledger.reversal": "İade",
  "meals.noLedger": "Hesap hareketi yok.",
  "meals.attendance": "Yemek katılımı",
  "meals.walkIn": "Rezervasyonsuz",
  "meals.served": "Servis edildi",
  "meals.missed": "Gelmedi",
  "meals.notMarked": "İşaretlenmedi",
  "meals.addDish": "Yemek ekle",
  "meals.studentRecord": "Öğrenci yemek kaydı",
  "meals.student": "Öğrenci",
  "meals.dietaryNote": "Mutfak notu",
  "meals.bookingAudit": "Rezervasyon denetimi",
  "meals.recordCredit": "Kredi kaydet",
  "meals.creditAppendOnly": "Krediler yalnızca eklenir. Düzeltme dengeleyici yeni kayıt gerektirir.",
  "meals.amountTry": "Tutar (TRY)",
  "meals.method": "Yöntem",
  "meals.note": "Not",
  "meals.creditRecorded": "Kredi kaydedildi.",
  "meals.deleteMenu": "Menüyü sil",
  "meals.deleteDish": "Yemeği sil",
  "meals.editMenu": "Menüyü düzenle",
  "meals.editDish": "Yemeği düzenle",
  "meals.dishName": "Yemek adı",
  "meals.priceTry": "Fiyat (TRY)",
  "nav.payments": "Ödeme ve tahsilat",
  "nav.paymentStatement": "Ücretlerim",
  "nav.whiteboards": "Tahta",
  "whiteboard.title": "Beyaz tahtalar",
  "whiteboard.subtitle": "Canlı ortak çizim tahtaları.",
  "whiteboard.searchPlaceholder": "Başlığa göre ara…",
  "whiteboard.empty": "Henüz beyaz tahta yok.",
  "whiteboard.create": "Yeni tahta",
  "whiteboard.edit": "Tahtayı düzenle",
  "whiteboard.titleLabel": "Başlık",
  "whiteboard.participants": "Katılımcılar",
  "whiteboard.participantsHint": "Çizebilecek öğrenci ve personeli davet edin.",
  "whiteboard.open": "Aç",
  "whiteboard.createdAt": "Oluşturuldu",
  "whiteboard.limitReached": "Beyaz tahta sınırına ulaştınız.",
  "whiteboard.canvasHint": "Buraya çizin — tahtadaki herkes anlık görür.",
  "whiteboard.closedBadge": "Kapalı",
  "whiteboard.lockedBadge": "Kilitli",
  "whiteboard.readOnlyBadge": "Salt okunur",
  "whiteboard.lock": "Kilitle",
  "whiteboard.unlock": "Kilidi aç",
  "whiteboard.clear": "Temizle",
  "whiteboard.clearConfirm": "Canlı tuval temizlensin mi? Geçmiş korunur ve tekrar oynatılabilir.",
  "whiteboard.close": "Tahtayı kapat",
  "whiteboard.closeConfirm": "Bu tahta kapatılsın mı? Kalıcı olarak salt okunur olur.",
  "whiteboard.delete": "Tahtayı sil",
  "whiteboard.deleteConfirm": "Bu tahta ve tüm geçmişi silinsin mi? Geri alınamaz.",
  "whiteboard.creator": "Oluşturan",
  "whiteboard.roster": "Katılımcılar",
  "whiteboard.addParticipant": "Katılımcı ekle",
  "whiteboard.removeParticipant": "Çıkar",
  "whiteboard.history": "Geçmiş",
  "whiteboard.noHistory": "Henüz geçmiş oturum yok.",
  "whiteboard.replaySession": "Oturumu oynat",
  "whiteboard.play": "Oynat",
  "whiteboard.pause": "Duraklat",
  "whiteboard.restart": "Baştan",
  "whiteboard.notFound": "Bu beyaz tahta yok ya da üzerinde değilsiniz.",
  "whiteboard.back": "Beyaz tahtalara dön",
  "payments.title": "Okul ücretleri",
  "payments.subtitle": "Ücret planları, atamalar ve ödeme hareketleri.",
  "payments.empty": "Henüz ücret planı yok.",
  "payments.createPlan": "Yeni plan",
  "payments.editPlan": "Planı düzenle",
  "payments.deletePlan": "Planı sil",
  "payments.planName": "Plan adı",
  "payments.installments": "Taksitler",
  "payments.addInstallment": "Taksit ekle",
  "payments.amountTry": "Tutar (TRY)",
  "payments.dueDate": "Vade tarihi",
  "payments.total": "Toplam",
  "payments.assign": "Ata",
  "payments.assignHelp": "Atama, tüm taksitleri anında ücret olarak yansıtır. Planda olan öğrenciye tekrar ücret çıkmaz.",
  "payments.selectStudent": "Öğrenci seç",
  "payments.assignments": "Atanan öğrenciler",
  "payments.noAssignments": "Henüz öğrenci atanmadı.",
  "payments.outcomeAssigned": "Atandı",
  "payments.outcomeAlready": "Zaten atanmış",
  "payments.outcomeRejected": "Reddedildi",
  "payments.studentLedger": "Öğrenci hesabı",
  "payments.balance": "Bakiye",
  "payments.ledger": "Hesap hareketleri",
  "payments.noLedger": "Hesap hareketi yok.",
  "payments.recordPayment": "Ödeme kaydet",
  "payments.recordRefund": "İade et",
  "payments.reverse": "Ters kaydet",
  "payments.method": "Yöntem",
  "payments.note": "Not",
  "payments.reason": "Gerekçe",
  "payments.kindCharge": "Ücret",
  "payments.kindCredit": "Ödeme",
  "payments.kindRefund": "İade",
  "payments.kindReversal": "Ters kayıt",
  "payments.statementTitle": "Ücretlerim",
  "payments.statementSubtitle": "Okula borcunuz ve arkasındaki tüm ücretler.",
  "payments.noStatement": "Henüz ücret yok.",
  "payments.due": "Vade",
  "payments.credited": "Ödenen",
  "payments.refunded": "İade",
  "payments.outstanding": "Kalan",
  "payments.status": "Durum",
  "payments.overdue": "Gecikmiş",
  "payments.reversed": "Ters kaydedildi",
  "payments.paid": "Ödendi",
  "payments.appendOnly": "Hesap yalnızca eklenir. Düzeltme, düzenleme değil dengeleyici kayıt gerektirir.",
  "payments.tabCollect": "Tahsilat",
  "payments.tabPlans": "Ücret planları",
  "payments.periodBilled": "Bu dönem tahakkuk",
  "payments.periodCollected": "Tahsil edilen",
  "payments.periodOverdue": "Gecikmiş",
  "payments.periodExpected": "Bu ay beklenen",
  "payments.exportStatement": "Ekstre indir",
  "payments.entryTabAll": "Tümü",
  "payments.entryTabOverdue": "Gecikmiş",
  "payments.entryTabMonth": "Bu ay",
  "payments.entryTabClosed": "Kapanmış",
  "payments.collect": "Tahsilat al",
  "payments.collectFrom": "Tahsilat al",
  "payments.totalDebt": "Toplam borç",
  "payments.collected": "Tahsil edilen",
  "payments.overdueCount": "Gecikmiş",
  "payments.statusPending": "Bekliyor",
  "payments.statusPartial": "Kısmi",
  "payments.statusCancelled": "İptal edildi",
  "payments.noDebt": "Bu öğrenci için henüz borç yok.",
  "payments.noDebtHint": "Bu öğrenciye borç çıkmak için Ücret planları sekmesinden bir plan atayın.",
  "payments.methodCash": "Nakit",
  "payments.methodTransfer": "Havale / EFT",
  "payments.methodCard": "Kredi kartı",
  "payments.methodCheck": "Çek",
  "payments.methodOther": "Diğer",
  "payments.methodRequired": "Bir ödeme yöntemi girin.",
  "payments.addStudent": "Öğrenci ekle",
  "payments.selectedStudents": "Seçilen öğrenciler ({count})",
  "payments.assignSelected": "Seçilenleri ata",
  "payments.assignmentSummary": "Atandı: {assigned} · Zaten atanmış: {alreadyAssigned} · Reddedildi: {rejected}",
  "payments.ledgerAudit": "Hesap hareketleri",
  "payments.showLedger": "Hesap hareketlerini göster",
  "payments.hideLedger": "Hesap hareketlerini gizle",
  "payments.plan": "Plan",
  "payments.student": "Öğrenci",
  "payments.username": "Kullanıcı adı",
  "payments.allStudents": "Tüm öğrenciler",
  "payments.allPlans": "Tüm planlar",
  "payments.inDebt": "Borçlu",
  "payments.settled": "Borçsuz",
  "terms.title": "Akademik dönemler",
  "terms.subtitle": "Akademik dönemleri yönetin ve dersleri ilgili dönemlere atayın.",
  "terms.create": "Dönem oluştur",
  "terms.edit": "Dönemi düzenle",
  "terms.empty": "Henüz dönem yok.",
  "terms.term": "Dönem",
  "terms.unassigned": "Atanmamış",
  "terms.dateRequired": "Başlangıç ve bitiş tarihi gerekli.",
  "terms.archive": "Dönemi arşivle",
  "terms.unarchive": "Dönemi yeniden aç",
  "terms.archived": "Arşivli",
  "sessions.title": "Ders oturumları",
  "sessions.item": "Oturum",
  "sessions.subtitle": "Ders oturumlarını planlayın ve her ders için yoklama alın.",
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
  "attendance.subtitle": "Etkinlik yoklamalarınız ve ders oturumu devam oranlarınız.",
  "attendance.events": "Etkinlikler",
  "attendance.sessions": "Ders oturumları",
  "attendance.rate": "Oran",
  "attendance.courseBreakdown": "Ders dökümü",
  "attendance.emptyCourses": "Henüz ders yoklaması yok.",
  "attendance.lookup": "Bir öğrencinin yoklama raporunu aç.",
  "attendance.show": "Yoklamayı göster",
  "attendance.forUser": "{user} yoklaması",
  "attendance.totalAbsence": "Toplam devamsızlık",
  "attendance.overallRate": "Devam oranı",
  "work.title": "Mesai kaydı",
  "work.subtitle": "Mesai saatlerinizi kaydetmek için giriş ve çıkış yapın.",
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
  "work.daysThisMonth": "Bu ay {count} gün çalıştı",
  "work.totalEntries": "{count} kayıt",
  "work.noActivity": "Henüz kayıt yok",
  "work.searchPlaceholder": "Personel ara…",
  "work.location": "Konum",
  "work.quality": "İş kalitesi",
  "work.addEntry": "Kayıt ekle",
  "work.planShift": "Vardiya planla",
  "lookup.searchHint": "Aramak için en az 2 karakter yaz.",
  "work.userNotFound": "Bu kullanıcı için mesai kaydı bulunamadı.",
  "work.show": "Kaydı göster",
  "work.forUser": "{user} için kayıtlar",
  "work.correct": "Kaydı düzelt",
  "work.correctHelp": "Yalnızca kapalı mesailer düzeltilebilir.",
  "work.cannotEditOpen": "Açık mesai düzeltilemez. Önce çıkış yapın veya silin.",
  "work.timesRequired": "Giriş ve çıkış tarih/saatini girin.",
  "work.deleteSummary": "{time} mesai kaydı silinsin mi?",
  "messages.inbox": "Gelenler",
  "messages.sent": "Gönderilenler",
  "messages.archive": "Arşiv",
  "messages.trash": "Çöp kutusu",
  "messages.unread": "okunmamış",
  "messages.newMessage": "Yeni mesaj",
  "messages.recipient": "Alıcı",
  "messages.recipientPlaceholder": "İsim veya kullanıcı adı ara...",
  "messages.search": "Mesajlarda ara...",
  "messages.noMessages": "Mesaj bulunamadı.",
  "messages.noSelection": "Mesaj seçilmedi.",
  "messages.reply": "Yanıtla",
  "messages.send": "Gönder",
  "messages.moveToArchive": "Arşivle",
  "messages.moveOutOfArchive": "Arşivden çıkar",
  "messages.moveToTrash": "Çöp kutusuna taşı",
  "messages.deleteForever": "Kalıcı olarak sil",
  "messages.movedToast": "Mesaj taşındı.",
  "messages.deletedToast": "Mesaj silindi.",
  "messages.sentToast": "Mesaj gönderildi.",
  "messages.to": "Kime: ",
  "messages.from": "Kimden: ",
  "messages.markAsRead": "Okundu olarak işaretle",
  "messages.markAsUnread": "Okunmadı olarak işaretle",
  "messages.selectRecipient": "Lütfen bir alıcı seçin.",
  "messages.expand": "Genişlet",
  "messages.minimize": "Simge durumuna küçült",
  "messages.replyTo": "Yanıtla:",
  "messages.refreshedToast": "Mesajlar güncellendi.",
  "messages.deleteForeverOnlyTrash": "Kalıcı silme yalnızca çöp kutusundaki mesajlar için geçerli.",
  "messages.readOnlyReceived": "Yalnızca gelen mesajların okundu durumu değiştirilebilir.",
  "messages.trashEmptiedToast": "Çöp kutusu boşaltıldı.",
};

export const messages: Record<Locale, Dict> = { en, tr };

export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}
