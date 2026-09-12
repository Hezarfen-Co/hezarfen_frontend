import { Show } from "solid-js";

type LogoMarkProps = {
  size?: number;
  class?: string;
};

/**
 * Hezarfen's pixel wing from the public landing page. The blue leading edge
 * represents upward progress; the quieter cells form the rest of the wing.
 * At favicon-sized dimensions only the leading edge is rendered.
 */
export function LogoMark(props: LogoMarkProps) {
  const size = () => props.size ?? 26;
  const compact = () => size() < 24;

  return (
    <svg
      width={size()}
      height={size()}
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
      shape-rendering="crispEdges"
      class={props.class}
    >
      <g fill="hsl(var(--brand))">
        <rect x="30" y="166" width="44" height="44" rx="6" />
        <rect x="86" y="122" width="44" height="44" rx="6" />
        <rect x="142" y="78" width="44" height="44" rx="6" />
        <rect x="198" y="34" width="44" height="44" rx="6" />
      </g>

      <Show when={!compact()}>
        <g fill="currentColor" opacity="0.22">
          <rect x="86" y="178" width="44" height="32" rx="6" />
          <rect x="142" y="134" width="44" height="32" rx="6" />
          <rect x="142" y="178" width="44" height="32" rx="6" />
          <rect x="198" y="90" width="44" height="32" rx="6" />
          <rect x="198" y="134" width="44" height="32" rx="6" />
        </g>
      </Show>
    </svg>
  );
}
