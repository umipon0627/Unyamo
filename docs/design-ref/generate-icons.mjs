// アイコン展開スクリプト
//   実行: node docs/design-ref/generate-icons.mjs
//
// マスター: docs/design-ref/icon-1024-source.png (1024x1024 PNG)
//   ※元デザインは Claude Design 製の HTML 内 SVG を canvas で 1024px にラスタライズ
//     したもの。新しいデザインに差し替えたい場合は、その PNG (1024x1024) を
//     この場所に置き直してから本スクリプトを再実行する。
//
// 出力先: public/icons/* (any / maskable / favicon / apple-touch)
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const sourcePng = path.join(__dirname, 'icon-1024-source.png')
const iconsDir = path.join(repoRoot, 'public', 'icons')

await mkdir(iconsDir, { recursive: true })

const sizes = [
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
  // maskable は SVG 側で 80% 安全域内に主要要素が収まっているので同じ画像で OK
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192 },
]

for (const { name, size } of sizes) {
  await sharp(sourcePng).resize(size, size).png().toFile(path.join(iconsDir, name))
}

console.log('Generated', sizes.length, 'icons in', iconsDir)
