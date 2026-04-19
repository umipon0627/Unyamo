# Unyamo（ウニャモ）Webアプリケーション 技術仕様書

---

## 1. プロジェクト概要

### 1.1 目的
オリジナルトランプゲーム「Unyamo」をオンライン対戦可能なWebアプリケーションとして構築する。

### 1.2 基本方針
- 完全無料のインフラ構成
- モバイルファースト・レスポンシブデザイン
- セキュリティ最優先（ゲームロジックは全てサーバーサイド）
- 将来的なAIプレイヤー追加を見据えた設計

---

## 2. ゲームルール仕様

### 2.1 基本設定
- デッキ: トランプ1デッキ（54枚、ジョーカー最大2枚）
- プレイヤー数: 3〜8人
- 初期手札: 3枚
- 勝利条件: 最終的な手札合計点が最も低いプレイヤーが勝利

### 2.2 カード点数
| カード | 点数 |
|--------|------|
| A | 1 |
| 2〜10 | 数字通り |
| J | 11 |
| Q | 12 |
| K | 13 |
| Joker | 0 |

### 2.3 ターンルール
各ターンで「通常操作」または「特殊操作」のいずれか1回を必ず行う。PASSは存在しない。

#### 通常操作
1. 手札からカード1枚を捨てる
2. 山札または捨て札の一番上から1枚引く

#### 特殊操作
1. 手札にある同じ数字のカードを2枚または3枚まとめて捨てる
2. 山札または捨て札の一番上から1枚引く
3. 1ターン中に1回のみ実行可能

### 2.4 ウニャモ宣言
- 手札合計点が5点以下のとき宣言可能
- 宣言したターンでそのプレイヤーの操作は終了（カードの捨てや引きは行わない）
- 宣言後、残りの全プレイヤーが操作を完了してから得点判定

### 2.5 勝敗判定
- ウニャモ宣言者が全プレイヤー中最小得点 → 宣言者の勝利
- 宣言者と同点または宣言者を下回るプレイヤーが1人でも存在 → 宣言者は最下位

### 2.6 ゲームフロー（状態遷移）

```
WAITING（ルーム待機）
  ↓ ホストが開始
DEALING（配札）
  ↓ 全員に3枚配布完了
PLAYING（プレイ中）
  ↓ ターンループ
  │   TURN_START → ACTION_PHASE → DRAW_PHASE → TURN_END
  │   ※ ウニャモ宣言時は ACTION_PHASE で宣言 → ラウンド内の残プレイヤーが操作完了後に判定
  ↓ ウニャモ宣言 & 全員操作完了
JUDGING（判定）
  ↓ 勝敗確定
RESULT（結果表示）
  ↓ ホストが再戦 or 解散
WAITING or 終了
```

---

## 3. 技術スタック

### 3.1 アーキテクチャ全体図

```
┌─────────────────────────────────────────────────┐
│                   クライアント                     │
│        Next.js (App Router) + Tailwind CSS        │
│        shadcn/ui + framer-motion                  │
│        WebSocket Client                           │
└──────────────┬──────────────────┬────────────────┘
               │ HTTPS            │ WebSocket
               ▼                  ▼
┌──────────────────────┐  ┌──────────────────────────┐
│   Vercel              │  │   PartyKit                │
│   ・UI ホスティング    │  │   ・ゲームサーバー         │
│   ・API Routes        │  │   ・ルームごとの状態管理    │
│   ・NextAuth.js       │  │   ・リアルタイム通信        │
│   ・認証 / OAuth      │  │   ・ゲームロジック実行      │
└──────────┬───────────┘  └──────────┬───────────────┘
           │                         │
           ▼                         ▼（ゲーム終了時のみ）
┌────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL)               │
│   ・ユーザーアカウント                                │
│   ・戦績データ                                       │
│   ・認証セッション                                    │
└────────────────────────────────────────────────────┘
```

### 3.2 技術選定一覧

| レイヤー | 技術 | 理由 |
|----------|------|------|
| フレームワーク | Next.js 14+ (App Router) | フルスタック、Vercelとの親和性 |
| 言語 | TypeScript (strict mode) | 型安全性でバグ防止 |
| スタイリング | Tailwind CSS v3 | レスポンシブ、ユーティリティファースト |
| UIコンポーネント | shadcn/ui | 高品質、カスタマイズ可能 |
| アニメーション | framer-motion | カードアニメーション |
| 認証 | NextAuth.js v5 | OAuth対応、セキュア |
| リアルタイム通信 | PartyKit | ステートフルWebSocket、無料枠あり |
| データベース | Supabase (PostgreSQL) | 無料500MB、REST API付き |
| ORM | Prisma | 型安全なDB操作 |
| バリデーション | zod | ランタイム型検証 |
| デプロイ | Vercel | 自動CI/CD、プレビュー環境 |
| ソースコード管理 | GitHub | 無制限リポジトリ |

### 3.3 無料枠制約

| サービス | 無料枠上限 | 備考 |
|----------|-----------|------|
| Vercel | 月100GB帯域、100時間ビルド | Hobbyプラン |
| Supabase | 500MB DB、50,000 MAU | Freeプラン |
| PartyKit | 無料枠あり | Cloudflare Workers基盤 |
| GitHub | 無制限 | パブリック/プライベート |

---

## 4. ディレクトリ構成

```
unyamo/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # ルートレイアウト
│   │   ├── page.tsx                # ランディングページ
│   │   ├── globals.css             # グローバルスタイル
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      # ログインページ
│   │   │   └── register/page.tsx   # 登録ページ（OAuth経由）
│   │   ├── (game)/
│   │   │   ├── lobby/page.tsx      # ロビー（ルーム一覧）
│   │   │   ├── room/
│   │   │   │   └── [id]/page.tsx   # ゲームルーム
│   │   │   └── result/
│   │   │       └── [id]/page.tsx   # 結果画面
│   │   ├── profile/
│   │   │   └── page.tsx            # プロフィール・戦績
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts        # NextAuth API
│   │       ├── rooms/
│   │       │   ├── route.ts        # ルーム作成・一覧
│   │       │   └── [id]/route.ts   # ルーム操作
│   │       └── users/
│   │           └── route.ts        # ユーザー情報
│   ├── components/
│   │   ├── ui/                     # shadcn/uiコンポーネント
│   │   ├── game/
│   │   │   ├── Card.tsx            # カードコンポーネント
│   │   │   ├── Hand.tsx            # 手札表示（扇形配置）
│   │   │   ├── Deck.tsx            # 山札
│   │   │   ├── DiscardPile.tsx     # 捨て札
│   │   │   ├── PlayerArea.tsx      # プレイヤー情報エリア
│   │   │   ├── GameBoard.tsx       # ゲームボード全体
│   │   │   ├── ActionPanel.tsx     # 操作パネル
│   │   │   ├── UnyamoButton.tsx    # ウニャモ宣言ボタン
│   │   │   ├── TurnIndicator.tsx   # ターン表示
│   │   │   └── ResultModal.tsx     # 結果モーダル
│   │   ├── lobby/
│   │   │   ├── RoomList.tsx        # ルーム一覧
│   │   │   ├── RoomCard.tsx        # ルームカード
│   │   │   └── CreateRoomDialog.tsx # ルーム作成ダイアログ
│   │   └── layout/
│   │       ├── Header.tsx          # ヘッダー
│   │       ├── Footer.tsx          # フッター
│   │       └── ThemeToggle.tsx     # テーマ切替
│   ├── lib/
│   │   ├── auth.ts                 # NextAuth設定
│   │   ├── db.ts                   # Prismaクライアント
│   │   ├── supabase.ts             # Supabaseクライアント
│   │   └── utils.ts                # ユーティリティ
│   ├── types/
│   │   ├── game.ts                 # ゲーム関連の型定義
│   │   ├── card.ts                 # カード関連の型定義
│   │   └── room.ts                 # ルーム関連の型定義
│   ├── hooks/
│   │   ├── useGameState.ts         # ゲーム状態管理
│   │   ├── useWebSocket.ts         # WebSocket接続
│   │   └── useAnimation.ts         # アニメーション制御
│   └── game-logic/
│       ├── deck.ts                 # デッキ操作（シャッフル、配布）
│       ├── scoring.ts              # スコア計算
│       ├── validation.ts           # アクション合法性チェック
│       ├── turn.ts                 # ターン管理
│       └── unyamo.ts               # ウニャモ宣言ロジック
├── party/
│   └── game-server.ts              # PartyKit ゲームサーバー
├── prisma/
│   └── schema.prisma               # DBスキーマ
├── public/
│   ├── cards/                      # カード画像（SVG）
│   └── sounds/                     # SE（オプション）
├── tests/
│   ├── unit/
│   │   ├── scoring.test.ts
│   │   ├── validation.test.ts
│   │   └── deck.test.ts
│   └── e2e/
│       └── game-flow.test.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

---

## 5. データベース設計

### 5.1 Prismaスキーマ

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  
  // 戦績
  gamesPlayed   Int       @default(0)
  gamesWon      Int       @default(0)
  gamesLost     Int       @default(0)
  totalScore    Int       @default(0)
  
  // ゲーム参加記録
  gameResults   GameResult[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model GameRecord {
  id          String       @id @default(cuid())
  roomId      String
  playerCount Int
  results     GameResult[]
  duration    Int          // ゲーム時間（秒）
  createdAt   DateTime     @default(now())
}

model GameResult {
  id           String     @id @default(cuid())
  gameRecordId String
  gameRecord   GameRecord @relation(fields: [gameRecordId], references: [id], onDelete: Cascade)
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  finalScore   Int
  rank         Int
  declared     Boolean    @default(false) // ウニャモ宣言したか
  isWinner     Boolean    @default(false)
  
  @@unique([gameRecordId, userId])
}
```

### 5.2 DBに保存するデータの方針
- **DBに保存**: ユーザーアカウント、OAuth情報、セッション、ゲーム結果、戦績
- **DBに保存しない**: ゲーム進行中の状態（手札、山札、ターン情報）→ PartyKitインメモリ

---

## 6. ゲームサーバー仕様（PartyKit）

### 6.1 サーバー状態管理

```typescript
// party/game-server.ts の状態型定義

interface GameState {
  phase: 'WAITING' | 'DEALING' | 'PLAYING' | 'JUDGING' | 'RESULT';
  players: PlayerState[];
  deck: Card[];           // 山札（シャッフル済み）
  discardPile: Card[];    // 捨て札
  currentTurnIndex: number;
  turnOrder: string[];    // プレイヤーIDの順番
  unyamoDeclarerId: string | null;
  remainingPlayersAfterDeclare: string[]; // 宣言後に操作が必要なプレイヤー
  hostId: string;
  roomConfig: RoomConfig;
  startedAt: number | null;
}

interface PlayerState {
  id: string;
  name: string;
  hand: Card[];           // サーバーのみが全員分保持
  isConnected: boolean;
  lastActiveAt: number;
  hasActedThisTurn: boolean;
}

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
  rank: number;           // 1-13, joker=0
  id: string;             // ユニークID（重複防止）
}

interface RoomConfig {
  maxPlayers: number;     // 3-8
  roomName: string;
  isPrivate: boolean;
  password?: string;      // ハッシュ化して保持
}
```

### 6.2 WebSocketメッセージプロトコル

#### クライアント → サーバー

```typescript
// ルーム参加
{ type: 'JOIN', payload: { token: string } }

// ゲーム開始（ホストのみ）
{ type: 'START_GAME' }

// 通常操作: カードを捨てる
{ type: 'DISCARD', payload: { cardId: string } }

// 特殊操作: 同数字カードをまとめて捨てる
{ type: 'DISCARD_MULTIPLE', payload: { cardIds: string[] } }

// カードを引く（捨て or 山札どちらかを操作後に送信）
{ type: 'DRAW', payload: { source: 'deck' | 'discard' } }

// ウニャモ宣言
{ type: 'DECLARE_UNYAMO' }

// 再接続
{ type: 'RECONNECT', payload: { token: string } }
```

#### サーバー → クライアント

```typescript
// ゲーム状態の同期（各プレイヤーに個別送信）
{
  type: 'GAME_STATE',
  payload: {
    phase: string;
    myHand: Card[];                    // 自分の手札のみ
    otherPlayers: {
      id: string;
      name: string;
      cardCount: number;               // 他人は枚数のみ
      isConnected: boolean;
    }[];
    discardPileTop: Card | null;       // 捨て札の一番上のみ
    deckCount: number;                 // 山札の残数
    currentTurnPlayerId: string;
    myTotalScore: number;              // 自分の合計点
    canDeclareUnyamo: boolean;         // 宣言可能か
    availableActions: string[];        // 実行可能なアクション一覧
  }
}

// アクション結果
{
  type: 'ACTION_RESULT',
  payload: {
    success: boolean;
    action: string;
    playerId: string;
    error?: string;
    // カード情報は必要最小限のみ
  }
}

// ターン変更通知
{ type: 'TURN_CHANGE', payload: { currentPlayerId: string } }

// ウニャモ宣言通知
{ type: 'UNYAMO_DECLARED', payload: { playerId: string, playerName: string } }

// ゲーム結果
{
  type: 'GAME_RESULT',
  payload: {
    results: {
      playerId: string;
      playerName: string;
      hand: Card[];         // 結果時のみ全員の手札を公開
      totalScore: number;
      rank: number;
      declared: boolean;
      isWinner: boolean;
    }[];
  }
}

// エラー
{ type: 'ERROR', payload: { message: string, code: string } }

// プレイヤーの接続状態変化
{ type: 'PLAYER_STATUS', payload: { playerId: string, isConnected: boolean } }
```

### 6.3 サーバーサイド検証ルール

全てのクライアントアクションはサーバーで以下を検証する:

1. **ターン検証**: アクション送信者が現在のターンプレイヤーか
2. **フェーズ検証**: 現在のゲームフェーズで許可されたアクションか
3. **カード存在検証**: 捨てようとしているカードが手札に存在するか
4. **特殊操作検証**: 捨てるカードが全て同じ数字か、2〜3枚か
5. **ウニャモ検証**: 手札合計が5点以下か
6. **重複操作防止**: 同一ターン内で2回操作していないか

### 6.4 切断・タイムアウト処理

- 接続切断検知: WebSocket close イベント
- タイムアウト: 30秒間操作がない場合、自動操作を実行
  - 自動操作: 手札の最大点カードを1枚捨てる → 山札から1枚引く
- 再接続: 切断後5分以内ならルームに復帰可能、ゲーム状態を再同期
- 全員切断: 最後のプレイヤー切断から30分後にルーム破棄

---

## 7. 認証仕様

### 7.1 NextAuth.js 設定

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});
```

### 7.2 WebSocket認証フロー

1. クライアントがNextAuthからJWTトークンを取得
2. WebSocket接続時にトークンをJOINメッセージで送信
3. PartyKitサーバーがトークンを検証（NextAuth secretで署名確認）
4. 検証成功 → プレイヤーとしてルームに参加
5. 検証失敗 → 接続拒否

---

## 8. API Routes 仕様

### 8.1 エンドポイント一覧

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/rooms | ルーム一覧取得 | 必須 |
| POST | /api/rooms | ルーム作成 | 必須 |
| GET | /api/rooms/[id] | ルーム詳細取得 | 必須 |
| DELETE | /api/rooms/[id] | ルーム削除（ホストのみ） | 必須 |
| GET | /api/users/me | 自分のプロフィール | 必須 |
| GET | /api/users/me/stats | 自分の戦績 | 必須 |
| GET | /api/users/[id]/stats | 他ユーザーの戦績 | 必須 |

### 8.2 レート制限

```typescript
// API Routeにレート制限を適用
// IPベース: 60リクエスト/分
// ユーザーベース: 120リクエスト/分
```

### 8.3 入力バリデーション（zod）

```typescript
import { z } from 'zod';

const createRoomSchema = z.object({
  roomName: z.string().min(1).max(30).trim(),
  maxPlayers: z.number().int().min(3).max(8),
  isPrivate: z.boolean(),
  password: z.string().min(4).max(20).optional(),
});

const discardSchema = z.object({
  cardId: z.string().uuid(),
});

const discardMultipleSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(2).max(3),
});

const drawSchema = z.object({
  source: z.enum(['deck', 'discard']),
});
```

---

## 9. フロントエンド仕様

### 9.1 ページ構成

| ページ | パス | 説明 |
|--------|------|------|
| ランディング | / | ゲーム紹介、ログイン誘導 |
| ログイン | /login | OAuth認証（Google/GitHub） |
| ロビー | /lobby | ルーム一覧、作成、参加 |
| ゲームルーム | /room/[id] | ゲームプレイ画面 |
| 結果 | /result/[id] | ゲーム結果詳細 |
| プロフィール | /profile | 戦績、アカウント設定 |

### 9.2 ゲーム画面レイアウト（モバイルファースト）

```
┌──────────────────────────────────┐
│  ヘッダー（ルーム名 / ターン表示）  │
├──────────────────────────────────┤
│                                  │
│     他プレイヤーエリア（上部）      │
│  ┌──┐ ┌──┐ ┌──┐  （伏せカード）   │
│  │??│ │??│ │??│  名前 + 枚数     │
│  └──┘ └──┘ └──┘                 │
│                                  │
│  ┌────────┐  ┌────────┐         │
│  │ 山 札  │  │ 捨て札  │         │
│  │ 残:XX  │  │  ♠ 7   │         │
│  └────────┘  └────────┘         │
│                                  │
├──────────────────────────────────┤
│  操作パネル                       │
│  [通常捨て] [特殊捨て] [引く]     │
│  [ウニャモ宣言 ✨]（条件時のみ）   │
├──────────────────────────────────┤
│  自分の手札（扇形配置）            │
│      ┌──┐                       │
│    ┌──┤  │                      │
│  ┌──┤  │7♠│                     │
│  │A♥│3♦│  │                     │
│  └──┘  └──┘                     │
│  合計: X点                       │
└──────────────────────────────────┘
```

### 9.3 デスクトップレイアウト

```
┌────────────────────────────────────────────────────┐
│  ヘッダー（ルーム名 / ターン / タイマー）             │
├──────────────┬────────────────────┬─────────────────┤
│              │                    │                 │
│  プレイヤー   │    ゲームボード     │  プレイヤー      │
│  情報 (左)   │                    │  情報 (右)       │
│              │  ┌────┐  ┌────┐   │                 │
│  名前        │  │山札│  │捨札│   │  名前            │
│  カード枚数   │  └────┘  └────┘   │  カード枚数      │
│  接続状態     │                    │  接続状態        │
│              │                    │                 │
├──────────────┴────────────────────┴─────────────────┤
│  操作パネル + 自分の手札（横並び）                      │
│  ┌──┐ ┌──┐ ┌──┐     [捨てる] [引く] [ウニャモ ✨]    │
│  │A♥│ │3♦│ │7♠│                                    │
│  └──┘ └──┘ └──┘     合計: X点                       │
└────────────────────────────────────────────────────┘
```

### 9.4 UI/UXデザインガイドライン

#### カラースキーム
- ベース: ダークモード基調（カードが映える）
  - 背景: `#0f172a`（slate-900）
  - サーフェス: `#1e293b`（slate-800）
  - ボーダー: `#334155`（slate-700）
- アクセント: エメラルドグリーン `#10b981`
- ウニャモ宣言ボタン: ゴールド `#f59e0b` + グロウエフェクト
- カード:
  - 背面: ダークブルーのパターン
  - 表面: 白背景 + 大きな数字とスート
  - ♥♦: `#ef4444`（赤）
  - ♠♣: `#1e293b`（黒）

#### アニメーション仕様（framer-motion）
- カード配布: デッキから各プレイヤーにフライアニメーション（0.3s）
- カード捨て: 手札から捨て札へのスライド（0.2s）
- カード引く: 山札/捨て札から手札へのスライド（0.2s）
- ウニャモ宣言: ボタンのパルスアニメーション + 画面全体にエフェクト
- 勝利: 紙吹雪エフェクト
- ターン切替: ハイライト移動（0.3s）

#### レスポンシブブレイクポイント
- モバイル: 〜639px（1カラム、手札は下部固定）
- タブレット: 640px〜1023px
- デスクトップ: 1024px〜

#### アクセシビリティ
- カードはスートの色だけでなくシンボルでも区別可能に
- フォーカス管理: キーボード操作対応
- スクリーンリーダー: aria-label で手札情報を通知
- コントラスト比: WCAG AA 準拠

---

## 10. セキュリティ仕様

### 10.1 通信セキュリティ
- Vercel: HTTPS強制（自動）
- PartyKit: WSS（TLS）対応
- CORS: 許可オリジンを明示的に設定

### 10.2 認証セキュリティ
- JWTセッション（サーバーサイドで署名検証）
- CSRF保護（NextAuth標準）
- OAuthのstate/nonceパラメータ検証

### 10.3 ゲーム不正防止
- **カード情報隔離**: クライアントには自分の手札と捨て札の一番上のみ送信。他プレイヤーの手札は枚数のみ
- **全アクションのサーバー検証**: 6.3節の検証ルール参照
- **操作順序保証**: サーバー側でターン管理、不正な順序のアクションは拒否
- **リプレイ攻撃防止**: 各アクションにサーバー生成のnonce付与

### 10.4 入力サニタイズ
- zodによるAPI入力バリデーション
- ルーム名、プレイヤー名のXSS対策（HTMLエスケープ）
- SQLインジェクション防止（Prismaのパラメータバインディング）

### 10.5 レート制限
- API: IP単位で60req/min、ユーザー単位で120req/min
- WebSocket: メッセージ送信を1秒に1回に制限
- ルーム作成: 1ユーザー5ルーム/時間

### 10.6 環境変数管理

```env
# .env.example
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
PARTYKIT_HOST=
```

---

## 11. テスト方針

### 11.1 ユニットテスト（Vitest）

対象:
- `game-logic/deck.ts`: シャッフル、配布のランダム性・枚数検証
- `game-logic/scoring.ts`: 全カードパターンのスコア計算
- `game-logic/validation.ts`: 合法/違法アクションの判定
- `game-logic/unyamo.ts`: 宣言条件・勝敗判定ロジック

### 11.2 統合テスト

対象:
- API Routes: 認証ガード、バリデーション、レスポンス形式
- WebSocketプロトコル: メッセージの送受信フロー

### 11.3 E2Eテスト（Playwright）

対象:
- ログイン〜ルーム作成〜ゲーム開始〜終了の一連フロー
- 複数ブラウザでのリアルタイム同期
- 切断・再接続シナリオ

---

## 12. デプロイ・CI/CD

### 12.1 GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
```

### 12.2 デプロイフロー

1. `main`ブランチへのpush → Vercel自動デプロイ（本番）
2. PRの作成 → Vercelプレビュー環境自動生成
3. PartyKit → `npx partykit deploy` で手動 or CI連携

### 12.3 環境構成

| 環境 | 用途 | URL |
|------|------|-----|
| Production | 本番 | unyamo.vercel.app |
| Preview | PR確認 | unyamo-xxx.vercel.app |
| Local | 開発 | localhost:3000 |

---

## 13. 将来拡張ポイント

### 13.1 AIプレイヤー
- `game-logic/` 内にAI戦略モジュールを追加
- 難易度別（初級: ランダム、中級: 最小点狙い、上級: 相手の捨て札分析）
- PartyKitサーバー内でAIプレイヤーをシミュレーション

### 13.2 チャット機能
- PartyKitの既存WebSocket接続にチャットメッセージを追加
- XSS対策必須（HTMLサニタイズ）

### 13.3 ランキング・リーダーボード
- Supabaseにランキング用のビューまたはマテリアライズドビューを追加
- 勝率、平均スコア等の集計

### 13.4 招待リンク
- ルームIDベースの招待URL生成（/room/[id]?invite=true）
- QRコード生成（モバイル向け）

---

## 14. 開発順序（推奨）

### Phase 1: 基盤構築
1. Next.jsプロジェクト初期化（TypeScript, Tailwind, shadcn/ui）
2. Prismaスキーマ定義 + Supabase接続
3. NextAuth.js設定（Google OAuth）
4. 基本レイアウト（ヘッダー、フッター、認証状態管理）

### Phase 2: ゲームロジック
5. `game-logic/` のコアロジック実装 + ユニットテスト
6. PartyKitゲームサーバー実装
7. WebSocketメッセージプロトコル実装

### Phase 3: ゲームUI
8. カードコンポーネント（SVG or CSS）
9. ゲームボード画面
10. 手札の扇形配置 + タップ選択
11. 操作パネル + ウニャモ宣言ボタン
12. アニメーション実装

### Phase 4: ロビー・マッチング
13. ルーム一覧・作成画面
14. ルーム参加フロー
15. API Routes実装

### Phase 5: 仕上げ
16. 結果画面 + 戦績保存
17. プロフィール画面
18. E2Eテスト
19. レスポンシブ最終調整
20. Vercel + PartyKitデプロイ

---

## 15. 環境構築手順

```bash
# 1. プロジェクト作成
npx create-next-app@latest unyamo --typescript --tailwind --app --src-dir

# 2. 依存関係インストール
cd unyamo
npm install next-auth @auth/prisma-adapter prisma @prisma/client
npm install zod framer-motion partysocket
npm install -D vitest @testing-library/react playwright

# 3. shadcn/ui 初期化
npx shadcn@latest init

# 4. Prisma初期化
npx prisma init

# 5. 環境変数設定
cp .env.example .env.local
# .env.local に各サービスの認証情報を設定

# 6. DB マイグレーション
npx prisma migrate dev --name init

# 7. PartyKit初期化
npm install partykit partysocket
npx partykit init

# 8. 開発サーバー起動
npm run dev                # Next.js
npx partykit dev           # PartyKit（別ターミナル）
```

---

*本仕様書は Unyamo Webアプリケーション v1.0 の実装ガイドとして使用する。*
*Claude Code での実装時は、Phase 1 から順に進めること。*
