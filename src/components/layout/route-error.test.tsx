import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/solid-router";
import { afterEach, expect, test } from "vitest";
import { RouteErrorFallback } from "@/components/layout/route-error";

afterEach(cleanup);

test("a page that throws is replaced in place and the shell stays", async () => {
  let failures = 1;
  const root = createRootRoute({
    component: () => (
      <div>
        <nav>SHELL NAV</nav>
        <Outlet />
      </div>
    ),
  });
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => {
      if (failures-- > 0) throw new Error("list failed");
      return <p>PAGE OK</p>;
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultErrorComponent: RouteErrorFallback,
  });

  render(() => <RouterProvider router={router} />);

  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByText("SHELL NAV")).toBeTruthy();

  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText("PAGE OK")).toBeTruthy();
});

test("the app router uses it for every route", async () => {
  const { router } = await import("@/routes/router");
  expect(router.options.defaultErrorComponent).toBe(RouteErrorFallback);
});
