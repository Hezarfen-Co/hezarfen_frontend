import type { Page, PersonRef } from "../client";

export type PaymentLedgerKind = "charge" | "credit" | "reversal" | "refund";

export type FeePlanInstallment = {
  amount_minor: number;
  due_at: number;
};

export type FeePlan = {
  id: string;
  name: string;
  installments: FeePlanInstallment[];
  created_by: PersonRef;
  created_at: number;
};

export type CreateFeePlanBody = {
  name: string;
  installments: FeePlanInstallment[];
};

// Backend replaces the whole schedule; refused (409) once anyone is assigned.
export type UpdateFeePlanBody = {
  name?: string;
  installments?: FeePlanInstallment[];
};

export type FeePlanAssignment = {
  id: string;
  plan: string;
  student: PersonRef;
  assigned_by: PersonRef;
  created_at: number;
};

export type AssignmentOutcome = {
  student_id: string;
  status: "assigned" | "already_assigned" | "rejected";
  reason: string | null;
};

export type PaymentLine = {
  id: string;
  student: PersonRef;
  kind: PaymentLedgerKind;
  amount_minor: number;
  source: string | null;
  due_at: number | null;
  method: string | null;
  note: string | null;
  recorded_by: PersonRef;
  created_at: number;
};

// request_key: optional idempotence key, charset [A-Za-z0-9-]. Same key with a
// different amount_minor/charge_id → 409.
export type RecordPaymentBody = {
  charge_id: string;
  amount_minor: number;
  method?: string;
  note?: string;
  request_key?: string;
};

export type RecordRefundBody = {
  credit_id: string;
  amount_minor: number;
  method?: string;
  note?: string;
  request_key?: string;
};

export type RecordReversalBody = {
  line_id: string;
  note?: string;
};

export type StatementEntry = {
  charge_id: string;
  plan: string | null;
  plan_name: string | null;
  amount_minor: number;
  due_at: number | null;
  credited_minor: number;
  refunded_minor: number;
  outstanding_minor: number;
  reversed: boolean;
  overdue: boolean;
};

// entries is a Page envelope; balance_minor is folded from the full ledger
// regardless of paging. Negative balance means the family owes the school.
export type PaymentStatement = {
  student: PersonRef;
  entries: Page<StatementEntry>;
  balance_minor: number;
};

export type PaymentBalance = {
  student: PersonRef;
  balance_minor: number;
};
