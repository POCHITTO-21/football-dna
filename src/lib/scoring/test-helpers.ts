import { QUESTION_SET } from "./config";
import type { AxisId } from "./model";

/** 軸ごとに同じ値で回答した回答セットを作る */
export function answersByAxis(values: Partial<Record<AxisId, number>>, fallback = 2): Record<string, number> {
  return Object.fromEntries(QUESTION_SET.questions.map((q) => [q.id, values[q.axis] ?? fallback]));
}

export function allAnswers(v: number): Record<string, number> {
  return Object.fromEntries(QUESTION_SET.questions.map((q) => [q.id, v]));
}
