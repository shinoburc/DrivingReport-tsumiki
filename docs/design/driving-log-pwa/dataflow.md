# データフロー図

## ユーザーインタラクションフロー

### 運転記録作成フロー
```mermaid
flowchart TD
    A[ドライバー] -->|新規記録開始| B[UI Layer]
    B -->|位置情報要求| C[GPS Service]
    C -->|GPS権限確認| D{権限あり?}
    D -->|Yes| E[GPS取得]
    D -->|No| F[手動入力UI]
    E -->|位置情報| G[Controller]
    F -->|手動データ| G[Controller]
    G -->|データ検証| H[Storage Service]
    H -->|保存| I[(IndexedDB)]
    I -->|保存完了| J[UI更新]
    J -->|フィードバック| A
```

### データ保存フロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as UIレイヤー
    participant C as Controller
    participant S as StorageService
    participant IDB as IndexedDB
    participant LS as LocalStorage
    
    U->>UI: 地点記録ボタンタップ
    UI->>C: recordLocation()
    C->>C: validateInput()
    C->>S: saveLocation(data)
    S->>IDB: put(drivingLog)
    IDB-->>S: success
    S->>LS: updateLastSync()
    LS-->>S: success
    S-->>C: savedData
    C->>UI: updateView()
    UI-->>U: 保存完了通知
```

### CSV エクスポートフロー
```mermaid
flowchart LR
    A[ユーザー] -->|エクスポート要求| B[Export Controller]
    B -->|期間指定| C[Storage Service]
    C -->|クエリ実行| D[(IndexedDB)]
    D -->|運転記録データ| E[CSV Service]
    E -->|CSV生成| F[Blob作成]
    F -->|ダウンロードURL生成| G[Download API]
    G -->|ファイルダウンロード| H[ユーザー]
```

## データ処理フロー

### GPS位置情報取得と処理
```mermaid
stateDiagram-v2
    [*] --> 待機中
    待機中 --> GPS取得中: 記録開始
    GPS取得中 --> 位置取得成功: 成功
    GPS取得中 --> 位置取得失敗: タイムアウト/エラー
    位置取得成功 --> データ保存
    位置取得失敗 --> 手動入力
    手動入力 --> データ保存
    データ保存 --> 待機中: 完了
```

### オフライン時のデータ管理
```mermaid
flowchart TD
    A[アプリ起動] --> B{Service Worker<br/>登録済み?}
    B -->|No| C[SW登録]
    B -->|Yes| D[キャッシュ確認]
    C --> D
    D --> E{オンライン?}
    E -->|Yes| F[通常動作]
    E -->|No| G[オフラインモード]
    G --> H[ローカルデータのみ使用]
    F --> I[全機能利用可能]
    H --> I
```

## 状態管理フロー

### アプリケーション状態遷移
```mermaid
stateDiagram-v2
    [*] --> 初期化中
    初期化中 --> アイドル: 初期化完了
    アイドル --> 記録中: 新規記録開始
    記録中 --> GPS取得中: 地点追加
    GPS取得中 --> 記録中: 取得完了
    記録中 --> 保存中: 記録完了
    保存中 --> アイドル: 保存完了
    アイドル --> 一覧表示: 履歴確認
    一覧表示 --> 詳細表示: 記録選択
    詳細表示 --> 一覧表示: 戻る
    一覧表示 --> エクスポート中: CSVエクスポート
    エクスポート中 --> 一覧表示: 完了
```

### データライフサイクル
```mermaid
flowchart TD
    A[データ作成] --> B[メモリ上の一時保存]
    B --> C[IndexedDB永続化]
    C --> D{データ参照}
    D -->|表示| E[UIレンダリング]
    D -->|エクスポート| F[CSV変換]
    C --> G{データ削除要求}
    G -->|個別削除| H[該当レコード削除]
    G -->|期間削除| I[条件一致レコード削除]
    H --> J[ストレージ更新]
    I --> J
```

## エラー処理フロー

### GPS取得エラー時の処理
```mermaid
flowchart TD
    A[GPS取得開始] --> B{権限確認}
    B -->|拒否| C[権限エラー表示]
    B -->|許可| D[位置取得試行]
    D --> E{取得成功?}
    E -->|No| F{タイムアウト?}
    F -->|Yes| G[タイムアウトエラー]
    F -->|No| H[一般エラー]
    E -->|Yes| I[正常処理継続]
    C --> J[手動入力促進]
    G --> J
    H --> J
    J --> K[代替入力UI表示]
```

### ストレージ容量エラー時の処理
```mermaid
flowchart TD
    A[データ保存要求] --> B[容量チェック]
    B --> C{容量十分?}
    C -->|Yes| D[保存実行]
    C -->|No| E[容量不足警告]
    E --> F[古いデータ削除提案]
    F --> G{ユーザー承認?}
    G -->|Yes| H[古いデータ削除]
    G -->|No| I[CSVエクスポート促進]
    H --> J[容量確保後保存]
    I --> K[保存キャンセル]
```