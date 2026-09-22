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

test("a 404 shows not-found with a way back to the list, not a retry", async () => {
  const { ApiError } = await import("@/api/client");
  const root = createRootRoute({ component: () => <Outlet /> });
  const list = createRoute({ getParentRoute: () => root, path: "/courses", component: () => <p>LIST</p> });
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/courses/$id",
    component: () => {
      throw new ApiError(404, "not found");
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([list, detail]),
    history: createMemoryHistory({ initialEntries: ["/courses/bad"] }),
    defaultErrorComponent: RouteErrorFallback,
  });

  render(() => <RouterProvider router={router} />);

  const back = await screen.findByRole("link", { name: /^(Back to the list|Listeye dön)$/ });
  expect(back.getAttribute("href")).toBe("/courses");
  expect(screen.queryByRole("button")).toBeNull();
});
