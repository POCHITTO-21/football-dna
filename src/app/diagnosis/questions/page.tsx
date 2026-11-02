import type { Metadata } from "next";
import { Questionnaire } from "@/components/questionnaire";

export const metadata: Metadata = { title: "診断（40問）" };

export default function QuestionsPage() {
  return <Questionnaire />;
}
