import { describe, expect, it } from "vitest";
import { buildShareCardData } from "./share-card";
import { diagnoseCurrent } from "./scoring";
import { answersByAxis } from "./scoring/test-helpers";

const out = diagnoseCurrent({ answers: answersByAxis({ PAS: 4, TAC: 4 }, 2), gkInterest: "none", foot: "no_answer" });
if (!out.ok) throw new Error("setup");
const result = out.result;

describe("SNS画像データ", () => {
  it("ニックネームは明示的に選んだときだけ含まれる", () => {
    expect(buildShareCardData(result, { includeNickname: false, nickname: "タロウ" }).nickname).toBeNull();
    expect(buildShareCardData(result, { includeNickname: true, nickname: "タロウ" }).nickname).toBe("タロウ");
    expect(buildShareCardData(result, { includeNickname: true, nickname: "   " }).nickname).toBeNull();
  });

  it("タイプ名・8軸・ポジションID以外の項目を持たない", () => {
    const d = buildShareCardData(result, { includeNickname: false });
    expect(Object.keys(d).sort()).toEqual(["axes", "catchcopy", "nickname", "positions", "quick", "typeName"]);
    expect(d.axes).toHaveLength(8);
    expect(d.positions).toHaveLength(3);
    expect(d.quick).toBe(false);
  });

  it("かんたん診断の結果は quick が付く", () => {
    expect(buildShareCardData({ ...result, mode: "quick" }, { includeNickname: false }).quick).toBe(true);
  });
});
