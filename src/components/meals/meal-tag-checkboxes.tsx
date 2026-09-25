import { For } from "solid-js";
import { dietaryTagLabel } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** The school's dietary tags as toggles (dish tags and a student's profile). */
export function MealTagCheckboxes(props: { tags: string[]; selected: string[]; onChange: (selected: string[]) => void }) {
  const t = useT();
  const toggle = (tag: string) =>
    props.onChange(props.selected.includes(tag) ? props.selected.filter((item) => item !== tag) : [...props.selected, tag]);
  return (
    <div class="flex flex-wrap gap-2">
      <For each={props.tags}>
        {(tag) => (
          <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-border-line px-3 py-1.5 text-sm has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
            <input type="checkbox" checked={props.selected.includes(tag)} onChange={() => toggle(tag)} />
            {dietaryTagLabel(tag, t)}
          </label>
        )}
      </For>
    </div>
  );
}
