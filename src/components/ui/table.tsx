import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

// No scroll wrapper here: every Table sits inside DataTableFrame, which is the
// single overflow container — a second one nests scrollbars inside the border.
export function Table(props: ParentProps<ComponentProps<"table">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <table class={cn("w-full min-w-full caption-bottom text-sm leading-5", local.class)} {...rest}>
      {local.children}
    </table>
  );
}

export function TableHeader(props: ParentProps<ComponentProps<"thead">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <thead class={cn("bg-surface-overlay [&_tr]:border-b", local.class)} {...rest}>
      {local.children}
    </thead>
  );
}

export function TableBody(props: ParentProps<ComponentProps<"tbody">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <tbody class={cn("[&_tr:last-child]:border-0", local.class)} {...rest}>
      {local.children}
    </tbody>
  );
}

export function TableRow(props: ParentProps<ComponentProps<"tr">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <tr
      class={cn("border-b border-border-hairline transition-colors hover:bg-surface-overlay data-[state=selected]:bg-surface-tint", local.class)}
      {...rest}
    >
      {local.children}
    </tr>
  );
}

export function TableHead(props: ParentProps<ComponentProps<"th">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <th
      class={cn(
        "sticky top-0 z-20 h-11 whitespace-nowrap px-3 text-left align-middle text-xs font-medium tracking-normal text-text-subtle first:pl-4 last:pr-4 has-[[role=checkbox]]:pr-0",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </th>
  );
}

export function TableCell(props: ParentProps<ComponentProps<"td">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <td class={cn("px-3 py-3 align-middle first:pl-4 last:pr-4 has-[[role=checkbox]]:pr-0", local.class)} {...rest}>
      {local.children}
    </td>
  );
}
