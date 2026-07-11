// Tiny mutation helper: wraps an async action with pending/error signals so
// forms get busy-state and failure display without repeating try/catch.

import { batch, createSignal, type Accessor } from "solid-js";
import { ApiError } from "./api";

export interface Action<Args extends unknown[]> {
  run: (...args: Args) => Promise<boolean>;
  pending: Accessor<boolean>;
  error: Accessor<string | null>;
  clearError: () => void;
}

export function createAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>,
): Action<Args> {
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  return {
    pending,
    error,
    clearError: () => setError(null),
    run: async (...args) => {
      batch(() => {
        setPending(true);
        setError(null);
      });
      try {
        await action(...args);
        return true;
      } catch (err) {
        setError(describe(err));
        return false;
      } finally {
        setPending(false);
      }
    },
  };
}

function describe(err: unknown): string {
  if (err instanceof ApiError) {
    return err.retryAfterSecs !== undefined
      ? `${err.message} — retry in ${err.retryAfterSecs}s`
      : err.message;
  }
  return err instanceof Error ? err.message : "something went wrong";
}
