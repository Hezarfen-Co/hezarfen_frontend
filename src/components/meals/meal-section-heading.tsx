import { Show } from "solid-js";

/**
 * Plain heading over a detail-page table. DataTable draws no title of its
 * own, and a page with several tables needs to say which one is which.
 */
export function MealSectionHeading(props: { id: string; title: string; description?: string }) {
  return (
    <div class="px-1">
      <h2 id={props.id} class="text-base font-semibold tracking-tight text-foreground">{props.title}</h2>
      <Show when={props.description}>
        <p class="mt-0.5 text-sm text-muted-foreground">{props.description}</p>
      </Show>
    </div>
  );
}
