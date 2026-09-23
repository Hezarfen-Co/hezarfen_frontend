import { Show } from "solid-js";
import { patchEventById } from "@/api/events";
import type { Event } from "@/api/client";
import { EventForm } from "@/components/events/event-form";
import { SidePanel } from "@/components/ui/side-panel";
import { useT } from "@/stores/preferences-context";

/**
 * An event's edit panel. One component for the event detail page header and
 * the events list's row menu, so both send the same PATCH. EventForm reads its
 * initial values once, so the form is keyed on the event: a different row gets
 * a fresh form. The panel closes itself on success; the caller refetches and
 * shows its own flash in `onSaved`. EventForm reports a failed save itself.
 */
export function EventEditPanel(props: {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useT();
  return (
    <SidePanel guardUnsaved open={props.open && !!props.event} onOpenChange={props.onOpenChange} title={t("common.edit")} description={props.event?.title}>
      <Show when={props.event} keyed>
        {(ev) => (
          <EventForm
            initial={ev}
            submitLabel={t("common.update")}
            onCancel={() => props.onOpenChange(false)}
            onSubmit={async (values) => {
              const body: Record<string, unknown> = {
                title: values.title,
                description: values.description,
                audience: values.audience,
              };
              if (values.starts_at !== undefined) body.starts_at = values.starts_at;
              if (values.ends_at !== undefined) body.ends_at = values.ends_at;
              await patchEventById(ev.id, body);
              props.onOpenChange(false);
              await props.onSaved();
            }}
          />
        )}
      </Show>
    </SidePanel>
  );
}
