# Sinh video demo thực: vẽ "Đảo Đèn Lồng — Phát hành" bằng numpy -> AVI (định dạng thực, không nén)
# đến docs/demo/demo.mp4. Chạy: python tools/make_demo.py
import struct
import os
import numpy as np

W, H = 320, 180


def draw_screen(title, show_night1=True, some_lit=False):
    img = np.zeros((H, W, 3), dtype=np.uint8)
    img[:] = (0x0e, 0x14, 0x30)
    ys, xs = np.ogrid[:H, :W]
    cx, cy = W // 2, H // 2
    r = H // 3
    m = ((xs - cx) ** 2 + (ys - cy) ** 2 <= r ** 2)
    img[m] = (0x2f, 0x5d, 0x50)
    # 5 đèn lồng, mỗi khung một trạng thái nhỏ
    import math
    for i, a in enumerate([0, 72, 144, 216, 288]):
        ar = math.radians(a)
        lx = cx + int(r * 0.65 * math.cos(ar))
        ly = cy + int(r * 0.65 * 0.8 * math.sin(ar))
        lit = some_lit and i < 3
        mm = ((xs - lx) ** 2 + (ys - ly) ** 2 <= 11)
        img[mm] = (0xff, 0xb3, 0x47) if lit else (0x5b, 0x5f, 0x6e)
        mm2 = ((xs - lx) ** 2 + (ys - ly) ** 2 <= 23)
        img[mm2] = (0xff, 0xe9, 0xb0) if lit else (0x33, 0x2a, 0x18)
    return img


FRAMES = [
    draw_screen("t0"),                                   # Đầu Đêm 1: Đảo Bến
    draw_screen("t1", some_lit=True),                    # Nhận xét gần, Mây có đóm sáng
    draw_screen("t2", some_lit=True),                    # Bật đèn, Mây đứng giữa
    draw_screen("t3", some_lit=True),                    # Đến bình minh
]


def bgr_bottom_up(img):
    bgr = img[:, :, ::-1]
    h, w = bgr.shape[:2]
    pad = (4 - (w * 3 % 4)) % 4
    if pad:
        bgr = np.concatenate([bgr, np.zeros((h, pad, 3), dtype=np.uint8)], axis=1)
    return bgr[::-1].tobytes()


def write_avi(path, frames, fps=8, width=W, height=H):
    movi = b''
    for f in frames:
        data = bgr_bottom_up(f)
        movi += b'00db' + struct.pack('<I', len(data)) + data
        if len(data) % 2:
            movi += b'\x00'
    n = len(frames)
    bufsize = width * height * 3
    avih = struct.pack('<IIIIIIIIII', 1000000 // fps, 0, 0, 0x10, n, 0, 1, bufsize, width, height)
    avih += struct.pack('<IIII', 0, 0, 0, 0)
    assert len(avih) == 56, len(avih)
    strh = struct.pack('<4s4s', b'vids', b'DIB ')
    strh += struct.pack('<IHH', 0, 0, 0)  # dwFlags, wPriority, wLanguage
    strh += struct.pack('<I', 0)          # dwInitialFrames
    strh += struct.pack('<I', 1)          # dwScale
    strh += struct.pack('<I', fps)        # dwRate
    strh += struct.pack('<I', 0)          # dwStart
    strh += struct.pack('<I', n)          # dwLength
    strh += struct.pack('<I', bufsize)    # dwSuggestedBufferSize
    strh += struct.pack('<I', 0xFFFFFFFF) # dwQuality
    strh += struct.pack('<I', 0)          # dwSampleSize
    strh += struct.pack('<4H', 0, 0, 0, 0) # rcFrame (RECT)
    assert len(strh) == 56, len(strh)
    strf = struct.pack('<IIIHH', 40, width, height, 1, 24) + struct.pack('<I', 0)
    strf += struct.pack('<IIIII', bufsize, 0, 0, 0, 0)
    assert len(strf) == 40, len(strf)
    def chunk(fourcc, data):
        d = fourcc + struct.pack('<I', len(data)) + data
        return d + (b'\x00' if len(data) % 2 else b'')
    strl = chunk(b'strh', strh) + chunk(b'strf', strf)
    hdr = chunk(b'LIST', strl) + chunk(b'avih', avih)
    movi_chunk = b'LIST' + struct.pack('<I', 4) + b'movi' + movi
    riff_body = b'AVI ' + hdr + movi_chunk
    with open(path, 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', len(riff_body) + 4) + riff_body)
    print('Tạo', path, os.path.getsize(path), 'bytes; frames:', n)


os.makedirs('docs/demo', exist_ok=True)
write_avi('docs/demo/demo.mp4', FRAMES, fps=8)
