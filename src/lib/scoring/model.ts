import { z } from "zod";

/** 8軸。この配列の順序が計算・表示の唯一の基準順序。 */
export const AXIS_IDS = ["DRB", "PAS", "FIN", "DEF", "TAC", "MOB", "DUEL", "TEAM"] as const;
export type AxisId = (typeof AXIS_IDS)[number];
export const axisIdSchema = z.enum(AXIS_IDS);

export const POSITION_IDS = ["GK", "CB", "RB", "LB", "DM", "CM", "AM", "RW", "LW", "ST", "SS"] as const;
export type PositionId = (typeof POSITION_IDS)[number];

export type AxisScores = Record<AxisId, number>;

const weightsSchema = z
  .partialRecord(axisIdSchema, z.number().positive())
  .refine((w) => Object.keys(w).length > 0, "weights must not be empty");

export const questionSetSchema = z.object({
  version: z.string().min(1),
  prompt: z.string(),
  kidsPrompt: z.string(),
  choices: z
    .array(z.object({ value: z.number().int().min(1).max(4), label: z.string(), kidsLabel: z.string() }))
    .length(4),
  questions: z
    .array(
      z.object({
        id: z.string().regex(/^Q\d{2}$/),
        axis: axisIdSchema,
        order: z.number().int().positive(),
        text: z.string().min(1),
        kidsText: z.string().min(1),
      }),
    )
    .length(40),
});
export type QuestionSet = z.infer<typeof questionSetSchema>;
export type Question = QuestionSet["questions"][number];

export const typeDefSchema = z.object({
  id: z.string().regex(/^T\d{2}$/),
  name: z.string(),
  weights: weightsSchema,
  positions: z.array(z.string()).min(1),
  requiresGk: z.boolean().optional(),
  catchcopy: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()).min(1),
  cautions: z.array(z.string()).min(1),
  practices: z.array(z.string()).length(3),
  coachAdvice: z.string(),
});
export type TypeDef = z.infer<typeof typeDefSchema>;

export const typeConfigSchema = z.object({
  version: z.string().min(1),
  allRounder: z.object({
    typeId: z.string(),
    maxBonus: z.number().nonnegative(),
    sdForZeroBonus: z.number().positive(),
  }),
  types: z.array(typeDefSchema).length(16),
});
export type TypeConfig = z.infer<typeof typeConfigSchema>;

export const positionDefSchema = z.object({
  id: z.enum(POSITION_IDS),
  label: z.string(),
  weights: weightsSchema,
  requiresGk: z.boolean().optional(),
  side: z.enum(["R", "L"]).optional(),
  note: z.string(),
});
export type PositionDef = z.infer<typeof positionDefSchema>;

export const positionConfigSchema = z.object({
  version: z.string().min(1),
  footSideBonus: z.number().nonnegative(),
  positions: z.array(positionDefSchema).length(11),
  extraLabels: z.record(z.string(), z.string()),
});
export type PositionConfig = z.infer<typeof positionConfigSchema>;

export const axisDefSchema = z.object({
  id: axisIdSchema,
  label: z.string(),
  short: z.string(),
  description: z.string(),
  growthPractice: z.string(),
});
export const axisConfigSchema = z.object({ axes: z.array(axisDefSchema).length(8) });
export type AxisDef = z.infer<typeof axisDefSchema>;
