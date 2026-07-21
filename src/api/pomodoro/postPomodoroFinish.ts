import { client } from "../client";
import type { PomodoroSession } from "../client";

export function postPomodoroFinish(): Promise<PomodoroSession> {
  return client<PomodoroSession>("/pomodoro/finish", { method: "POST" });
}
