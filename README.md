# Unyamo

オリジナルトランプゲーム「Unyamo」のオンライン対戦 Web アプリ。

## ゲームルール

- 3〜8人でプレイ、初期手札3枚
- 各ターン: 1枚（または同数字2〜3枚）捨て → 山札/捨て札から1枚引く
- 手札合計5点以下でウニャモ宣言可能
- 宣言後、全員がターンを完了してから得点判定
- 合計点が最小のプレイヤーが勝利（宣言者が最小でない場合は最下位）

## セットアップ

```bash
git clone https://github.com/umipon0627/Unyamo.git
cd Unyamo
npm install
cp .env.example .env.local
# .env.local に各サービスの認証情報を設定
npx prisma generate
```

## 開発サーバー起動

```bash
npm run dev        # Next.js (localhost:3000)
npx partykit dev   # ゲームサーバー（別ターミナル）
```

## コマンド

```bash
npm run test         # ユニットテスト (54テスト)
npm run type-check   # TypeScript型チェック
npm run lint         # ESLint
npx prisma studio    # DB GUI
npx playwright test  # E2Eテスト（要: npm run dev 起動中）
```

## デプロイ

### Vercel（フロントエンド）
1. GitHubリポジトリをVercelに連携
2. 環境変数を Vercel Dashboard で設定
3. `main` ブランチへpush で自動デプロイ

### PartyKit（ゲームサーバー）
```bash
npx partykit deploy
```
デプロイ後、`PARTYKIT_HOST` と `NEXT_PUBLIC_PARTYKIT_HOST` を本番URLに更新。

## PWA対応

スマートフォンのブラウザで開いて「ホーム画面に追加」するとアプリとして使えます。
- iOS Safari: 共有ボタン → ホーム画面に追加
- Android Chrome: メニュー → アプリをインストール

## 技術スタック

| 用途 | 技術 |
|------|------|
| フロントエンド | Next.js 16 + TypeScript + Tailwind CSS v4 |
| UI | shadcn/ui + framer-motion |
| 認証 | NextAuth.js v5 (Google/GitHub OAuth) |
| リアルタイム | PartyKit (WebSocket) |
| DB | Supabase (PostgreSQL) + Prisma v7 |
| バリデーション | zod |
| テスト | Vitest + Playwright |
| デプロイ | Vercel + PartyKit |

## 環境変数

`.env.example` を参照してください。
