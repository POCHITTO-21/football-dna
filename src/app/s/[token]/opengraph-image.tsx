import { ImageResponse } from "next/og";
import { getSharedResult } from "@/lib/shared-result";
import { typeDef } from "@/lib/scoring/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FOOTBALL DNA の診断結果";

/** 日本語の表示に必要な文字だけを Google Fonts から取得（APIキー不要）。失敗時は英字のみで描画。 */
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@900&text=${encodeURIComponent(text)}`, {
        next: { revalidate: 86400 },
      })
    ).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await getSharedResult(token);
  const t = r ? typeDef(r.type_id) : null;
  const jp = t ? `${t.name}${t.catchcopy}ポジションの可能性わたしのプレースタイル` : "";
  const font = t ? await loadFont(jp) : null;
  const useJp = !!font;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(180deg, #0a1530, #060c1c)",
          color: "#eef3ff",
          fontFamily: useJp ? "NotoJP" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 900 }}>
          FOOTBALL&nbsp;<span style={{ color: "#1fcf6f" }}>DNA</span>
        </div>
        {t && useJp ? (
          <>
            <div style={{ fontSize: 30, color: "#a9b6d6", marginTop: 40 }}>わたしのプレースタイル</div>
            <div style={{ fontSize: 96, fontWeight: 900, marginTop: 10 }}>{t.name}</div>
            <div style={{ fontSize: 36, color: "#3ee08a", marginTop: 10 }}>{t.catchcopy}</div>
          </>
        ) : (
          <div style={{ fontSize: 64, fontWeight: 900, marginTop: 40 }}>PLAY STYLE DIAGNOSIS</div>
        )}
        {r && (
          <div style={{ fontSize: 48, fontWeight: 900, marginTop: 40 }}>{r.top_positions.join(" / ")}</div>
        )}
      </div>
    ),
    { ...size, fonts: font ? [{ name: "NotoJP", data: font, weight: 900, style: "normal" }] : undefined },
  );
}
