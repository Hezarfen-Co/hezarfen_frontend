export type NotificationType = "message" | "event" | "exam" | "homework";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  preview?: string;
  /** Where a click goes; a row without one opens the in-list preview instead. */
  targetUrl?: string;
  timestamp: number;
}

/**
 * An unread count as every shell surface shows it — the bell and messages
 * badges, the phone action button and the notification list header share one
 * cap, so a badge never reads "9+" over a header that says "20". The exact
 * number goes in the accessible label.
 */
export const UNREAD_DISPLAY_CAP = 9;

export function formatUnreadCount(count: number): string {
  return count > UNREAD_DISPLAY_CAP ? `${UNREAD_DISPLAY_CAP}+` : String(Math.max(0, count));
}

const STORAGE_KEY = "hezarfen.dismissedNotifications";
const READ_STORAGE_KEY = "hezarfen.readNotifications";

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

export function getReadNotificationIds(): Set<string> {
  if (!canUseStorage()) return new Set();
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function markNotificationRead(id: string): Set<string> {
  const current = getReadNotificationIds();
  current.add(id);
  if (canUseStorage()) {
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(current)));
    } catch {
      // ignore
    }
  }
  return current;
}
