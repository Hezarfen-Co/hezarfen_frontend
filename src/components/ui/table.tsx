import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export function Table(props: ParentProps<ComponentProps<"table">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class="relative w-full overflow-auto">
      <table class={cn("w-full caption-bottom text-sm", local.class)} {...rest}>
        {local.children}
      </table>
    </div>
  );
}

export function TableHeader(props: ParentProps<ComponentProps<"thead">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <thead class={cn("[&_tr]:border-b", local.class)} {...rest}>
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
      class={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", local.class)}
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
        "h-10 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
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
    <td class={cn("p-3 align-middle [&:has([role=checkbox])]:pr-0", local.class)} {...rest}>
      {local.children}
    </td>
  );
}
