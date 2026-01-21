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
- **保存先**: `public/council-logs/`
- **Git管理**: すべてのログファイルおよび `index.json` はGit管理対象とする

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
  id: string;           // UUID v7
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
2. **Slug生成**: 議題 (`topic`) を元に、LLMを用いて英語のSlugを生成する。
   - 例: "AIの権利について" -> "ai-rights"
3. **データ構築**: 現在のState (`messages`, `mode`, `settings` 等) から `CouncilLog` オブジェクトを生成。
4. **API送信**: `POST /api/council-logs` にJSONデータを送信。
5. **ファイル書き込み**: サーバーサイドで `public/council-logs/` ディレクトリにファイルを保存。
6. **インデックス更新**: 同じAPIリクエスト内で `public/council-logs/index.json` を更新し、新しいファイルをファイルリストに追加する。

### 3.3. API設計 (Export)
- **Endpoint**: `POST /api/council-logs`
- **Request Body**: `CouncilLog` オブジェクト
- **Response**:
  - Success: `{ success: true, filename: "..." }`
  - Error: `{ success: false, error: "..." }`
- **処理内容**:
  1. `public/council-logs/{filename}.json` にログファイルを保存
  2. `public/council-logs/index.json` を読み込み、新しいファイル名を追加して更新
  3. `index.json` のフォーマット: `string[]` (ファイル名の配列、日付降順でソート)

## 4. インポート機能 (閲覧/プレビュー)

### 4.1. UI/UX
- **専用閲覧ページ**: メインの議論画面とは別に、ログ閲覧専用のページを作成する。
  - 一覧ページ: `/logs` - 保存されたログファイルの一覧を表示。
  - 詳細ページ: `/logs/[filename]` - 選択したログの内容を再生/表示。
- **コンポーネント再利用**: メッセージ表示部分 (`Message` コンポーネントや `MarkdownPreview` 等) はメイン画面と共通化して利用する。

### 4.2. 処理フロー
1. **一覧表示**: ユーザーが `/logs` にアクセスすると、`GET /api/council-logs` を呼び出し、ファイル一覧を表示する。
2. **詳細表示**: ユーザーがファイルを選択すると、`/logs/[filename]` に遷移。
3. **データ取得**: 詳細ページで `GET /api/council-logs/[filename]` を呼び出し、ログデータを取得。
4. **レンダリング**: 取得したデータを元に、議論の様子を再現表示する（読み取り専用モード）。

### 4.3. API設計 (Import/List)
- **List Endpoint**: `GET /api/council-logs`
  - Response: `{ files: string[] }` (ファイル名リスト)
- **Detail Endpoint**: `GET /api/council-logs/[filename]`
  - Response: `CouncilLog` オブジェクト

## 5. 実装ステップ

1. **API実装**:
   - `src/app/api/council-logs/route.ts` (POST/GET) - 実装済み（保存先を `public/council-logs/` に変更、`index.json` 更新処理を追加）
   - `src/app/api/council-logs/[filename]/route.ts` (GET) - 実装済み（参照先を `public/council-logs/` に変更）
2. **Slug生成ロジック**: 実装済み
3. **クライアント実装 (保存)**: 実装済み
4. **閲覧ページ実装**:
   - `src/app/logs/page.tsx` (一覧) - 実装済み
   - `src/app/logs/[filename]/page.tsx` (詳細) - 実装済み
5. **ビルドスクリプト**:
   - `scripts/prepare-logs.mjs` - 削除または簡素化（コピー処理が不要になったため）
   - `package.json` - `prepare-logs` の実行タイミングを調整または削除

## 6. 変更履歴

### 2026年1月21日: 保存先を public に統一
- **背景**: 当初は `docs/council-logs/` に保存し、ビルド時に `public/council-logs/` へコピーする設計だったが、二重管理を避けるため直接 `public/council-logs/` へ保存する方式に変更。
- **変更内容**:
  - 保存先を `docs/council-logs/` から `public/council-logs/` に変更
  - POST API内で `index.json` を自動生成・更新する処理を追加
  - すべてのログファイルおよび `index.json` をGit管理対象とする
  - `scripts/prepare-logs.mjs` のコピー処理が不要になった（削除または役割変更を検討）
- **利点**:
  - ファイルの二重管理が不要
  - 開発時の同期処理が不要
  - 実装がシンプルになる
  - すべての実験結果をGit履歴として保持できる
