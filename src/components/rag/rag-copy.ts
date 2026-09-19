import type { Locale } from "@/i18n/messages";

/**
 * The documented abstention codes (`guard_*`, `insufficient_data`,
 * `model_abstained`, `empty_scope`) in plain words; an unknown code is shown
 * as it came rather than guessed at.
 */
function reasonText(locale: Locale, reason: string): string {
  const tr = locale === "tr";
  if (reason === "insufficient_data") return tr ? "ders içeriklerinde bunu yanıtlayacak kadar bilgi yok" : "the course material does not cover this enough";
  if (reason === "model_abstained") return tr ? "yapay zekâ bunu güvenle yanıtlayamadı" : "the AI could not answer this confidently";
  if (reason === "empty_scope") return tr ? "çalışılacak bir aralık seçilmedi" : "no range was selected to study";
  if (reason.startsWith("guard_")) return tr ? "soru içerik kurallarına takıldı" : "the question was stopped by the content rules";
  return reason;
}

const copy = {
  en: {
    title: "Ask your notes",
    description: "Ask questions across the course material available to you and review the sources behind each answer.",
    newThread: "New chat",
    history: "Chat history",
    untitled: "Untitled chat",
    emptyThreads: "No chats yet",
    emptyThreadsHint: "Start a new chat to ask the course corpus a question.",
    emptyChat: "What would you like to learn?",
    emptyChatHint: "Answers use only the course material available to your account.",
    placeholder: "Ask a question about your course notes…",
    send: "Send",
    composerHint: "Enter to send · Shift+Enter for a new line",
    thinking: "Searching your course material…",
    sources: "Sources",
    source: "Source",
    subject: "Subject",
    pages: "Pages",
    document: "Course document",
    rename: "Rename chat",
    renameHint: "Give this chat a short, recognisable name.",
    renameLabel: "Chat name",
    renamePlaceholder: "e.g. Newton's laws",
    delete: "Delete chat",
    deleteHint: "This permanently deletes the chat and all of its messages.",
    deleteConfirm: "Delete chat",
    failed: "The answer could not be completed. Please try again.",
    failedWithCode: (code: string) => `The answer could not be completed (${code}). Please try again.`,
    abstained: "There was not enough course material to answer this question confidently.",
    abstainedReason: (reason: string) => `Reason: ${reasonText("en", reason)}`,
    loadingMessages: "Loading messages…",
    tabLabel: "Study",
    studyFrom: (ders: string) => `Study these ${ders} passages`,
    summarize: "Summarize",
    practice: "Practice questions",
    difficulty: "Difficulty",
    difficultyEasy: "Easy",
    difficultyMedium: "Medium",
    difficultyHard: "Hard",
    summaryTitle: "Summary",
    questionsTitle: "Practice questions",
    showAnswer: "Show answer",
    working: "Working on it…",
    coveredPages: (pages: string) => `Pages covered: ${pages}`,
    studyUnavailable: "Summaries and practice questions are not available right now; the AI service for them is not connected.",
    studyFailed: (reason: string) => `This could not be prepared: ${reason}`,
    noQuestions: "No questions could be drawn from these passages.",
  },
  tr: {
    title: "Notlarına sor",
    description: "Erişebildiğin ders içeriklerinde soru sor ve her yanıtın dayandığı kaynakları incele.",
    newThread: "Yeni sohbet",
    history: "Sohbet geçmişi",
    untitled: "Başlıksız sohbet",
    emptyThreads: "Henüz sohbet yok",
    emptyThreadsHint: "Ders arşivine soru sormak için yeni bir sohbet başlat.",
    emptyChat: "Ne öğrenmek istersin?",
    emptyChatHint: "Yanıtlar yalnızca hesabının erişebildiği ders içeriklerini kullanır.",
    placeholder: "Ders notların hakkında bir soru sor…",
    send: "Gönder",
    composerHint: "Göndermek için Enter · Yeni satır için Shift+Enter",
    thinking: "Ders içeriklerinde aranıyor…",
    sources: "Kaynaklar",
    source: "Kaynak",
    subject: "Ders",
    pages: "Sayfalar",
    document: "Ders belgesi",
    rename: "Sohbeti yeniden adlandır",
    renameHint: "Bu sohbete kısa ve ayırt edilebilir bir ad ver.",
    renameLabel: "Sohbet adı",
    renamePlaceholder: "Örn. Newton yasaları",
    delete: "Sohbeti sil",
    deleteHint: "Bu işlem sohbeti ve tüm mesajlarını kalıcı olarak siler.",
    deleteConfirm: "Sohbeti sil",
    failed: "Yanıt tamamlanamadı. Lütfen tekrar dene.",
    failedWithCode: (code: string) => `Yanıt tamamlanamadı (${code}). Lütfen tekrar dene.`,
    abstained: "Bu soruyu güvenle yanıtlamak için yeterli ders içeriği bulunamadı.",
    abstainedReason: (reason: string) => `Neden: ${reasonText("tr", reason)}`,
    loadingMessages: "Mesajlar yükleniyor…",
    tabLabel: "Çalış",
    studyFrom: (ders: string) => `Bu ${ders} kaynaklarıyla çalış`,
    summarize: "Özetle",
    practice: "Soru üret",
    difficulty: "Zorluk",
    difficultyEasy: "Kolay",
    difficultyMedium: "Orta",
    difficultyHard: "Zor",
    summaryTitle: "Özet",
    questionsTitle: "Pratik sorular",
    showAnswer: "Cevabı göster",
    working: "Hazırlanıyor…",
    coveredPages: (pages: string) => `Kapsanan sayfalar: ${pages}`,
    studyUnavailable: "Özet ve soru üretimi şu an kullanılamıyor; bunlar için yapay zekâ servisi bağlı değil.",
    studyFailed: (reason: string) => `Hazırlanamadı: ${reason}`,
    noQuestions: "Bu kaynaklardan soru çıkarılamadı.",
  },
} as const;

export function ragCopy(locale: Locale) {
  return copy[locale];
}
