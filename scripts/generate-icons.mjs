import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const srcSvg = path.join(process.cwd(), "scripts", "icon-source.svg");
const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512, maskablePadding: true },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
  { file: "favicon-16.png", size: 16 },
];

const svgBuffer = fs.readFileSync(srcSvg);

for (const t of targets) {
  if (t.maskablePadding) {
    // Maskable icons need ~safe-zone padding (icon content within the inner 80%).
    const inner = Math.round(t.size * 0.8);
    const innerBuf = await sharp(svgBuffer).resize(inner, inner).png().toBuffer();
    await sharp({
      create: {
        width: t.size,
        height: t.size,
        channels: 4,
        background: { r: 30, g: 27, b: 75, alpha: 1 },
      },
    })
      .composite([{ input: innerBuf, gravity: "center" }])
      .png()
      .toFile(path.join(outDir, t.file));
  } else {
    await sharp(svgBuffer)
      .resize(t.size, t.size)
      .png()
      .toFile(path.join(outDir, t.file));
  }
  console.log("generated", t.file);
}
