# Unyam — Claude Code ガイド

オリジナルトランプゲーム「Unyam」のオンライン対戦 Web アプリ。詳細は `unyam-specification.md` 参照。

## ゲーム要点（実装に直結する事実）

- **人数**: 2〜5人（オンライン / CPU 対戦共通）
- **ターン順序**: `DRAW → DISCARD`（引いてから捨てる）
- **DRAW フェーズ**: 山札から引く / 捨て札トップから拾う / **ウニャム宣言**（ドロー前のみ可）
- **DISCARD フェーズ**: 1枚捨てる / 同ランク2〜3枚の特殊操作（1ターン1回）
- **ウニャム宣言**: 手札合計 5点以下、自ターン開始時、未宣言の場合のみ
- **判定**: 宣言者の点が他全員より厳密に小さければ宣言者勝ち。同点以下が1人でもいれば宣言者最下位
- **ゲームフェーズ**: `WAITING` → `PLAYING` → `JUDGING` → `RESULT`

過去に「DISCARD→DRAW」へ変更した経緯があるが、現在は **DRAW→DISCARD に戻っている**。`party/projection.ts` と仕様 2.6節が正。

## 技術スタック

Next.js 16 (App Router) / TypeScript strict / Tailwind v4 / shadcn/ui / framer-motion
認証: NextAuth.js v5 (Google + GitHub OAuth) + **PrismaAdapter**（必須。これがないと `session.user.id` が DB の User と紐付かず戦績取得が常に失敗する） / JWT セッション
リアルタイム: PartyKit (WebSocket、別プロセス)
DB: Supabase (PostgreSQL, **Transaction Pooler** `aws-1-ap-northeast-1.pooler.supabase.com:6543`, `?pgbouncer=true&connection_limit=1`) + Prisma v5
バリデーション: zod / テスト: Vitest + Playwright
デプロイ: Vercel (フロント) + PartyKit (ゲームサーバー、別ホスト)

## アーキテクチャ方針

- ゲーム状態は **PartyKit インメモリのみ**。DB には完了ゲームの結果のみ保存（`prisma.gameRecord` / `gameResult`）
- クライアントには **自分の手札と捨て札トップのみ** 送信（情報隠蔽）
- 全アクションをサーバー側で検証: ターン・フェーズ・カード存在・特殊操作・ウニャム条件・重複操作
- 認証: NextAuth JWT → PartyKit JOIN 時にトークン検証（`src/lib/party-token.ts`）
- ルーム ID: 4文字英数字（`ABCDEFGHJKMNPQRSTUVWXYZ23456789` の 32 種）。衝突時 5 文字。生成は `src/lib/room-store.ts` の `generateUniqueRoomId()`

## ディレクトリ

- `src/app/` — Next.js App Router（`(auth)` `(game)` `api` `profile` `rules` `page.tsx`）
- `src/game-logic/` — 純粋関数（deck / scoring / turn / unyam / validation / cpu）。Vitest で網羅
- `src/components/` — UI（cpu / game / layout / lobby / providers / ui）
- `src/lib/` — auth / db / current-user / guest / party-token / rate-limit / room-store / schemas
- `party/` — PartyKit サーバー（game-server.ts が中核 / projection.ts でクライアント送信用に絞り込み / auth.ts でトークン検証）
- `prisma/schema.prisma` — User / Account / GameRecord / GameResult
- `tests/` — unit (Vitest) + e2e (Playwright)
- `docs/design-ref/` — デザインソース（アイコン1024pxマスター等）

## 規約

- API 入力は **zod で必ずバリデーション**（`src/lib/schemas.ts`）
- Prisma パラメータバインディングのみ使用（生 SQL 禁止）
- ルーム名・プレイヤー名は **HTML エスケープ**（XSS 対策）。PartyKit 側で `escapeHtml` を通している
- 秘密情報（DB URL、OAuth secret 等）は `.env.local` / Vercel env / PartyKit env に分けて投入。Bash で `source` する場合は `&` を含む URL を必ず **ダブルクォート** で囲む

## 開発起動

```bash
npm run dev            # Next.js (localhost:3000)
npm run partykit:dev   # ゲームサーバー（別ターミナル必須, localhost:1999）
```

## 検証コマンド

```bash
npm run type-check   # tsc --noEmit (0 エラー維持)
npm run lint
npm run test         # Vitest
npx playwright test  # E2E（npm run dev 必須）
```

## 環境変数

`DATABASE_URL` / `NEXTAUTH_URL` / `NEXTAUTH_SECRET` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `PARTYKIT_HOST` / `NEXT_PUBLIC_PARTYKIT_HOST` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 過去のハマりポイント（メモ）

- **戦績ページが「取得失敗」**: 原因は `src/lib/auth.ts` に `PrismaAdapter` が無く、JWT の `user.id` が DB の `User.id` と一致しないこと。Adapter 追加で解決
- **Supabase pooler ホスト**: `aws-0-*` から `aws-1-ap-northeast-1.pooler.supabase.com` に移行済み
- **Vercel CLI v53 の `env add`**: stdin を受け付けない。`npx vercel@latest env add KEY production --value "$V" --no-sensitive --force --yes` を使う
- **`judgeWinner` の順位バグ**: 非宣言者が全員 2位になっていた。`src/game-logic/unyam.ts` で `findIndex` ベースの順位計算に修正済み
- **`*.png` を `.gitignore` で除外しているため `public/icons/*.png` には例外 `!public/icons/*.png` が必要**

## 仕様変更時のチェックリスト

1. `unyam-specification.md` を更新
2. `src/game-logic/` の純粋関数 + Vitest を更新
3. `party/game-server.ts` のサーバー検証を更新
4. `src/app/rules/page.tsx`（ルール説明ページ）を更新
5. `README.md` / `CLAUDE.md` を更新
