import { formClient } from "../client";
import type { AvatarMeta } from "../client";

// PNG, JPEG, WebP or GIF only — no SVG — under the school's max_file_bytes.
// Uploading over an existing avatar replaces it.
export function postMyAvatar(file: File, signal?: AbortSignal): Promise<AvatarMeta> {
  const body = new FormData();
  body.append("file", file);
  return formClient<AvatarMeta>("/users/me/avatar", body, signal);
}
