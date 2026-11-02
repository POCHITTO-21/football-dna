import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "基本情報" };

export default function ProfilePage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-accent">STEP 1 / 2</p>
        <h1 className="text-2xl font-black">基本情報</h1>
        <p className="mt-1 text-sm text-ink-muted">
          結果の表示を調整するために使います。名前・生年月日・学校などは聞きません。答えにくい項目は「回答しない」を選べます。
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
