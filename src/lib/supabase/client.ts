"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";

export function createBrowserSupabase() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.anonKey);
}
