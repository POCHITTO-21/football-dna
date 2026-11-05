"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceGroup } from "@/components/ui/choice-fields";
import {
  AGE_BANDS,
  EXPERIENCE,
  FOOT,
  GK_INTEREST,
  USUAL_POSITIONS,
  isKidsAgeBand,
  profileSchema,
  type Profile,
} from "@/lib/profile";
import { QUESTION_SET } from "@/lib/scoring/config";
import { diagnosisModeSchema } from "@/lib/scoring/model";
import { loadDraft, saveDraft } from "@/lib/storage";

export function ProfileForm() {
  const router = useRouter();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: { usualPositions: [], foot: "no_answer", nickname: "" },
  });

  // 途中保存があれば基本情報を復元
  useEffect(() => {
    const d = loadDraft(QUESTION_SET.version);
    if (d?.profile) reset(d.profile);
  }, [reset]);

  const onSubmit = (profile: Profile) => {
    const prev = loadDraft(QUESTION_SET.version);
    // ?mode=full ならくわしい診断（40問）。指定がなければ途中のモードを引き継ぎ、なければかんたん診断（15問）
    const param = diagnosisModeSchema.safeParse(new URLSearchParams(window.location.search).get("mode"));
    const mode = param.success ? param.data : (prev?.mode ?? "quick");
    const sameMode = (prev?.mode ?? "full") === mode;
    saveDraft({
      questionSetVersion: QUESTION_SET.version,
      profile,
      answers: prev?.answers ?? {},
      currentIndex: sameMode ? (prev?.currentIndex ?? 0) : 0,
      kidsMode: isKidsAgeBand(profile.ageBand),
      mode,
      // トップから明示的にモードを選んだときは「かんたん診断の続き」を解除する
      upgradeFrom: sameMode && !param.success ? prev?.upgradeFrom : undefined,
    });
    router.push("/diagnosis/questions");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Card className="space-y-6">
        <Controller
          control={control}
          name="ageBand"
          render={({ field }) => (
            <ChoiceGroup name="ageBand" legend="年代" options={AGE_BANDS} value={field.value} onChange={field.onChange} error={errors.ageBand?.message} />
          )}
        />
        <Controller
          control={control}
          name="experience"
          render={({ field }) => (
            <ChoiceGroup name="experience" legend="サッカー経験" options={EXPERIENCE} value={field.value} onChange={field.onChange} error={errors.experience?.message} />
          )}
        />
        <Controller
          control={control}
          name="usualPositions"
          render={({ field }) => (
            <ChoiceGroup
              name="usualPositions"
              type="checkbox"
              legend="普段のポジション（複数選択可）"
              options={USUAL_POSITIONS}
              value={field.value}
              onChange={field.onChange}
              error={errors.usualPositions?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="gkInterest"
          render={({ field }) => (
            <ChoiceGroup
              name="gkInterest"
              columns={1}
              legend="ゴールキーパー（GK）の経験・希望"
              hint="GKの適性は、経験か希望がある場合だけ参考として表示します。"
              options={GK_INTEREST}
              value={field.value}
              onChange={field.onChange}
              error={errors.gkInterest?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="foot"
          render={({ field }) => (
            <ChoiceGroup name="foot" legend="利き足（任意）" options={FOOT} value={field.value} onChange={field.onChange} error={errors.foot?.message} />
          )}
        />
        <div>
          <label htmlFor="nickname" className="mb-1 block text-base font-bold">
            ニックネーム（任意・12文字まで）
          </label>
          <p id="nickname-hint" className="mb-2 text-sm text-ink-muted">
            本名は入れないでください。SNS画像に載せるかどうかは後で選べます。
          </p>
          <input
            id="nickname"
            autoComplete="off"
            maxLength={12}
            aria-describedby="nickname-hint"
            aria-invalid={!!errors.nickname}
            className="h-11 w-full rounded-xl border border-navy-600 bg-navy-800 px-3 text-ink placeholder:text-ink-muted/60"
            placeholder="例：ナンバー10"
            {...register("nickname")}
          />
          {errors.nickname && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {errors.nickname.message}
            </p>
          )}
        </div>
      </Card>
      <Button type="submit" size="lg" block disabled={isSubmitting}>
        質問にすすむ
      </Button>
    </form>
  );
}
