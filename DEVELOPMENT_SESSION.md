# Unyam 開発セッション記録（2026-05-06 ～ 2026-05-24）

CLIからGUIのClaudeデスクトップアプリへ切り替えるための詳細な開発履歴です。

> **⚠️ エージェントへの注意 — このファイルは履歴ログです。現状の正は `README.md` / `CLAUDE.md` / `unyam-specification.md` / ソースコード を参照すること。**
>
> 特に以下は古い記述があり、現在の挙動と矛盾します:
> - 「ターン順序を DRAW→DISCARD から DISCARD→DRAW へ変更」: **その後 DRAW→DISCARD に戻している**（`party/projection.ts` 参照）
> - 「3〜8人プレイ」「最大8人」: **現在は 2〜5人**（`src/lib/schemas.ts` の `maxPlayers.min(2).max(5)`）
> - 認証周り: `src/lib/auth.ts` に **PrismaAdapter を追加済み**（戦績取得不具合の根本原因対応）

## 現状サマリ（2026-05-24 時点）

| 項目 | 値 |
|------|---|
| 人数 | 2〜5人 |
| ターン順序 | DRAW → DISCARD |
| ウニャム宣言 | 自ターン開始時、ドロー前のみ。同一ゲーム内で一度のみ。手札合計 5点以下 |
| ルーム ID | 4文字英数字（混同しにくい 32種から）。衝突時 5文字フォールバック |
| 認証 | NextAuth v5 + PrismaAdapter + JWT |
| DB 接続 | Supabase Transaction Pooler `aws-1-ap-northeast-1.pooler.supabase.com:6543` (`?pgbouncer=true&connection_limit=1`) |
| PWA アイコン | `docs/design-ref/icon-1024-source.png` から `sharp` で各サイズ展開 |
| デプロイ | Vercel（手動 `vercel --prod` / GitHub 連携） + PartyKit (`npm run partykit:deploy`) |

主要な過去解決済みバグ:
- `judgeWinner` の順位バグ（非宣言者が全員 2位になっていた）→ `findIndex` ベースに修正
- 戦績ページ「取得失敗」→ `PrismaAdapter` 欠落が真因
- ルーム ID が長すぎ → 4文字英数字に変更
- /rules ページが 404 → 実装済み

---

## 以下、過去セッション履歴（参考。現状との矛盾あり）

---

## セッション概要

このセッションで実装・修正した内容：
1. **CPU対戦機能** の追加（新機能）
2. **OAuth redirect_uri_mismatch エラー** の原因特定と対応方法の案内
3. **捨て札ルール** の修正（仕様適合）
4. **Unyam二重宣言禁止** ルールの追加
5. **ターン順序の変更** （DRAW→DISCARD から DISCARD→DRAW へ）
6. **リザルト画面の全プレイヤー対応**

**最終デプロイ状態:**
- Vercel: デプロイ完了・自動デプロイ機能有効
- PartyKit: `npx partykit deploy` で本番デプロイ済み
- テスト: 118/118 ユニットテスト パス、型チェック 0 エラー

---

## 1. CPU対戦機能の追加

### 概要
ゲストユーザーでもログイン不要でCPU（コンピュータ）との対戦ができる機能を追加した。

### 仕様
- **プレイ人数:** 2～4人（自分+CPU1～3体）
- **CPU難易度:** EASY（判断が甘い）/ HARD（戦略的）
- **UI遷移:**
  1. ログイン後 → `/play` ページ（モード選択画面）
  2. "CPU対戦" または "友達と対戦" を選択
  3. CPU対戦 → `/play/cpu` で人数・難易度を選択
  4. 友達と対戦 → `/lobby` で従来通りロビー

### 実装ファイル一覧

#### 新規作成
- `src/game-logic/cpu.ts` — CPU判断ロジック（純粋関数）
  - `decideUnyamDeclaration(hand, difficulty, rng?)` — Unyam宣言の判断
  - `decideDrawSource(hand, discardTop, canPickupFromDiscard, difficulty, rng?)` — 山札/捨札の選択
  - `decideDiscard(hand, difficulty, rng?)` — どのカードを捨てるか決定
- `src/app/(game)/play/page.tsx` — モード選択画面（Bot/Users アイコン付き）
- `src/app/(game)/play/cpu/page.tsx` — CPU設定画面のサーバーコンポーネント
- `src/components/cpu/CpuSetup.tsx` — CPU設定UI（クライアントコンポーネント）
- `src/app/api/cpu-rooms/route.ts` — CPU ルーム作成API
- `tests/unit/cpu.test.ts` — CPU ロジックのユニットテスト（31件）
- `tests/e2e/cpu-battle.test.ts` — CPU対戦のE2Eテスト（Playwright）

#### 修正
- `party/messages.ts` — `startCpuGameSchema` 追加
- `party/game-server.ts` — CPU プレイヤー管理・自動操作ロジック
  - `cpuPlayerIds: Set<string>` で CPU プレイヤーID管理
  - `cpuDifficulty` で難易度保持
  - `scheduleCpuActionIfNeeded()` で CPU ターン自動実行（800-1500ms遅延）
  - `executeCpuTurn()` で CPU の描画・捨札操作を実行
- `src/components/game/GameBoard.tsx` — sessionStorage から CPU 設定を読み込み
- `src/app/page.tsx` — リダイレクト先変更（`/lobby` → `/play`）
- `src/middleware.ts` — `/play` パスを保護対象に追加
- `src/components/layout/Header.tsx` — ナビゲーションリンク更新（"プレイ"）
- `src/app/api/games/result/route.ts` — DB 保存時に `cpu:` 接頭辞プレイヤーを除外

### CPU プレイヤーID形式
`cpu:<インデックス>:<ルームID>`
例: `cpu:0:cpu-user123-1684900000000`

### CPU ルームID形式
`cpu-<userId>-<timestamp>`
例: `cpu-user123-1684900000000`

### sessionStorage 管理
- キー: `cpu-config-{roomId}`
- 値: `{ cpuCount: 1-3, difficulty: 'EASY' | 'HARD' }`

### テスト結果
- ユニットテスト: 31件追加（CPU ロジック検証）
- E2E テスト: CPU対戦フロー検証（Playwright で実ブラウザ確認）

**コミット**: `926e55e` feat: CPU対戦機能を追加（モード選択画面・CPUロジック・自動実行）

---

## 2. OAuth redirect_uri_mismatch エラー

### 問題
PCからのログイン時に「400: redirect_uri_mismatch」エラーが発生。スマホからは正常。

### 原因
- PCで `localhost:3000` でアクセス → OAuth コールバックURL が `localhost` に登録されていない
- スマホでVercel本番URL（`https://unyamo.vercel.app` など）でアクセス → 本番用コールバックURL登録済み

### 解決方法

#### Google Cloud Console（最優先）
URL: https://console.cloud.google.com/apis/credentials
- Client ID: `1049293100461-qoe3gc8372samjpt9ve0id4o1msvb07a`
- 「承認済みのリダイレクト URI」に以下を追加：
  ```
  http://localhost:3000/api/auth/callback/google
  https://unyamo.vercel.app/api/auth/callback/google
  https://unyam-umipon0627s-projects.vercel.app/api/auth/callback/google
  https://unyam-git-main-umipon0627s-projects.vercel.app/api/auth/callback/google
  ```

#### GitHub OAuth Apps
URL: https://github.com/settings/developers
- Client ID: `Ov23liXyCeu3Z8QXrwIk`
- **重要**: GitHub は callback URL が1つのみのため、**localhost 用に別 OAuth App を作成推奨**
  1. 新 OAuth App 作成（例: Unyam Dev）
  2. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
  3. 新しい Client ID/Secret を `.env.local` に設定
  4. 本番用は既存 App のまま `https://unyamo.vercel.app/api/auth/callback/github` に設定

#### .env.local 確認
```
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=1049293100461-qoe3gc8372samjpt9ve0id4o1msvb07a.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...（現在設定済み）
GITHUB_CLIENT_ID=Ov23liXyCeu3Z8QXrwIk（localhost用に変更可）
GITHUB_CLIENT_SECRET=（localhost用に変更可）
```

---

## 3. 捨て札ルール修正

### 変更前
- 「前のプレイヤーが捨てたカードのみ」が拾える仕様
- `Card.discardedBy` フィールドで追跡

### 変更後（仕様準拠）
- 「捨て札の一番上（最後尾）のカード」なら誰でも拾える
- 前プレイヤーのターンと無関係

### 修正ファイル
- `src/types/card.ts` — `Card.discardedBy` フィールドを廃止
- `src/game-logic/validation.ts` — `validateDiscardPickup()` 簡素化
- `party/projection.ts` — `canPickupFromDiscard` 判定ロジック更新
- `src/game-logic/cpu.ts` — CPU の `decideDrawSource()` 更新
- テスト: 既存・新規テスト追加・修正

### 問題ケース（修正済み）
前プレイヤーが Unyam を宣言 → 捨て札が発生しない → その直後のターンで捨て札が拾えない
→ **修正後**: 他プレイヤーが捨てたカードトップなら拾える

**コミット**: `b0dd2e1` fix: 捨て札ピックアップ・ウニャム宣言ルールを仕様準拠に修正

---

## 4. Unyam二重宣言禁止

### ルール追加
- 一人の プレイヤーが Unyam を宣言したら、他のプレイヤーは Unyam を宣言できない

### 実装
- `src/game-logic/validation.ts` — `validateUnyamNotYetDeclared()` 新設
- `party/game-server.ts` — Unyam 処理で検証呼び出し
- テスト: 2件追加

**コミット**: `b0dd2e1` fix: 捨て札ピックアップ・ウニャム宣言ルールを仕様準拠に修正

---

## 5. ターン順序の変更（DISCARD ↔ DRAW）

### 変更前
`DRAW（山札/捨札から引く）→ DISCARD（手札を捨てる）`

### 変更後（仕様準拠）
`DISCARD（手札を捨てる）→ DRAW（山札/捨札から引く）`

### 重要な注意点
自分が手札を捨てた直後に捨て札から引く際、**自分が今捨てたカードは拾えない**。
- `GameState.lastDiscardedCardIds: string[]` で管理
- `validateDiscardPickup()` で「自分が今ターンで捨てたカード」を除外チェック

### 修正ファイル
- `src/types/game.ts` — `hasActedThisTurn` → `hasDiscardedThisTurn` に変更、`lastDiscardedCardIds` 追加
- `src/game-logic/validation.ts` — フェーズ検証順序逆転
  - `validateDrawPhase()` → 「先にDISCARDが必要」チェック
  - `validateDiscardPickup()` → 「自分が今捨てたカード除外」機能追加
  - エラーコード: `MUST_DISCARD_FIRST`, `CANNOT_PICKUP_OWN_DISCARD`
- `src/game-logic/turn.ts` — `advanceTurn()` で `lastDiscardedCardIds` をクリア
- `party/game-server.ts` — フェーズ遷移ロジック全面修正
  - DISCARD完了 → broadcast のみ（next phase を進めない）
  - DRAW完了 → `advanceAfterDraw()` で次プレイヤーへ
  - CPU 行動順序・30秒タイムアウト逆転
  - CPU `scheduleCpuActionIfNeeded()` 二重呼び出しバグ修正
- `party/projection.ts` — `availableActions` を新順序で出し分け
- `src/components/game/ActionPanel.tsx` — UI表示順序更新
- `src/components/game/GameBoard.tsx` — フラグ導出ロジック更新

### テスト
- 新規14件追加（ACTION_PHASE/DRAW_PHASE 両フェーズ検証、自分捨て札禁止など）
- 既存テスト修正（フェーズ名・順序に合わせ）

**コミット**: `37cc89b` fix: ターン順序をDISCARD→DRAWに修正、リザルト画面を全プレイヤー対応

---

## 6. リザルト画面の全プレイヤー対応

### 変更前
Unyam を宣言したプレイヤーのみリザルト画面（`/result/[id]`）に遷移。他プレイヤーは勝敗不明。

### 変更後
- **ゲーム終了時に全プレイヤーに GAME_RESULT メッセージを broadcast**
- **全プレイヤーがリザルト画面へ遷移**
- 「もう一度遊ぶ」「終了する」ボタンを表示

### UI ロジック
- **ホスト（ルーム作成者）**: 「もう一度遊ぶ」ボタンで再戦開始
  - サーバー側で WAITING 状態にリセット
  - CPU ルームの場合は CPU プレイヤーを除去して再作成
- **非ホスト**: 「ホストの再戦待ち...」メッセージ表示
- **全員**: 「終了する」で `/play` に戻る

### 修正ファイル
- `party/messages.ts` — `RESTART_GAME` スキーマ追加
- `party/game-server.ts` — `handleRestartGame()`実装
  - ホストのみがルームを WAITING にリセット可能
  - CPU プレイヤー は除去
- `src/components/game/ResultModal.tsx` — 「もう一度遊ぶ」「終了する」ボタン実装
- `src/components/game/GameBoard.tsx` — `handlePlayAgain()`, `handleExit()` 実装
  - CPUルーム: `cpuLastConfigRef` で同じ設定を保持
  - WAITING 遷移後に自動で `START_CPU_GAME` 再送信
- `src/hooks/useGameState.ts` — RESULT→WAITING 時に `results`, `unyamDeclarerId` クリア
- `src/app/(game)/result/[id]/page.tsx` — リンクラベル統一

### テスト
- E2E テスト: ResultModal のテキスト変更に追従（「ゲーム結果」→「勝利！|ゲーム終了」）

**コミット**: `37cc89b` fix: ターン順序をDISCARD→DRAWに修正、リザルト画面を全プレイヤー対応

---

## 7. バグ修正記録

### バグ 1: CPU プレイヤー DB 保存エラー（2026-05-03）
**問題**: `cpu:` 接頭辞プレイヤーを DB に保存しようとして Prisma エラー（ユーザーテーブルに存在しない）
**修正**: `src/app/api/games/result/route.ts` で `!r.playerId.startsWith('cpu:')` フィルタ追加

**コミット**: `b2f603b` fix: CPU対戦のゲーム結果API保存からcpuプレイヤーを除外

### バグ 2: CPU 二重スケジュール（2026-05-17）
**問題**: `scheduleCpuActionIfNeeded()` が DISCARD/DRAW 両方で呼び出されて重複実行
**修正**: DRAW フェーズのみで呼び出すように修正

**コミット**: `37cc89b`（同上）

---

## デプロイ状態

### Vercel
- **ドメイン**: https://unyamo.vercel.app
- **自動デプロイ**: GitHub リポジトリ連携で有効
- **環境変数**: NEXTAUTH_URL, GOOGLE_*, GITHUB_*, PARTYKIT_* など設定済み
- **最新デプロイ**: 2026-05-17（ターン順序・リザルト画面修正反映）

### PartyKit
- **デプロイ**: `npx partykit deploy` で本番反映
- **URL**: https://unyam.umipon0627.partykit.dev
- **ホスト環境変数**: Vercel に `PARTYKIT_HOST` 設定済み

### Supabase
- **DB スキーマ**: `npx prisma migrate deploy` で適用
- **migrations**: 全て適用済み

---

## テスト状態（2026-05-17 最終）

- **ユニットテスト**: 118/118 パス
  - CPU ロジック: 31件
  - ゲームロジック検証: 30件以上
  - ターン管理・投影: 25件以上
  - その他: 32件以上
- **型チェック**: エラー 0件
- **ESLint**: エラー 0件（警告 6件は既存・修正対象外）
- **E2E テスト**: CPU対戦フロー検証済み（Playwright）

---

## 技術的メモ

### Tailwind v4
- `tailwind.config.ts` 不要
- カスタムカラーは `globals.css` の `@theme` セクションで定義

### Prisma v5
- `schema.prisma` で標準 URL 使用
- PartyKit→Next.js API の秘密鍵: `INTERNAL_API_SECRET` 環境変数

### Next.js 14 App Router
- `middleware.ts` で保護パス管理
- Server Components/Server Actions 活用

### PartyKit
- WebSocket サーバー（`party/` ディレクトリ）
- ゲーム状態はインメモリのみ（DB に保存しない）
- Zod スキーマで メッセージ検証

---

## GUIアプリ（デスクトップ）への引き継ぎポイント

1. **リポジトリ**: https://github.com/umipon0627/Unyamo.git（main ブランチ）
2. **開発起動**:
   ```bash
   npm run dev           # Next.js localhost:3000
   npx partykit dev      # PartyKit（別ターミナル必須）
   ```
3. **環境変数**: `.env.local` に以下を確保
   - DATABASE_URL（Supabase PostgreSQL）
   - NEXTAUTH_URL, NEXTAUTH_SECRET
   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
   - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
   - PARTYKIT_HOST
   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

4. **次に実装・確認すべき機能**:
   - [ ] localhost で OAuth ログイン確認（Google/GitHub）
   - [ ] CPU対戦フロー動作確認（2-4人、EASY/HARD）
   - [ ] ターン順序（DISCARD→DRAW）確認
   - [ ] リザルト画面全プレイヤー対応確認
   - [ ] 本番 Vercel/PartyKit で統合テスト
   - [ ] iOS/Android PWA での動作確認

5. **既知の課題・検討項目**:
   - ESLint 警告 6件残存（`_unused` 引数、修正は次回候補）
   - `party/game-server.ts` がまだ 812 行（次回リファクタ分割推奨）
   - E2E テストの実ブラウザ実行で CPU 対戦が 60 秒以内に完了するか確認推奨

---

## 最新コミット

```
37cc89b fix: ターン順序をDISCARD→DRAWに修正、リザルト画面を全プレイヤー対応
b0dd2e1 fix: 捨て札ピックアップ・ウニャム宣言ルールを仕様準拠に修正
b2f603b fix: CPU対戦のゲーム結果API保存からcpuプレイヤーを除外
926e55e feat: CPU対戦機能を追加（モード選択画面・CPUロジック・自動実行）
```

---

## ファイル構成参考

```
Unyam/
├── src/
│   ├── game-logic/
│   │   ├── cpu.ts                      ← CPU判断ロジック（新規）
│   │   ├── engine.ts
│   │   ├── validation.ts               ← 各フェーズ検証・ターン順序反映
│   │   └── turn.ts
│   ├── app/(game)/
│   │   ├── play/
│   │   │   ├── page.tsx                ← モード選択（新規）
│   │   │   └── cpu/
│   │   │       └── page.tsx            ← CPU設定（新規）
│   │   ├── result/[id]/page.tsx        ← リザルト全プレイヤー対応
│   │   └── game/page.tsx
│   ├── components/
│   │   ├── cpu/
│   │   │   └── CpuSetup.tsx            ← CPU設定UI（新規）
│   │   └── game/
│   │       ├── GameBoard.tsx           ← ターン順序・リザルト反映
│   │       ├── ActionPanel.tsx
│   │       └── ResultModal.tsx         ← リザルトボタン実装
│   ├── api/
│   │   ├── cpu-rooms/route.ts          ← CPU ルーム作成（新規）
│   │   └── games/result/route.ts       ← CPU プレイヤー除外
│   └── hooks/
│       └── useGameState.ts
├── party/
│   ├── game-server.ts                  ← CPU管理・ターン順序・リスタート機能
│   ├── projection.ts                   ← 新ターン順序反映
│   └── messages.ts                     ← START_CPU_GAME, RESTART_GAME スキーマ
├── tests/
│   ├── unit/
│   │   ├── cpu.test.ts                 ← CPU ロジックテスト（新規）
│   │   ├── validation.test.ts          ← ターン順序・二重宣言テスト
│   │   └── projection.test.ts
│   └── e2e/
│       ├── cpu-battle.test.ts          ← CPU対戦 E2E（新規）
│       └── guest-flow.test.ts
└── unyam-specification.md
```
