import { render } from "@solidjs/testing-library";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";

test("renders bold text", () => {
  const { container } = render(() => <CelebiMarkdown text="a **bold** word" />);
  expect(container.querySelector("strong")?.textContent).toBe("bold");
});

test("renders inline code", () => {
  const { container } = render(() => <CelebiMarkdown text="run `npm test` now" />);
  expect(container.querySelector("code")?.textContent).toBe("npm test");
});

test("renders a fenced code block without the language line as code", () => {
  const { container } = render(() => <CelebiMarkdown text={"```\nconst x = 1;\n```"} />);
  expect(container.querySelector("pre code")?.textContent).toBe("const x = 1;");
});

test("renders a bullet list", () => {
  const { container } = render(() => <CelebiMarkdown text={"- first\n- second"} />);
  const items = Array.from(container.querySelectorAll("li")).map((el) => el.textContent);
  expect(items).toEqual(["first", "second"]);
});

test("renders a markdown link with target=_blank", () => {
  const { container } = render(() => <CelebiMarkdown text="see [docs](https://example.com/x)" />);
  const link = container.querySelector("a");
  expect(link?.getAttribute("href")).toBe("https://example.com/x");
  expect(link?.getAttribute("target")).toBe("_blank");
});

test("auto-links a bare URL", () => {
  const { container } = render(() => <CelebiMarkdown text="visit https://example.com/y please" />);
  expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com/y");
});

test("plain text with no markdown renders unchanged", () => {
  const { container } = render(() => <CelebiMarkdown text="just plain text" />);
  expect(container.textContent).toBe("just plain text");
});
