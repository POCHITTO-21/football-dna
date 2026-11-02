import type { Metadata } from "next";
import { ShareImage } from "@/components/share-image";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "SNSで共有", robots: { index: false } };

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareImage id={id} accountEnabled={isSupabaseConfigured()} />;
}
