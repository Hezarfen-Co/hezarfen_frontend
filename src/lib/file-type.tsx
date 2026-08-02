import type { JSX } from "solid-js";
import {
  IconFileAudio,
  IconFileImage,
  IconFileSpreadsheet,
  IconFileText,
  IconFileVideo,
  IconNote,
} from "@/components/ui/icons";

export function fileExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext !== name.toLowerCase() ? ext : "file";
}

export type FileTypeMeta = { label: string; class: string; icon: JSX.Element };

/** Icon + badge color for a file, by content type / extension — shared across notes and homework file lists. */
export function fileTypeMeta(file: { name: string; content_type: string }, iconClass = "h-5 w-5"): FileTypeMeta {
  const type = file.content_type.toLowerCase();
  const ext = fileExtension(file.name);
  if (type.startsWith("image/")) return { label: ext, class: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300", icon: <IconFileImage class={iconClass} /> };
  if (type.startsWith("video/")) return { label: ext, class: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300", icon: <IconFileVideo class={iconClass} /> };
  if (type.startsWith("audio/")) return { label: ext, class: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300", icon: <IconFileAudio class={iconClass} /> };
  if (type === "application/pdf" || ext === "pdf") return { label: "pdf", class: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: <IconFileText class={iconClass} /> };
  if (["xls", "xlsx", "csv"].includes(ext) || type.includes("spreadsheet")) return { label: ext, class: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: <IconFileSpreadsheet class={iconClass} /> };
  if (["doc", "docx", "txt", "md", "rtf"].includes(ext) || type.startsWith("text/") || type.includes("word")) return { label: ext, class: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300", icon: <IconFileText class={iconClass} /> };
  return { label: ext, class: "border-border bg-background text-muted-foreground", icon: <IconNote class={iconClass} /> };
}
