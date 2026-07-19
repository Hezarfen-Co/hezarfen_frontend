import { client } from "./client";
import type { PomodoroSession } from "./types";

export function postPomodoroFinish(): Promise<PomodoroSession> {
  return client<PomodoroSession>("/pomodoro/finish", { method: "POST" });
}
