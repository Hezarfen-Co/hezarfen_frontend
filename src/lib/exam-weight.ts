type ExamWeightSource = {
  weight?: number | null;
  kind_weight?: number | null;
  type_weight?: number | null;
  exam_type_weight?: number | null;
};

export function examWeight(source: ExamWeightSource): number | null {
  const value = source.kind_weight ?? source.type_weight ?? source.exam_type_weight ?? source.weight ?? null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
