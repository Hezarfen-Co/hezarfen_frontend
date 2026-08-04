import { createSignal } from "solid-js";

// The whole set the avatar endpoint accepts — deliberately narrower than
// limits.file.image_content_types, which also carries SVG for other uploads
// and would be refused here.
export const AVATAR_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const AVATAR_ACCEPT = AVATAR_CONTENT_TYPES.join(",");

// GET /users/{id}/avatar answers at one fixed URL, so an upload or a delete
// leaves the address unchanged and the browser's in-memory image cache can go
// on serving the old bytes. Every mounted avatar reads this counter into its
// `?v=` query, so bumping it once re-requests all of them — which is also how
// the sidebar chip picks up a photo changed on the profile page.
const [avatarRevision, setAvatarRevision] = createSignal(0);

export { avatarRevision };

export function bumpAvatarRevision(): void {
  setAvatarRevision((n) => n + 1);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
