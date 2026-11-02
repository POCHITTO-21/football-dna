import { AXIS_IDS, type AxisId, type AxisScores, type PositionConfig, type QuestionSet, type TypeConfig } from "./model";
import {
  COMPOSITE_GAP,
  FLAT_PROFILE_SD,
  computeAxisScores,
  computePositionScores,
  computeTypeScores,
  stdDev,
  type Answers,
  type PositionScore,
  type TypeScore,
} from "./score";
import { isGkEligible, type Foot, type GkInterest } from "../profile";

export type DiagnosisInput = {
  answers: Answers;
  gkInterest: GkInterest;
  foot: Foot;
};

export type DiagnosisResult = {
  questionSetVersion: string;
  typeConfigVersion: string;
  positionConfigVersion: string;
  scoringVersion: string;
  axisRaw: AxisScores;
  axisScores: AxisScores;
  typeRanking: TypeScore[];
  primaryTypeId: string;
  /** 1位と2位の差が小さいときの2位タイプ（複合タイプ表示用） */
  compositeTypeId: string | null;
  /** 8軸の差が小さく、特定の志向に偏っていない */
  flatProfile: boolean;
  positionRanking: PositionScore[];
  /** 0〜100で表示する上位3ポジション（評価対象外は除く） */
  topPositions: PositionScore[];
  gkEvaluated: boolean;
  /** 相対的に低めの軸（成長提案用、2つ） */
  growthAxes: AxisId[];
  /** 相対的に高めの軸（2つ） */
  strongAxes: AxisId[];
};

export type DiagnoseOutcome =
  | { ok: true; result: DiagnosisResult }
  | { ok: false; reason: "missing"; missing: string[] }
  | { ok: false; reason: "invalid"; invalid: string[] };

export type DiagnosisConfig = {
  questionSet: QuestionSet;
  types: TypeConfig;
  positions: PositionConfig;
  scoringVersion: string;
};

function rankAxes(scores: AxisScores, dir: "asc" | "desc"): AxisId[] {
  return [...AXIS_IDS].sort((a, b) => {
    const d = dir === "desc" ? scores[b] - scores[a] : scores[a] - scores[b];
    return d || AXIS_IDS.indexOf(a) - AXIS_IDS.indexOf(b);
  });
}

/** 診断の全体（純粋関数）。 */
export function diagnose(input: DiagnosisInput, config: DiagnosisConfig): DiagnoseOutcome {
  const axis = computeAxisScores(input.answers, config.questionSet.questions);
  if (!axis.ok) return axis;

  const gkEligible = isGkEligible(input.gkInterest);
  const typeRanking = computeTypeScores(axis.scores, config.types, { gkEligible });
  const [first, second] = typeRanking;
  const positionRanking = computePositionScores(axis.scores, config.positions, {
    gkEligible,
    foot: input.foot,
  });

  return {
    ok: true,
    result: {
      questionSetVersion: config.questionSet.version,
      typeConfigVersion: config.types.version,
      positionConfigVersion: config.positions.version,
      scoringVersion: config.scoringVersion,
      axisRaw: axis.raw,
      axisScores: axis.scores,
      typeRanking,
      primaryTypeId: first.typeId,
      compositeTypeId: second && first.score - second.score < COMPOSITE_GAP ? second.typeId : null,
      flatProfile: stdDev(axis.scores) < FLAT_PROFILE_SD,
      positionRanking,
      topPositions: positionRanking.filter((p) => p.score !== null).slice(0, 3),
      gkEvaluated: gkEligible,
      growthAxes: rankAxes(axis.scores, "asc").slice(0, 2),
      strongAxes: rankAxes(axis.scores, "desc").slice(0, 2),
    },
  };
}
