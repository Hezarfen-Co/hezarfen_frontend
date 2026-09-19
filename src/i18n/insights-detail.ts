import { formatMessage } from "@/i18n/messages";

/**
 * Turkish copy for the student insight drawer (`components/insights/insight-detail.tsx`).
 *
 * Lane-scoped on purpose: two lanes were adding insight strings at the same
 * time, so the shared `messages.ts` dictionary is left untouched here and this
 * module carries the drawer's own copy. Turkish-only is not an oversight —
 * the insight payloads arrive Turkish from ZEKA (the attention `fact`
 * sentences, every `reason`/`limitation` line), so the surrounding labels stay
 * in the same language rather than half-translating one screen.
 *
 * `insights.*` keys that already exist in `messages.ts` are still read through
 * `prefs.t`; only strings that had no key live here.
 */
export const insightsDetailTr = {
  /** The collapsed raw-payload disclosure at the bottom of the drawer. */
  "detail.technical": "Teknik ayrıntı",
  "detail.technicalHint": "Etiketlenmemiş ham veri; kayıt anahtarları burada görünür.",
  "detail.hiddenFields": "{count} alan bu bölümde etiketsiz; teknik ayrıntıda.",
  "detail.elsewhere": "Bu bölümün ham verisi Teknik ayrıntı bölümünde.",
  "detail.unresolvedCourse": "Ders adı çözümlenemedi",
  "detail.notComputed": "Bu sürümde üretilemiyor",
  "detail.reason": "Neden",
  "detail.value.missing": "—",

  // --- attendance --------------------------------------------------------
  "attendance.rate": "Devam oranı",
  "attendance.present": "Katıldı",
  "attendance.absent": "Katılmadı",
  "attendance.late": "Geç kaldı",
  "attendance.excused": "Raporlu",
  "attendance.custom": "Diğer (okul tanımlı)",
  "attendance.nObs": "Değerlendirilen kayıt",
  "attendance.cohortMedian": "Şube ortancası",
  "attendance.cohortN": "Şubedeki öğrenci sayısı",
  "attendance.relativeGap": "Şube ortancasına göre fark",
  "attendance.rateSuppressed": "Oran için en az 10 devam kaydı gerekir; henüz gösterilmiyor.",
  "attendance.weekdayPattern": "Haftanın günü deseni",
  "attendance.trend": "Dönem içi eğilim",
  "attendance.course": "Ders {n}",
  "attendance.coursesEmpty": "Ders bazında devam kaydı yok.",

  // --- marks -------------------------------------------------------------
  "marks.course": "Ders",
  "marks.courseFallback": "Ders {n}",
  "marks.nMarks": "Not sayısı",
  "marks.average": "Ağırlıklı ortalama",
  "marks.mean": "Basit ortalama",
  "marks.median": "Ortanca",
  "marks.min": "En düşük",
  "marks.max": "En yüksek",
  "marks.placement": "Şubedeki konumu",
  "marks.band.review": "Tekrar önerilir",
  "marks.band.on_track": "Şube düzeyinde",
  "marks.band.strong": "Güçlü",
  "marks.band.insufficient_data": "Yeterli veri yok",
  "marks.progress": "Veri toplanıyor ({progress})",
  "marks.classAverage": "Şube ortalaması",
  "marks.classSd": "Şube standart sapması",
  "marks.cohortN": "Şubedeki öğrenci sayısı",
  "marks.z": "Şubeye göre sapma (z)",
  "marks.trend": "Eğilim",
  "marks.trendSlope": "30 günlük değişim",
  "marks.recentMean": "Son 3 notun ortalaması",
  "marks.previousMean": "Önceki 3 notun ortalaması",
  "marks.trendDelta": "Son 3 nottaki fark",
  "marks.dropped": "Düşüş eşiği aşıldı",
  "marks.rising": "Yükseliş var",
  "marks.contrast": "Dersler arası denge",
  "marks.contrastWorst": "En düşük ders",
  "marks.contrastDelta": "Diğer derslerin ortancasına göre fark",
  "marks.contrastFlagged": "Bu ders, öğrencinin diğer derslerine göre belirgin biçimde düşük.",
  "marks.classCount": "Kayıtlı şube sayısı",

  // --- study -------------------------------------------------------------
  "study.recent": "Son 28 gün",
  "study.previous": "Önceki 28 gün",
  "study.stints": "Çalışma oturumu",
  "study.activeDays": "Çalışılan gün",
  "study.totalFocus": "Toplam çalışma süresi",
  "study.medianStint": "Oturum süresi (ortanca)",
  "study.regularity": "Düzenlilik",
  "study.regularitySuppressed": "Düzenlilik için en az 3 gün çalışılmış olması gerekir.",
  "study.burstiness": "Günler arası yığılma",
  "study.nightShare": "Gece çalışma payı",
  "study.nightWindow": "Gece penceresi",
  "study.change": "Önceki 28 güne göre değişim",
  "study.changeActiveDays": "Çalışılan gün",
  "study.changeStints": "Oturum",
  "study.changeFocus": "Süre",
  "study.streak": "Kesintisiz gün",
  "study.heatmap": "Isı haritası",
  "study.heatmapProgress": "Isı haritası için {progress} oturum",
  "study.heatmapReady": "7×24 ısı haritası teknik ayrıntıda.",
  "study.preDeadline": "Teslim öncesi 48 saatteki çalışma payı",
  "study.preExam": "Sınav öncesi yığılma",

  // --- submission --------------------------------------------------------
  "submission.overall": "Genel",
  "submission.recent": "Son 30 gün",
  "submission.previous": "Önceki 30 gün",
  "submission.n": "Ödev sayısı",
  "submission.submitted": "Teslim edilen",
  "submission.onTime": "Zamanında",
  "submission.late": "Geç teslim",
  "submission.missing": "Teslim edilmemiş",
  "submission.markedMissing": "Öğretmen “yapılmadı” işaretledi",
  "submission.onTimeRate": "Zamanında teslim oranı",
  "submission.lateRate": "Geç teslim oranı",
  "submission.missingRate": "Eksik teslim oranı",
  "submission.ratesSuppressed": "Oranlar için en az 5 teslim gerekir; henüz gösterilmiyor.",
  "submission.upcoming": "Yaklaşan teslimler",
  "submission.upcomingNone": "Yaklaşan teslim yok.",
  "submission.due": "Teslim",
  "submission.hoursLeft": "Kalan süre",
  "submission.highPriority": "Öncelikli",
  "submission.done": "Teslim edildi",
  "submission.homework": "Ödev",
  "submission.procrastination": "Erteleme profili",
  "submission.measure": "Ölçü",
  "submission.measureLastTouch": "son dokunuş zamanı",
  "submission.windows": "Pencereler teslim tarihine (due_at) göredir.",

  // --- evidence (attention items and recommendation cards) ---------------
  "evidence.hiddenFields": "{count} alan yalnız teknik ayrıntıda.",
  "evidence.rate": "Oran",
  "evidence.relativeGap": "Şube ortancasına göre fark",
  "evidence.nObs": "Kayıt sayısı",
  "evidence.nMissing30": "Son 30 günde teslim edilmeyen",
  "evidence.missingRate30": "Son 30 günde eksik teslim oranı",
  "evidence.cohortMissingMedian": "Şube ortancası (eksik teslim oranı)",
  "evidence.onTimeRate30": "Son 30 günde zamanında teslim oranı",
  "evidence.onTimeRatePrev": "Önceki 30 günde zamanında teslim oranı",
  "evidence.missingRatePrev": "Önceki 30 günde eksik teslim oranı",
  "evidence.n30": "Son 30 günde ödev sayısı",
  "evidence.nPrev30": "Önceki 30 günde ödev sayısı",
  "evidence.recentMean": "Son 3 notun ortalaması",
  "evidence.previousMean": "Önceki 3 notun ortalaması",
  "evidence.delta": "Fark",
  "evidence.nMarks": "Not sayısı",
  "evidence.measure": "Ölçü",
  "evidence.studentAverage": "Öğrenci ortalaması",
  "evidence.classAverage": "Şube ortalaması",
  "evidence.classSd": "Şube standart sapması",
  "evidence.z": "Şubeye göre sapma (z)",
  "evidence.cohortN": "Şubedeki öğrenci sayısı",
  "evidence.average": "Ortalama",
  "evidence.band": "Şube konumu",
  "evidence.reading": "Okuma notu",
  "evidence.nStints28": "Son 28 günde oturum",
  "evidence.activeDays28": "Son 28 günde çalışılan gün",
  "evidence.regularity": "Düzenlilik",
  "evidence.burstiness": "Günler arası yığılma",
  "evidence.medianStintMin": "Oturum süresi (ortanca)",
  "evidence.streakLocal": "Kesintisiz gün",
  "evidence.activeDaysDelta": "Çalışılan gün farkı",
  "evidence.dueAt": "Teslim",
  "evidence.hoursLeft": "Kalan süre",
  "evidence.highPriority": "Öncelikli",
  "evidence.title": "Ödev",
  "evidence.nAnswers": "Cevap sayısı",
  "evidence.nCorrect": "Doğru cevap",
  "evidence.accuracy": "Doğruluk",
  "evidence.overallAccuracy": "Öğrencinin genel doğruluğu",
  "evidence.overallNAnswers": "Genel cevap sayısı",
  "evidence.contrast": "Fark (doğruluk)",
  "evidence.referenceMeanContrast": "Referans farkı (ortanca)",
  "evidence.referenceNStudents": "Referans öğrenci sayısı",
  "evidence.relativeContrast": "Referansa göre fark",
  "evidence.dimension": "Boyut",
  "evidence.label": "Etiket",
  "evidence.fact": "Olgu",
  "evidence.windowFrom": "Pencere başlangıcı",
  "evidence.windowTo": "Pencere bitişi",
  "evidence.limitation": "Sınır",
  "evidence.burstinessLimitation": "Yığılma ölçüsünün sınırı",

  // --- segments / recommendations ---------------------------------------
  "segments.dimension.bilissel_talep": "Bilişsel talep",
  "segments.dimension.dikkat_tuzagi": "Dikkat tuzağı",
  "segments.dimension.okuma_yuku": "Okuma yükü",
  "product.O1": "Ders konumu",
  "product.O2": "Beceri boşluğu",
  "product.O3": "Çalışma düzeni",
  "product.O4": "Teslim hatırlatıcısı",
  "product.T3": "Sınıf uyarısı",
  "product.T4": "Öğrenci uyarısı",
  "product.unknown": "Öneri",
  "trigger.attendance": "Devamsızlık",
  "trigger.homework": "Ödev",
  "trigger.mark_trend": "Not eğilimi",
} as const;

export type InsightDetailKey = keyof typeof insightsDetailTr;

/** The segment vocabulary, shared by the segments section and the evidence
 *  rows: an unmapped dimension yields `null` so callers omit it (or count it
 *  into the technical-disclosure note) instead of printing the machine name. */
const DIMENSION_KEYS: Record<string, InsightDetailKey> = {
  bilissel_talep: "segments.dimension.bilissel_talep",
  dikkat_tuzagi: "segments.dimension.dikkat_tuzagi",
  okuma_yuku: "segments.dimension.okuma_yuku",
};

export function dimensionLabel(dimension: string | null | undefined): string | null {
  const key = dimension ? DIMENSION_KEYS[dimension] : undefined;
  return key ? insightsDetailTr[key] : null;
}

/** One label from the drawer's own dictionary, with `{name}` interpolation. */
export function detailText(key: InsightDetailKey, vars?: Record<string, string | number>): string {
  return formatMessage(insightsDetailTr[key], vars);
}
