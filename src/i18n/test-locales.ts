import { registerLocale } from "@/i18n/messages";
import { en } from "@/i18n/locales/en";
import { tr } from "@/i18n/locales/tr";

// Tests render without the app boot that awaits `loadLocale`, so both
// dictionaries are installed up front. Test-only: importing the locale files
// statically anywhere in app code would fold them back into the main bundle.
registerLocale("en", en);
registerLocale("tr", tr);
