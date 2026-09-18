import { cleanup, render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { afterEach, expect, test, vi } from "vitest";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PreferencesProvider } from "@/stores/preferences-context";

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
}));

afterEach(cleanup);

test("links every ancestor and marks the last crumb as the current page", () => {
  render(() => (
    <PreferencesProvider>
      <Breadcrumbs items={[{ label: "Courses", to: "/courses" }, { label: "Algebra", to: "/courses/$id" }, { label: "9-A" }]} />
    </PreferencesProvider>
  ));

  const nav = screen.getByRole("navigation");
  expect(nav.getAttribute("aria-label")).toBeTruthy();
  expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/courses", "/courses/$id"]);
  expect(screen.getByText("9-A").getAttribute("aria-current")).toBe("page");
  expect(screen.getByText("Algebra").getAttribute("aria-current")).toBeNull();
});
