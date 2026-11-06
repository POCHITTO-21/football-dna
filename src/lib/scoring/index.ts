import { POSITION_CONFIG, QUESTION_SET, QUICK_QUESTIONS_IN_ORDER, QUICK_SET, SCORING_VERSION, TYPE_CONFIG } from "./config";
import { diagnose, type DiagnosisInput } from "./diagnose";

export * from "./model";
export * from "./score";
export * from "./diagnose";
export * from "./config";

/** 現行バージョンの設定で診断する（UI・将来のサーバーAPIはこの関数を使う） */
export function diagnoseCurrent(input: DiagnosisInput) {
  return diagnose(input, {
    questionSet: QUESTION_SET,
    types: TYPE_CONFIG,
    positions: POSITION_CONFIG,
    scoringVersion: SCORING_VERSION,
    quickQuestionSet: { version: QUICK_SET.version, questions: QUICK_QUESTIONS_IN_ORDER },
  });
}
