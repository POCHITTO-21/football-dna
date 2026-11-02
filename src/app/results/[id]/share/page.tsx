import type { Metadata } from "next";
import { ShareImage } from "@/components/share-image";

export const metadata: Metadata = { title: "SNS用画像", robots: { index: false } };

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareImage id={id} />;
}
