import type { NoteFile, Page, PageParams } from "@/api/client";
import { deleteCourseNoteFileById, getCourseNoteFileBlob, getCourseNoteFileUrl, getCourseNoteFiles, postCourseNoteFile } from "@/api/course-notes";
import { deleteNoteFileById, getNoteFileBlob, getNoteFileUrl, getNoteFiles, postNoteFile } from "@/api/notes";

/**
 * The file routes behind a note. `/notes` (personal) and `/course-notes` (a
 * course's notes) expose the same five operations over the same `NoteFile`
 * shape, so the note components take one of these instead of importing a
 * single domain's API directly.
 */
export type NoteFileSource = {
  /** Backend cap per note: MAX_NOTE_FILES / MAX_COURSE_NOTE_FILES, both 10. */
  maxFiles: number;
  listFiles: (noteId: string, params?: PageParams, signal?: AbortSignal) => Promise<Page<NoteFile>>;
  uploadFile: (noteId: string, file: File, signal?: AbortSignal) => Promise<NoteFile>;
  deleteFile: (noteId: string, fileId: string) => Promise<void>;
  fileUrl: (noteId: string, fileId: string) => string;
  fileBlob: (noteId: string, fileId: string, signal?: AbortSignal) => Promise<Blob>;
};

export const personalNoteFiles: NoteFileSource = {
  maxFiles: 10,
  listFiles: getNoteFiles,
  uploadFile: postNoteFile,
  deleteFile: deleteNoteFileById,
  fileUrl: getNoteFileUrl,
  fileBlob: getNoteFileBlob,
};

export const courseNoteFiles: NoteFileSource = {
  maxFiles: 10,
  listFiles: getCourseNoteFiles,
  uploadFile: postCourseNoteFile,
  deleteFile: deleteCourseNoteFileById,
  fileUrl: getCourseNoteFileUrl,
  fileBlob: getCourseNoteFileBlob,
};
