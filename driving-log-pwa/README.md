# 運転日報PWA

運転日報を簡単に記録・管理できるProgressive Web Application (PWA)です。

## 特徴

- 📱 **完全オフライン対応**: インターネット接続なしで全機能が利用可能
- 📍 **GPS位置情報記録**: 出発・経由・到着地点を自動記録
- 📄 **CSVエクスポート**: 運転記録をCSV形式でダウンロード
- 🔒 **プライバシー保護**: データは端末内のみに保存、外部送信なし
- 📲 **PWA対応**: ホーム画面に追加してネイティブアプリのように使用可能

## 技術スタック

- **フロントエンド**: HTML5, TypeScript, CSS3
- **ストレージ**: IndexedDB, LocalStorage
- **PWA**: Service Worker, Web App Manifest
- **開発ツール**: Jest, ESLint, Prettier

## 開発環境のセットアップ

### 必要な環境

- Node.js 16.0.0以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# テストの実行
npm test

# リントとフォーマット
npm run lint
npm run format
```

## プロジェクト構造

```
driving-log-pwa/
├── src/
│   ├── js/
│   │   ├── controllers/    # UIコントローラー
│   │   ├── services/       # ビジネスロジック
│   │   ├── models/         # データモデル
│   │   └── utils/          # ユーティリティ関数
│   ├── css/                # スタイルシート
│   ├── assets/             # 画像、アイコン
│   ├── index.html          # メインHTML
│   ├── manifest.json       # PWAマニフェスト
│   └── service-worker.js   # Service Worker
├── tests/                  # テストファイル
├── dist/                   # ビルド出力
└── docs/                   # ドキュメント
```

## 主な機能

### 運転記録の作成
- 出発地点、経由地点、到着地点の記録
- GPS自動取得または手動入力
- 走行距離の自動計算

### データ管理
- 運転履歴の一覧表示
- 日付や期間での検索・フィルタリング
- 個別記録の編集・削除

### エクスポート機能
- CSV形式でのデータエクスポート
- 期間指定エクスポート
- プライバシー情報のフィルタリング

## ライセンス

MIT License

## 貢献

Issue や Pull Request を歓迎します。

## サポート

問題や質問がある場合は、[Issues](https://github.com/yourusername/driving-log-pwa/issues) に投稿してください。