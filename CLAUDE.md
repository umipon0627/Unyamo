# Unyamo — Claude Code ガイド

オリジナルトランプゲーム「Unyamo」のオンライン対戦 Web アプリ。詳細は `unyamo-specification.md` 参照。

## 技術スタック

Next.js 14+ (App Router) / TypeScript strict / Tailwind v3 / shadcn/ui / framer-motion  
認証: NextAuth.js v5 (Google + GitHub OAuth) / リアルタイム: PartyKit (WebSocket)  
DB: Supabase (PostgreSQL) + Prisma / バリデーション: zod / テスト: Vitest + Playwright  
デプロイ: Vercel (フロント) + PartyKit (ゲームサーバー、別プロセス)

## アーキテクチャ方針

- ゲーム状態は **PartyKit インメモリのみ**。DB に保存しない
- クライアントには**自分の手札と捨て札トップのみ**送信（情報隠蔽）
- 全アクションをサーバー側で検証: ターン・フェーズ・カード存在・特殊操作・ウニャモ条件・重複操作
- 認証: NextAuth JWT → WebSocket JOIN 時にトークン検証

## 開発フェーズ（この順で進める）

1. 基盤: Next.js + Prisma/Supabase + NextAuth + レイアウト
2. ゲームロジック: `src/game-logic/` 実装 + Vitest、PartyKit サーバー
3. ゲーム UI: カード・ゲームボード・手札扇形配置・framer-motion アニメーション
4. ロビー: ルーム一覧・作成・参加、API Routes
5. 仕上げ: 結果画面・戦績・E2E・デプロイ

## 規約

- API 入力は zod で必ずバリデーション
- Prisma パラメータバインディングのみ使用（SQL インジェクション防止）
- ルーム名・プレイヤー名は HTML エスケープ（XSS 対策）

## 開発起動

```bash
npm run dev        # Next.js (localhost:3000)
npx partykit dev   # ゲームサーバー（別ターミナル必須）
```

## 環境変数

`DATABASE_URL` / `NEXTAUTH_URL` / `NEXTAUTH_SECRET` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `PARTYKIT_HOST`
