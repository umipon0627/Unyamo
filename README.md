# Unyamo

オリジナルトランプゲーム「Unyamo」のオンライン対戦 Web アプリ。
詳細仕様は [`unyamo-specification.md`](./unyamo-specification.md) を参照。

## ゲーム概要

- **人数**: 2〜5人（オンライン対戦 / CPU 対戦どちらも対応）
- **初期手札**: 3枚
- **ターン操作**: `DRAW`（山札 or 捨て札トップから1枚引く） → `DISCARD`（1枚捨てる、または同ランク2〜3枚の特殊操作で複数捨てる）
- **ウニャモ宣言**: 自ターン開始時、ドロー前に手札合計が **5点以下** なら宣言可能。同一ゲーム内では一度しか宣言できない
- **勝敗判定**: 宣言者の手札点が他プレイヤー全員より厳密に小さければ宣言者の勝ち。同点以下のプレイヤーがいた場合は宣言者が最下位

ルールの詳細はアプリ内 `/rules` ページにも掲載。

## セットアップ

```bash
git clone https://github.com/umipon0627/Unyamo.git
cd Unyamo
npm install
cp .env.example .env.local   # 各種シークレットを記入
npx prisma generate
```

## 開発サーバー起動

```bash
npm run dev            # Next.js (localhost:3000)
npm run partykit:dev   # ゲームサーバー（別ターミナル必須, localhost:1999）
```

## コマンド

```bash
npm run test         # Vitest ユニットテスト
npm run type-check   # TypeScript 型チェック (strict)
npm run lint         # ESLint
npm run build        # 本番ビルド (prisma generate + next build)
npx prisma studio    # DB GUI
npx playwright test  # E2E（要: npm run dev 起動中）
```

## デプロイ

### Vercel（フロントエンド + API Routes）

GitHub 連携で `main` push 時に自動デプロイ。手動デプロイは:

```bash
npx vercel --prod
```

環境変数は Vercel Dashboard か `npx vercel@latest env add KEY production --value "$VALUE"` で設定。

### PartyKit（ゲームサーバー、独立プロセス）

```bash
npm run partykit:deploy
```

デプロイ後、Vercel 側の `PARTYKIT_HOST` と `NEXT_PUBLIC_PARTYKIT_HOST` を本番ホスト名に更新。

### Supabase（DB）

- PostgreSQL を **Transaction Pooler** 経由で接続（`aws-1-ap-northeast-1.pooler.supabase.com:6543` / `?pgbouncer=true&connection_limit=1`）
- Prisma migration は `npx prisma migrate deploy` で適用

## PWA 対応

ブラウザの「ホーム画面に追加」でアプリ化できます。
- iOS Safari: 共有 → ホーム画面に追加
- Android Chrome: メニュー → アプリをインストール

アイコンソース: `docs/design-ref/icon-1024-source.png`（再生成時はこの 1024×1024 から `sharp` で各サイズへ展開）

## 技術スタック

| 用途 | 技術 |
|------|------|
| フロントエンド | Next.js 16 (App Router) + TypeScript strict + Tailwind CSS v4 |
| UI | shadcn/ui + framer-motion + sonner |
| 認証 | NextAuth.js v5 (Google / GitHub OAuth) + PrismaAdapter + JWT セッション |
| リアルタイム | PartyKit (WebSocket、独立プロセス) |
| DB | Supabase (PostgreSQL, Transaction Pooler) + Prisma v5 |
| バリデーション | zod |
| テスト | Vitest + Playwright |
| デプロイ | Vercel + PartyKit |

## アーキテクチャ要点

- **ゲーム状態は PartyKit インメモリのみ**。DB には完了したゲームの結果のみ保存
- **情報隠蔽**: クライアントには自分の手札と捨て札トップだけを送信。他プレイヤーの手札枚数だけが見える
- **サーバー側検証**: ターン・フェーズ・カード存在・特殊操作・ウニャモ条件・重複操作を `party/game-server.ts` で全て検証
- **ルーム ID**: 4文字英数字（`ABCDEFGHJKMNPQRSTUVWXYZ23456789` の混同しにくい 32 種）。衝突時は 5 文字にフォールバック

## 環境変数

`.env.example` 参照。本番では Vercel と PartyKit の双方に設定が必要なものがあります（特に `PARTYKIT_HOST` / `NEXT_PUBLIC_PARTYKIT_HOST` / `NEXTAUTH_SECRET`）。
