import { client } from "../client";
import type { PomodoroSession } from "../client";

export function postPomodoroStart(): Promise<PomodoroSession> {
  return client<PomodoroSession>("/pomodoro/start", { method: "POST" });
}
