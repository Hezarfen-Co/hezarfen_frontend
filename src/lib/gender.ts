import type { Gender } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

// Backend gender enum → i18n key. The raw enum string never reaches the UI.
export const GENDER_LABEL_KEYS: Record<Gender, MessageKey> = {
  female: "profile.genderFemale",
  male: "profile.genderMale",
  other: "profile.genderOther",
  undisclosed: "profile.genderUndisclosed",
};

type Translate = (key: MessageKey) => string;

/** Gender → localized label; null renders the em-dash placeholder. Shared by
 * the profile page and the admin user detail grid. */
export function genderLabel(g: Gender | null, t: Translate): string {
  return g ? t(GENDER_LABEL_KEYS[g]) : "—";
}
