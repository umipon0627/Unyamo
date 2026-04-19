# Unyamo

オリジナルトランプゲーム「Unyamo」のオンライン対戦 Web アプリ。

## セットアップ

```bash
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
npm run test         # ユニットテスト
npm run type-check   # TypeScript型チェック
npm run lint         # ESLint
npx prisma studio    # DB GUI
```

## 環境変数

`.env.example` を参照してください。
