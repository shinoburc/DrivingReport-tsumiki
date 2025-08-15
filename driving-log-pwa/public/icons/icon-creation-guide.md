# 運転日報PWA アイコン作成ガイド

## 必要なアイコンサイズ

### Android Chrome
- 192x192px (推奨)
- 512x512px (推奨)

### iOS Safari
- 180x180px (apple-touch-icon)
- 167x167px (iPad Pro)
- 152x152px (iPad)
- 120x120px (iPhone)

### Windows
- 144x144px (msapplication-TileImage)

### その他
- 16x16px (favicon)
- 32x32px (favicon)
- 48x48px (general use)
- 72x72px (general use)
- 96x96px (general use)

## デザインコンセプト

### カラーパレット
- **プライマリ**: #2196F3 (Material Blue)
- **セカンダリ**: #FF9800 (Material Orange)  
- **背景**: #FFFFFF (White)
- **アクセント**: #4CAF50 (Material Green)

### アイコンデザイン
- 中央に車のシンボル 🚗
- 日報を表す線/ページのモチーフ
- 清潔でモダンなデザイン
- 高コントラストで視認性良好

### 実装方法

1. **SVGベースアイコンの作成**
2. **各サイズへの最適化**
3. **マスク対応アイコンの準備**
4. **適応型アイコン（Android）の作成**

## 生成すべきファイル

```
public/icons/
├── icon-16x16.png
├── icon-32x32.png
├── icon-48x48.png
├── icon-72x72.png
├── icon-96x96.png
├── icon-120x120.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-167x167.png
├── icon-180x180.png
├── icon-192x192.png
├── icon-512x512.png
├── apple-touch-icon.png (180x180)
├── favicon.ico
└── maskable-icon-512x512.png
```

## 品質チェックポイント
- 各サイズで鮮明に表示される
- マスク対応アイコンが適切に表示される
- 背景色の設定が正しい
- 高解像度ディスプレイ対応