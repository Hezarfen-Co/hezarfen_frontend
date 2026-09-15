// Node exposes an experimental global localStorage that is undefined unless a
// --localstorage-file is provided, and this jsdom version does not expose one
// for the configured test origin. Keep the test storage local to each worker.
if (typeof window !== "undefined") {
  // jsdom intentionally does not implement scrolling and logs a warning when
  // UI code calls it. Scrolling is outside the scope of these component tests.
  window.scrollTo = () => undefined;
  const values = new Map<string, string>();
  const storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key: string) { return values.get(String(key)) ?? null; },
    key(index: number) { return Array.from(values.keys())[index] ?? null; },
    removeItem(key: string) { values.delete(String(key)); },
    setItem(key: string, value: string) { values.set(String(key), String(value)); },
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: window.sessionStorage,
  });
}
