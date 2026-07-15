import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

type ExamLinkProps = ParentProps<
  Omit<ComponentProps<"a">, "href"> & {
    examId: string;
  }
>;

export function ExamLink(props: ExamLinkProps) {
  const [local, rest] = splitProps(props, ["children", "examId"]);
  const href = () => `/exams/${encodeURIComponent(local.examId)}`;

  return (
    <a {...rest} href={href()}>
      {local.children}
    </a>
  );
}
