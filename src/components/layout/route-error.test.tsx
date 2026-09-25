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

test("a rate-limited page is centered with an illustration, waits out retry-after and names the cause", async () => {
  const { ApiError } = await import("@/api/client");
  const root = createRootRoute({ component: () => <Outlet /> });
  const page = createRoute({
    getParentRoute: () => root,
    path: "/exams",
    component: () => {
      throw new ApiError(429, "too many requests", 15, null, "rate_limited");
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/exams"] }),
    defaultErrorComponent: RouteErrorFallback,
  });

  render(() => <RouterProvider router={router} />);

  const alert = await screen.findByRole("alert");
  expect(alert.querySelector(".illustration")).toBeTruthy();
  expect(screen.getByText(/^(This page could not load|Bu sayfa yüklenemedi)$/)).toBeTruthy();
  expect(screen.getByText(/^(Try again in 15s\.|15 sn sonra tekrar dene\.)$/)).toBeTruthy();

  // Retrying before retry-after only earns another 429.
  const retry = screen.getByRole("button") as HTMLButtonElement;
  expect(retry.disabled).toBe(true);
  expect(retry.textContent).toMatch(/15/);

  // The technical details carry the real fields of the error.
  const details = alert.querySelector("dl")!;
  expect(details.textContent).toContain("429");
  expect(details.textContent).toContain("rate_limited");
  expect(details.textContent).toContain("/exams");
  expect(details.textContent).toContain("too many requests");
  expect(details.textContent).toMatch(/rate limited|hız sınırı/);
});
