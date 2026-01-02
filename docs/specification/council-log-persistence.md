# 合議ログ保存・復元機能 (Council Log Persistence) 仕様書

## 1. 概要
本機能は、LLM Agoraで行われた合議（議論）の履歴をJSON形式で保存（エクスポート）し、後から読み込んでプレビュー（インポート）できるようにするものである。
これにより、過去の議論内容の振り返りや、議論結果の共有が可能となる。

## 2. データモデル (JSON Schema)

保存されるJSONファイルは、アプリケーションの状態を再現するために必要な全ての情報を含む。

### 2.1. ファイル形式
- **ファイル名**: `YYYYMMDDHHmmss_{english-slug}.json`
  - 例: `20251001120000_ai-ethics-debate.json`
  - `english-slug`: 議題（日本語）を英語小文字のケバブケース（ハイフンつなぎ）に変換したもの。
- **保存先**: `docs/council-logs/`

### 2.2. スキーマ定義 (`CouncilLog`)

```typescript
type RoleType = "user" | "assistant";
type DebateMode = "fixed" | "loop" | "consensus" | "multifaceted";

interface Message {
  id: string;
  role: RoleType;
  content: string;
  roleName?: string; // 表示用のロール名 (例: "肯定派", "ファシリテーター")
}

interface CouncilLog {
  // メタデータ
  id: string;           // UUID v4
  version: string;      // スキーマバージョン (初期値: "1.0.0")
  topic: string;        // 議題 (ユーザー入力)
  startTime: string;    // 開始時刻 (ISO 8601)
  endTime: string;      // 終了時刻 (ISO 8601)

  // 設定情報
  mode: DebateMode;
  settings: {
    turnCount?: number;       // 回数指定モード時のターン数
    loopCount?: number;       // ループモード時のループ回数
    selectedRoles?: string[]; // 多面的議論モード時の参加ロールキー配列 (例: ["positive", "negative", "critical"])
    minInterval: number;      // API呼び出し間隔 (秒)
  };

  // 履歴データ
  messages: Message[];
}
```

## 3. エクスポート機能 (保存)

### 3.1. トリガー
- 合議プロセスが正常に終了した時点（全ロールの出力完了後）。
- ユーザーによる手動停止時は、その時点までのログを保存するか確認（今回は自動保存の対象外とし、完了時のみ保存とする）。

### 3.2. 処理フロー
1. **終了検知**: クライアントサイドで議論終了を検知。
2. **Slug生成**: 議題 (`topic`) を元に、LLMまたは変換ロジックを用いて英語のSlugを生成する。
   - 例: "AIの権利について" -> "ai-rights"
3. **データ構築**: 現在のState (`messages`, `mode`, `settings` 等) から `CouncilLog` オブジェクトを生成。
4. **API送信**: `POST /api/council-logs` にJSONデータを送信。
5. **ファイル書き込み**: サーバーサイドで `docs/council-logs/` ディレクトリにファイルを保存。

### 3.3. API設計 (Export)
- **Endpoint**: `POST /api/council-logs`
- **Request Body**: `CouncilLog` オブジェクト
- **Response**:
  - Success: `{ success: true, filename: "..." }`
  - Error: `{ success: false, error: "..." }`

## 4. インポート機能 (復元/プレビュー)

### 4.1. UI/UX
- **ログ一覧**: 保存されたログファイルの一覧を表示する機能（将来実装）。
- **読み込み**:
  - 現段階では、開発者がファイルを指定するか、簡易的なファイルアップロード/選択UIを通じてJSONを読み込む。
  - または、`docs/council-logs` 内のファイルを一覧取得するAPIを用意し、クライアントで選択可能にする。

### 4.2. 処理フロー
1. **ファイル取得**: サーバーからログファイルの内容を取得 (`GET /api/council-logs/[filename]`)。
2. **状態復元**: 取得した `CouncilLog` データを、ReactのState (`setMessages`, `setTopic`, `setDebateMode` 等) に適用。
3. **プレビュー**: チャット画面が更新され、過去の議論が表示される。
   - ※この際、新たなAPIリクエストが発生しないように注意する（あくまで閲覧モード）。

### 4.3. API設計 (Import/List)
- **List Endpoint**: `GET /api/council-logs`
  - Response: `{ files: string[] }` (ファイル名リスト)
- **Detail Endpoint**: `GET /api/council-logs/[filename]`
  - Response: `CouncilLog` オブジェクト

## 5. 実装ステップ

1. **API実装**: `src/app/api/council-logs/route.ts` (POST/GET) の作成。
2. **Slug生成ロジック**: 簡易的な翻訳またはLLM利用の実装。
3. **クライアント実装**: `src/app/page.tsx` に保存ロジックを追加（議論終了時）。
4. **インポートUI**: 簡易的なログ選択・読み込み機能の追加。
