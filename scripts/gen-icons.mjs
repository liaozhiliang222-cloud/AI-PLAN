/* 生成 PWA 图标：纯 Node 像素绘制 + PNG 编码（zlib），无第三方依赖 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixelFn) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x / size, y / size);
      const off = y * (size * 3 + 1) + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 设计：蓝色圆角底 + 双环雷达 + 白点 + 扫描线
function radarPixel(fx, fy) {
  const x = fx - 0.5, y = fy - 0.5;
  const d = Math.sqrt(x * x + y * y);
  if (d > 0.48) return [247, 248, 250]; // 圆外透明感（浅灰背景）
  // 底色渐变蓝
  let col = [37, 99, 235];
  const inner = d;
  const r1 = Math.abs(inner - 0.30), r2 = Math.abs(inner - 0.16), r3 = Math.abs(inner - 0.055);
  if (r2 < 0.018 || r3 < 0.032) col = [255, 255, 255];
  else if (r1 < 0.012) col = [147, 197, 253];
  // 扫描线 45° 右上
  const ang = Math.atan2(y, x);
  const scan = Math.abs(ang - (-Math.PI / 6));
  if (scan < 0.02 && inner < 0.33 && inner > 0.06) col = [59, 130, 246];
  return col;
}

mkdirSync("public/icons", { recursive: true });
for (const s of [192, 512]) {
  writeFileSync(`public/icons/icon-${s}.png`, png(s, radarPixel));
  console.log(`icon-${s}.png written`);
}
