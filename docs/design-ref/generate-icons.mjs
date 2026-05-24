// アイコン再生成スクリプト
//   実行: node docs/design-ref/generate-icons.mjs
//   docs/design-ref/icon-master.svg をマスターとして
//   public/icons/* と docs/design-ref/icon-1024-source.png を再生成する。
import sharp from 'sharp'
import { mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const masterSvg = path.join(__dirname, 'icon-master.svg')
const sourcePng = path.join(__dirname, 'icon-1024-source.png')
const iconsDir = path.join(repoRoot, 'public', 'icons')

await mkdir(iconsDir, { recursive: true })

// 1024px マスター PNG を SVG から生成 (docs/design-ref と public/icons の両方に)
await sharp(masterSvg, { density: 384 })
  .resize(1024, 1024)
  .png()
  .toFile(sourcePng)

// 各サイズへ展開 ("any" purpose)
const sizes = [
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
]
for (const { name, size } of sizes) {
  await sharp(sourcePng).resize(size, size).png().toFile(path.join(iconsDir, name))
}

// maskable 用は SVG 自体が 80% 安全域に収めているので同じ画像を使ってもOK。
// 念のため別ファイルとして書き出す。
for (const size of [192, 512]) {
  await sharp(sourcePng)
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, `icon-maskable-${size}.png`))
}

console.log('Generated icons in', iconsDir)
