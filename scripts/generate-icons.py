"""PWA 用アイコンを生成する（python3 scripts/generate-icons.py）。外部素材は使わない。"""
from PIL import Image, ImageDraw, ImageFont

NAVY = (6, 12, 28)
NAVY_2 = (18, 32, 72)
GREEN = (31, 207, 111)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def draw(size: int, safe: float) -> Image.Image:
    """safe: 中身を収める割合（maskable は周囲を切り取られるので小さめ）"""
    s = size * 4  # 4倍で描いて縮小（なめらかにする）
    img = Image.new("RGB", (s, s), NAVY)
    d = ImageDraw.Draw(img)
    c = s / 2
    r = s * safe / 2
    # 背景の円（ピッチのセンターサークル風）
    d.ellipse([c - r, c - r, c + r, c + r], outline=NAVY_2, width=max(4, int(s * 0.02)))
    # 緑のひし形（ロゴと同じモチーフ）
    k = r * 0.78
    d.polygon([(c, c - k), (c + k, c), (c, c + k), (c - k, c)], fill=GREEN)
    # 文字
    font = ImageFont.truetype(FONT, int(r * 0.3))
    text = "DNA"
    d.text((c, c), text, font=font, fill=NAVY, anchor="mm")
    return img.resize((size, size), Image.LANCZOS)


for size in (192, 512):
    draw(size, 0.9).save(f"public/icons/icon-{size}.png", optimize=True)
draw(512, 0.62).save("public/icons/maskable-512.png", optimize=True)
draw(180, 0.82).save("public/icons/apple-touch-icon.png", optimize=True)
print("ok")
