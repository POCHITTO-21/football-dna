import "server-only";
import { cache } from "react";
import { z } from "zod";
import { AXIS_IDS } from "@/lib/scoring/model";
import { createServerSupabase } from "@/lib/supabase/server";
import { isWellFormedShareToken } from "@/lib/share-token";

const rowSchema = z.object({
  type_id: z.string().regex(/^T\d{2}$/),
  composite_type_id: z.string().regex(/^T\d{2}$/).nullable(),
  axis_scores: z.object(Object.fromEntries(AXIS_IDS.map((a) => [a, z.number().min(0).max(100)]))),
  top_positions: z.array(z.string()),
  nickname: z.string().nullable(),
  created_at: z.string(),
});
export type SharedResult = z.infer<typeof rowSchema>;

/** 共有トークンから公開用の最小限の結果を取得。無効・失効・期限切れ・不正形式は null。 */
export const getSharedResult = cache(async (token: string): Promise<SharedResult | null> => {
  if (!isWellFormedShareToken(token)) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_shared_result", { token });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const parsed = rowSchema.safeParse(data[0]);
  return parsed.success ? parsed.data : null;
});
