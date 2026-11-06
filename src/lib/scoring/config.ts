import questionsJson from "@/data/questions.v1.json";
import typesJson from "@/data/types.v1.json";
import positionsJson from "@/data/positions.v1.json";
import axesJson from "@/data/axes.json";
import quickJson from "@/data/quick-questions.v1.json";
import {
  axisConfigSchema,
  positionConfigSchema,
  questionSetSchema,
  quickQuestionSetSchema,
  typeConfigSchema,
  type AxisDef,
  type AxisId,
  type DiagnosisMode,
  type Question,
  type QuestionSet,
} from "./model";

/** 採点ロジックのバージョン。アルゴリズムを変えたら必ず上げる。 */
export const SCORING_VERSION = "scoring-2026.11-v1";

// データファイルは読み込み時に Zod で検証する（壊れた設定で黙って誤採点しないため）。
export const QUESTION_SET = questionSetSchema.parse(questionsJson);
export const TYPE_CONFIG = typeConfigSchema.parse(typesJson);
export const POSITION_CONFIG = positionConfigSchema.parse(positionsJson);
export const AXES: AxisDef[] = axisConfigSchema.parse(axesJson).axes;

export const QUESTIONS_IN_ORDER = [...QUESTION_SET.questions].sort((a, b) => a.order - b.order);

export const QUICK_SET = quickQuestionSetSchema.parse(quickJson);

/** 40問セットから、かんたん診断の設問を取り出した設問セットを作る（純粋関数） */
export function buildQuickQuestionSet(
  full: QuestionSet,
  quick: { version: string; baseQuestionSetVersion: string; questionIds: readonly string[] },
): { version: string; questions: Question[] } {
  if (quick.baseQuestionSetVersion !== full.version) {
    throw new Error(`quick set is based on ${quick.baseQuestionSetVersion}, but questions are ${full.version}`);
  }
  if (new Set(quick.questionIds).size !== quick.questionIds.length) throw new Error("quick set has duplicate ids");
  const questions = quick.questionIds.map((id, i) => {
    const q = full.questions.find((x) => x.id === id);
    if (!q) throw new Error(`quick set refers to unknown question ${id}`);
    return { ...q, order: i + 1 };
  });
  return { version: quick.version, questions };
}

export const QUICK_QUESTIONS_IN_ORDER = buildQuickQuestionSet(QUESTION_SET, QUICK_SET).questions;
const QUICK_IDS = new Set(QUICK_SET.questionIds);
/** かんたん診断のあと、くわしい診断で追加で答える設問（40問の並び順） */
export const UPGRADE_QUESTIONS_IN_ORDER = QUESTIONS_IN_ORDER.filter((q) => !QUICK_IDS.has(q.id));

/** モードごとの、質問画面に出す設問の並び */
export function questionsForMode(mode: DiagnosisMode, opts: { upgrade?: boolean } = {}): Question[] {
  if (mode === "quick") return QUICK_QUESTIONS_IN_ORDER;
  return opts.upgrade ? UPGRADE_QUESTIONS_IN_ORDER : QUESTIONS_IN_ORDER;
}

export const QUESTION_COUNT: Record<DiagnosisMode, number> = {
  quick: QUICK_QUESTIONS_IN_ORDER.length,
  full: QUESTIONS_IN_ORDER.length,
};

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
