import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("public/brand", { recursive: true });
await mkdir("public/fonts", { recursive: true });
const source = "public/brand/original-logo.png";
await sharp(source)
  .resize(96, 96)
  .webp({ quality: 88 })
  .toFile("public/brand/logo.webp");
await sharp(source)
  .resize(640, 640)
  .webp({ quality: 89 })
  .toFile("public/brand/hero.webp");
for (const size of [192, 512])
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(`public/brand/icon-${size}.png`);
const small = await sharp(source).resize(390, 390).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#070b18" },
})
  .composite([{ input: small, gravity: "center" }])
  .png()
  .toFile("public/brand/maskable-512.png");
const css = await fetch(
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    },
  },
).then((r) => r.text());
const urls = [...css.matchAll(/url\((https:[^)]+\.woff2)\)/g)].map((m) => m[1]);
if (!urls.length) throw new Error("No WOFF2 font returned");
const font = await fetch(urls.at(-1)).then((r) => r.arrayBuffer());
await writeFile("public/fonts/inter.woff2", Buffer.from(font));
const license = await fetch(
  "https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt",
).then((r) => r.text());
await writeFile("public/fonts/LICENSE.txt", license);
console.log("Optimized logo, PWA icons, and local variable font ready.");
