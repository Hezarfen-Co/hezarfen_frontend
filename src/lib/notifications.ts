export type NotificationType = "message" | "event" | "exam" | "homework";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  targetUrl: string;
  timestamp: number;
}

const STORAGE_KEY = "hezarfen.dismissedNotifications";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getDismissedNotificationIds(): Set<string> {
  if (!canUseStorage()) return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function dismissNotificationId(id: string): Set<string> {
  const current = getDismissedNotificationIds();
  current.add(id);
  if (canUseStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
    } catch {
      // ignore
    }
  }
  return current;
}

export function dismissAllNotificationIds(ids: string[]): Set<string> {
  const current = getDismissedNotificationIds();
  ids.forEach((id) => current.add(id));
  if (canUseStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
    } catch {
      // ignore
    }
  }
  return current;
}
