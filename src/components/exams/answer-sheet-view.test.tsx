import { cleanup, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "@/api/client";
import { AnswerSheetView } from "@/components/exams/answer-sheet-view";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getExamQuestions, getStudentAttempts, getStudentAnswers } = vi.hoisted(() => ({
  getExamQuestions: vi.fn(),
  getStudentAttempts: vi.fn(),
  getStudentAnswers: vi.fn(),
}));

vi.mock("@/api/exams", () => ({
  getExamQuestions,
  getStudentAttempts,
  getStudentAnswers,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("an answer sheet without an attempt displays the known student name, not the UUID", async () => {
  const userId = "123e4567-e89b-42d3-a456-426614174000";
  getExamQuestions.mockResolvedValue({ items: [] });
  getStudentAttempts.mockResolvedValue([]);
  getStudentAnswers.mockRejectedValue(new ApiError(404, "not found"));

  render(() => (
    <PreferencesProvider>
      <AnswerSheetView examId="exam-1" userId={userId} userLabel="Elif Yıldız" />
    </PreferencesProvider>
  ));

  await waitFor(() => expect(getStudentAnswers).toHaveBeenCalledWith("exam-1", userId));
  await screen.findByText(/Not started|Başlamadı/);
  expect(screen.getByText("Elif Yıldız")).toBeTruthy();
  expect(document.body.textContent).not.toContain(userId);
});
