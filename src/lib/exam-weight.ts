type ExamWeightSource = {
  kind?: string | null;
  weight?: number | null;
  kind_weight?: number | null;
  type_weight?: number | null;
  exam_type_weight?: number | null;
};

type KindWeight = {
  name: string;
  weight: number;
};

export function examWeight(
  source: ExamWeightSource,
  kinds?: readonly KindWeight[] | null,
): number | null {
  const direct = source.kind_weight ?? source.type_weight ?? source.exam_type_weight ?? source.weight ?? null;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (source.kind != null && kinds?.length) {
    const match = kinds.find((item) => item.name === String(source.kind));
    if (match && Number.isFinite(match.weight)) return match.weight;
  }
  return null;
}
