import type { Metadata } from "next";
import { Questionnaire } from "@/components/questionnaire";

export const metadata: Metadata = { title: "診断の質問" };

export default function QuestionsPage() {
  return <Questionnaire />;
}
