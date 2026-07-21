export function getExamLiveStreamUrl(examId: string): string {
  return `/api/exams/${encodeURIComponent(examId)}/live/stream`;
}
