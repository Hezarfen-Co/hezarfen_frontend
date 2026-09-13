import { ApiError } from "@/api/client";
import { formatModuleError, moduleLabel } from "@/lib/module-labels";

const t = (key: string, params?: Record<string, string>) =>
  params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(",")})` : key;

test("unknown modules fall back to their wire name", () => {
  expect(moduleLabel("kantin", t)).toBe("kantin");
  expect(moduleLabel("exams", t)).toBe("module.exams");
});

test("a missing-requirement 409 names every violation with localized modules", () => {
  const err = new ApiError(409, "conflict: exams requires courses, which is not enabled; exams requires subjects, which is not enabled");
  expect(formatModuleError(err, t)).toBe(
    "modules.conflictRequires(module=module.exams,needed=module.courses) modules.conflictRequires(module=module.exams,needed=module.subjects)",
  );
});

test("a required-by 409 lists the dependents", () => {
  const err = new ApiError(409, "courses is required by exams, subjects");
  expect(formatModuleError(err, t)).toBe("modules.conflictRequiredBy(module=module.courses,dependents=module.exams, module.subjects)");
});
