import { render, screen, waitFor } from "@solidjs/testing-library";
import { Suspense, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe("createResource", () => {
  it("suspends on the first load only, keeping content through refetch and source changes", async () => {
    const pending: Array<ReturnType<typeof deferred<string>>> = [];
    const [page, setPage] = createSignal(1);
    let refetch!: () => void;

    render(() => {
      const [value, actions] = createResource(page, () => {
        const next = deferred<string>();
        pending.push(next);
        return next.promise;
      });
      refetch = () => void actions.refetch();
      return (
        <Suspense fallback={<p>skeleton</p>}>
          <p>{value()}</p>
        </Suspense>
      );
    });

    expect(screen.getByText("skeleton")).toBeTruthy();
    pending[0].resolve("page 1");
    await waitFor(() => expect(screen.getByText("page 1")).toBeTruthy());

    refetch();
    expect(screen.queryByText("skeleton")).toBeNull();
    expect(screen.getByText("page 1")).toBeTruthy();
    pending[1].resolve("page 1 again");
    await waitFor(() => expect(screen.getByText("page 1 again")).toBeTruthy());

    setPage(2);
    expect(screen.queryByText("skeleton")).toBeNull();
    pending[2].resolve("page 2");
    await waitFor(() => expect(screen.getByText("page 2")).toBeTruthy());
  });
});
