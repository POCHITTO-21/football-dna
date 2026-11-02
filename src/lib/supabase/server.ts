import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";

/** サーバーコンポーネント・サーバーアクション用。未設定なら null。 */
export async function createServerSupabase() {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // サーバーコンポーネントからは cookie を書けない（middleware で更新される）
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return { supabase: null, user: null } as const;
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user } as const;
}
