import { client } from "./client";
import type { PomodoroSession } from "./types";

export function postPomodoroStart(): Promise<PomodoroSession> {
  return client<PomodoroSession>("/pomodoro/start", { method: "POST" });
}
