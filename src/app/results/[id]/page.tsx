import type { Metadata } from "next";
import { ResultView } from "@/components/result-view";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "診断結果", robots: { index: false } };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultView id={id} accountEnabled={isSupabaseConfigured()} />;
}
