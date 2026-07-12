import { render } from "solid-js/web";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { router } from "@/routes/router";

const el = document.createElement("div");
document.body.appendChild(el);
render(() => <TanStackRouterDevtools router={router} position="bottom-right" />, el);
