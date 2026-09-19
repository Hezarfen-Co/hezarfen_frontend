import { client } from "../client";
import type { RagQuestionSet, RagQuestionsRequest } from "../client";

/** Practice questions over one range of one corpus, answers bounded to that range. */
export function postRagQuestions(request: RagQuestionsRequest): Promise<RagQuestionSet> {
  return client<RagQuestionSet>("/rag/questions", { method: "POST", body: request });
}
