/**
 * AMAÇ: Tek kaynak logodan Web/PWA/Android ikon seti üretmek.
 * MANTIK: sharp ile resize + png-to-ico ile favicon üretimi.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const repoRoot = process.cwd();
const inputPng = path.resolve(
  repoRoot,
  "C:/Users/kadir/.cursor/projects/c-Projects-Boho-mentos-v2/assets/c__Users_kadir_AppData_Roaming_Cursor_User_workspaceStorage_17b913ddb3b57878be2d5d82d4eac7f5_images_image-674772f0-b5b9-49e9-9527-1c133b29bc68.png"
);

const ensureDir = async (p) => fs.mkdir(p, { recursive: true });

const writePng = async (outPath, size) => {
  await ensureDir(path.dirname(outPath));
  const buf = await sharp(inputPng)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await fs.writeFile(outPath, buf);
};

const writeAndroidForeground = async (outPath, size, paddingRatio = 0.82) => {
  await ensureDir(path.dirname(outPath));
  const inner = Math.round(size * paddingRatio);
  const pad = Math.max(0, Math.floor((size - inner) / 2));
  const buf = await sharp(inputPng)
    .resize(inner, inner, { fit: "contain" })
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  await fs.writeFile(outPath, buf);
};

async function main() {
  // Web/PWA
  await writePng(path.resolve(repoRoot, "public/logo.png"), 256);
  await writePng(path.resolve(repoRoot, "public/pwa-192x192.png"), 192);
  await writePng(path.resolve(repoRoot, "public/pwa-512x512.png"), 512);

  // favicon.ico (16/32/48)
  const tmpDir = path.resolve(repoRoot, "public/.tmp-icons");
  await ensureDir(tmpDir);
  const f16 = path.join(tmpDir, "f16.png");
  const f32 = path.join(tmpDir, "f32.png");
  const f48 = path.join(tmpDir, "f48.png");
  await writePng(f16, 16);
  await writePng(f32, 32);
  await writePng(f48, 48);
  const icoBuf = await pngToIco([f16, f32, f48]);
  await fs.writeFile(path.resolve(repoRoot, "public/favicon.ico"), icoBuf);
  await fs.rm(tmpDir, { recursive: true, force: true });

  // Android launcher icons
  const mipmapBase = path.resolve(repoRoot, "android/app/src/main/res");
  const legacy = [
    ["mipmap-mdpi", 48],
    ["mipmap-hdpi", 72],
    ["mipmap-xhdpi", 96],
    ["mipmap-xxhdpi", 144],
    ["mipmap-xxxhdpi", 192],
  ];
  const foreground = [
    ["mipmap-mdpi", 108],
    ["mipmap-hdpi", 162],
    ["mipmap-xhdpi", 216],
    ["mipmap-xxhdpi", 324],
    ["mipmap-xxxhdpi", 432],
  ];

  for (const [dir, size] of legacy) {
    await writePng(path.join(mipmapBase, dir, "ic_launcher.png"), size);
    await writePng(path.join(mipmapBase, dir, "ic_launcher_round.png"), size);
  }
  for (const [dir, size] of foreground) {
    await writeAndroidForeground(path.join(mipmapBase, dir, "ic_launcher_foreground.png"), size);
  }

  // Splash drawable bitmap (referenced by @drawable/splash)
  // We generate a 512px png and we'll reference it from layer-list XML.
  await writePng(path.join(mipmapBase, "drawable", "splash_logo.png"), 512);

  console.log("Icon generation completed.");
}

await main();

