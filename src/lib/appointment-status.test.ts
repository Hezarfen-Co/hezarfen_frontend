import type { AppointmentStatus } from "@/api/client";
import { appointmentStatusClass, appointmentStatusDotClass, appointmentStatusLabelKey } from "./appointment-status";

const STATUSES: AppointmentStatus[] = ["pending", "approved", "rejected", "cancelled"];

it("maps each status to a non-empty class and dot class", () => {
  for (const status of STATUSES) {
    expect(appointmentStatusClass(status).length).toBeGreaterThan(0);
    expect(appointmentStatusDotClass(status).length).toBeGreaterThan(0);
  }
});

it("gives each status a distinct label key", () => {
  const keys = STATUSES.map(appointmentStatusLabelKey);
  expect(new Set(keys).size).toBe(STATUSES.length);
  expect(keys).toEqual([
    "appointments.status.pending",
    "appointments.status.approved",
    "appointments.status.rejected",
    "appointments.status.cancelled",
  ]);
});
