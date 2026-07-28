import { client } from "../client";
import type { MealLedgerEntry } from "../client";

export function postMealCredit(body: {
  student_id: string;
  amount_minor: number;
  method?: string;
  note?: string;
}): Promise<MealLedgerEntry> {
  return client<MealLedgerEntry>("/meals/credits", { method: "POST", body });
}
