import questionsJson from "@/data/questions.v1.json";
import typesJson from "@/data/types.v1.json";
import positionsJson from "@/data/positions.v1.json";
import axesJson from "@/data/axes.json";
import {
  axisConfigSchema,
  positionConfigSchema,
  questionSetSchema,
  typeConfigSchema,
  type AxisDef,
  type AxisId,
} from "./model";

/** 採点ロジックのバージョン。アルゴリズムを変えたら必ず上げる。 */
export const SCORING_VERSION = "scoring-2026.11-v1";

// データファイルは読み込み時に Zod で検証する（壊れた設定で黙って誤採点しないため）。
export const QUESTION_SET = questionSetSchema.parse(questionsJson);
export const TYPE_CONFIG = typeConfigSchema.parse(typesJson);
export const POSITION_CONFIG = positionConfigSchema.parse(positionsJson);
export const AXES: AxisDef[] = axisConfigSchema.parse(axesJson).axes;

export const QUESTIONS_IN_ORDER = [...QUESTION_SET.questions].sort((a, b) => a.order - b.order);

export function axisDef(id: AxisId): AxisDef {
  const a = AXES.find((x) => x.id === id);
  if (!a) throw new Error(`unknown axis ${id}`);
  return a;
}

export function typeDef(id: string) {
  const t = TYPE_CONFIG.types.find((x) => x.id === id);
  if (!t) throw new Error(`unknown type ${id}`);
  return t;
}

export function positionLabel(id: string): string {
  return (
    POSITION_CONFIG.positions.find((p) => p.id === id)?.label ?? POSITION_CONFIG.extraLabels[id] ?? id
  );
}
