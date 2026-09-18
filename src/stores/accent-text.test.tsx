import { expect, test } from "vitest";
import { accentTextLightness } from "@/stores/preferences-context";

// Same formula as WCAG, kept local so the test does not share the code under test.
const luminance = (h: number, s: number, l: number) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
};
const contrastOnPage = (h: number, s: number, l: number) => (luminance(0, 0, 97) + 0.05) / (luminance(h, s, l) + 0.05);

test("every hue gets a text shade that reads at AA on the page background", () => {
  for (let hue = 0; hue < 360; hue += 15) {
    const l = accentTextLightness(hue, 88, 40);
    expect(contrastOnPage(hue, 88, l)).toBeGreaterThanOrEqual(4.5);
  }
});

test("a hue that already passes keeps the button lightness", () => {
  expect(accentTextLightness(240, 88, 40)).toBe(40);
});
