import { client } from "../client";
import type { PomodoroSession } from "../client";

export type StartPomodoroBody = {
  label?: string | null;
};

export function postPomodoroStart(body?: StartPomodoroBody): Promise<PomodoroSession> {
  return client<PomodoroSession>("/pomodoro/start", { method: "POST", body });
}
