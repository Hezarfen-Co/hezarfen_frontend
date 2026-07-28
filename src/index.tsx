/* @refresh reload */
import { render } from "solid-js/web";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import { App } from "@/app";
import "@/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

render(() => <App />, root);
