# 카톡 공유 미리보기 그림(1200×600) 만들기 — 생애혜택 안내소와 같은 틀
# 사용: python3 tools/og/make-og.py  → docs/og/bapsang-price-share-og.png
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, S = 1200, 600, 2  # 2배로 그린 뒤 줄여서 테두리를 매끄럽게
FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FR = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'

img = Image.new('RGB', (W * S, H * S), '#f3f4f8')

# 카드 그림자
sh = Image.new('L', img.size, 0)
ImageDraw.Draw(sh).rounded_rectangle((90 * S, 100 * S, 1110 * S, 520 * S), 56 * S, fill=110)
sh = sh.filter(ImageFilter.GaussianBlur(28 * S))
img.paste(Image.new('RGB', img.size, '#b9bdc8'), (0, 0), sh)
d = ImageDraw.Draw(img)
d.rounded_rectangle((90 * S, 90 * S, 1110 * S, 510 * S), 56 * S, fill='white')

# 아이콘 바탕 (연한 노랑→초록 그라데이션)
ix, iy, isz = 160 * S, 175 * S, 250 * S
grad = Image.new('RGB', (isz, isz))
gd = ImageDraw.Draw(grad)
for y in range(isz):
    t = y / isz
    c = (int(255 - 25 * t), int(247 - 7 * t), int(214 + 4 * t))
    gd.line((0, y, isz, y), fill=c)
mask = Image.new('L', (isz, isz), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, isz, isz), 64 * S, fill=255)
img.paste(grad, (ix, iy), mask)

def blob(box, fill, blur=0):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, fill=fill)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.paste(layer, (0, 0), layer)

cx, cy = ix + isz // 2, iy + isz // 2
u = S
# 바닥 그림자
blob((cx - 95 * u, cy + 78 * u, cx + 95 * u, cy + 100 * u), (60, 90, 40, 70), 6 * u)
# 배추: 진짜 배추처럼 — 아래는 두꺼운 흰 줄기, 위는 꼬불꼬불한 초록 잎 (잎을 여러 장 겹쳐 그림)
import math
def leaf(cxl, top, bot, half, tilt, green, white):
    """잎 한 장: 아래쪽 흰 줄기 → 위쪽 초록, 가장자리는 물결"""
    L = Image.new('RGBA', img.size, (0, 0, 0, 0))
    # 잎 모양(물결 테두리) 마스크
    pts = []
    n = 60
    for i in range(n + 1):
        t = i / n  # 0=아래 왼쪽 → 1=아래 오른쪽 (위를 돌아서)
        a = math.pi * (1 - t)
        r_y = (bot - top)
        x = cxl + math.cos(a) * half * (0.45 + 0.55 * math.sin(a) ** 0.6)
        y = bot - math.sin(a) * r_y
        if y < top + r_y * 0.5:  # 위쪽 절반은 꼬불꼬불
            wob = 5 * u * math.sin(i * 1.9)
            x += wob * math.cos(a)
            y -= abs(wob) * 0.8
        pts.append((x + tilt * (bot - y) / r_y, y))
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    # 세로 그라데이션: 흰 줄기 → 연두 → 초록
    g = Image.new('RGBA', img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    for y in range(int(top - 12 * u), int(bot + 1)):
        t = max(0.0, min(1.0, (bot - y) / (bot - top)))
        if t < 0.42:
            k = t / 0.42; c = tuple(int(white[j] + (230 - white[j]) * k * 0.15) for j in range(3))
        elif t < 0.6:
            k = (t - 0.42) / 0.18; c = tuple(int(white[j] * (1 - k) + green[j] * k) for j in range(3))
        else:
            k = (t - 0.6) / 0.4; c = tuple(int(green[j] * (1 - 0.18 * k)) for j in range(3))
        gd.line((0, y, img.size[0], y), fill=c + (255,))
    L.paste(g, (0, 0), m)
    # 잎맥: 가운데 굵은 줄기 + 옆 잎맥
    ld = ImageDraw.Draw(L)
    ld.line((cxl + tilt, bot, cxl + tilt * 0.4, top + (bot - top) * 0.25), fill=(255, 255, 250, 200), width=int(5 * u))
    for k in range(1, 4):
        yy = top + (bot - top) * (0.15 + 0.12 * k)
        xx = cxl + tilt * (bot - yy) / (bot - top)
        ld.line((xx, yy + 10 * u, xx - half * 0.55, yy - 8 * u), fill=(236, 248, 214, 150), width=int(2 * u))
        ld.line((xx, yy + 10 * u, xx + half * 0.55, yy - 8 * u), fill=(236, 248, 214, 150), width=int(2 * u))
    # 테두리 살짝 진하게
    edge = m.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
    L.paste(Image.new('RGBA', img.size, (70, 120, 40, 120)), (0, 0), edge.point(lambda v: 90 if v > 0 else 0))
    img.paste(L, (0, 0), L)

bx, bot = cx - 45 * u, cy + 92 * u
leaf(bx - 30 * u, cy - 70 * u, bot, 40 * u, -14 * u, (92, 160, 60), (226, 236, 206))   # 왼쪽 뒤
leaf(bx + 30 * u, cy - 74 * u, bot, 40 * u, 14 * u, (92, 160, 60), (226, 236, 206))    # 오른쪽 뒤
leaf(bx, cy - 98 * u, bot, 44 * u, 0, (120, 186, 78), (248, 250, 236))                # 가운데
leaf(bx - 16 * u, cy - 60 * u, bot, 34 * u, -6 * u, (136, 198, 90), (252, 252, 242))  # 앞 왼쪽
leaf(bx + 18 * u, cy - 56 * u, bot, 32 * u, 7 * u, (128, 192, 84), (252, 252, 242))   # 앞 오른쪽
d = ImageDraw.Draw(img)
# 밥그릇
d = ImageDraw.Draw(img)
d.pieslice((cx - 10 * u, cy - 20 * u, cx + 100 * u, cy + 90 * u), 0, 180, fill=(62, 120, 220))
d.ellipse((cx - 10 * u, cy + 20 * u, cx + 100 * u, cy + 50 * u), fill=(250, 250, 248))  # 밥
blob((cx + 6 * u, cy + 4 * u, cx + 84 * u, cy + 44 * u), (255, 255, 255, 255))
d = ImageDraw.Draw(img)
d.rounded_rectangle((cx + 25 * u, cy + 84 * u, cx + 65 * u, cy + 94 * u), 4 * u, fill=(44, 96, 190))
# 가격표
tag = [(cx + 30 * u, cy - 92 * u), (cx + 98 * u, cy - 92 * u), (cx + 98 * u, cy - 50 * u), (cx + 30 * u, cy - 50 * u), (cx + 14 * u, cy - 71 * u)]
d.polygon(tag, fill=(255, 107, 87))
d.ellipse((cx + 24 * u, cy - 75 * u, cx + 32 * u, cy - 67 * u), fill='white')
d.text((cx + 64 * u, cy - 71 * u), '₩', font=ImageFont.truetype(FB, 30 * u), fill='white', anchor='mm')

# 글자 (큰 글씨 금지 규칙: 제목 56px 이하, 설명 32px)
tx = 470 * S
d.text((tx, 250 * S), '오늘밥상물가', font=ImageFont.truetype(FB, 56 * S), fill='#1b2230', anchor='ls')
d.text((tx, 330 * S), '오늘 장보기 물가, 김장 재료값까지', font=ImageFont.truetype(FR, 32 * S), fill='#4b5262', anchor='ls')
d.text((tx, 380 * S), '날씨처럼 한눈에 확인해 보세요', font=ImageFont.truetype(FR, 32 * S), fill='#4b5262', anchor='ls')
d.text((tx, 435 * S), '토스 미니앱', font=ImageFont.truetype(FR, 25 * S), fill='#9aa0ab', anchor='ls')

out = 'docs/og/bapsang-price-share-og.png'
import os
os.makedirs('docs/og', exist_ok=True)
img.resize((W, H), Image.LANCZOS).save(out, optimize=True)
print(out)
