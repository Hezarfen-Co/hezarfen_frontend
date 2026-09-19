/* @refresh reload */
import { render } from "solid-js/web";
import { App } from "@/app";
import { loadLocale } from "@/i18n/messages";
import { readLocale } from "@/stores/preferences-context";
import "@/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

// Only the boot language's dictionary is fetched, and the first render waits
// for it so no frame ever shows raw message keys.
void loadLocale(readLocale()).finally(() => render(() => <App />, root));
