# リファクタリング仕様書: 関数型アプローチとAsync GeneratorによるDebate Engine

## 1. 背景と目的

### 現状の課題
現在の `src/app/page.tsx` は、議論の進行ロジック、UI描画、API通信、状態管理が密結合した「モノリシック」な構造になっています。
特に、`runFixedMode` などの関数内で非同期処理(`callAPI`)と状態更新(`setMessages`)が混在しており、以下の問題が発生しています。

1.  **Push型（コールバック方式）の弊害**: ロジックの中からUI更新関数を直接呼び出すため、Reactのレンダリングサイクルとの整合性を保つのが難しく、中断機能(`stopRef`)の実装も複雑化しています。
2.  **拡張性の欠如**: 新しい議論モードを追加するには、巨大な条件分岐を増やす必要があり、既存機能への影響範囲が見えにくくなっています。
3.  **責務の混在**: 「誰が次に話すか（純粋なルール）」と「実際にAPIを叩いて答えを得る（副作用）」が混ざっており、ユニットテストが困難です。

### リファクタリングの方針
これらの課題を解決するため、**「Functional Core, Imperative Shell（関数型のコア、命令型のシェル）」** のアーキテクチャを採用し、議論エンジンを再構築します。
また、Reactとの親和性を高めるため、実行エンジンには **「Generator Pattern（Pull型）」** を導入します。

---

## 2. コア・コンセプト

### A. Functional Core（純粋なルール）
議論の「ルール」や「モード」は、副作用を持たない **純粋関数 (Pure Functions)** として定義します。
「現在の会話履歴」を入力とし、「次に誰が話すべきか」「どんなプロンプトを使うか」を出力します。API通信や時間は扱いません。

### B. Imperative Shell（実行エンジン）
API通信や時間の経過といった「副作用」は、**Async Generator** を用いた `runner.ts` が一手に引き受けます。
Generatorは、新しいメッセージや状態変化が発生するたびに値を `yield` します。

### C. Pull型アーキテクチャ（Reactコンシューマー）
UI側（React）は、Generatorから流れてくる値を `for await...of` ループで受け取ります。
これにより、UIは「いつ描画するか」「いつ中断するか」の主導権を握ることができます。

---

## 3. ディレクトリ構造

`src/lib/debate/` 配下にロジックを集約します。

```
src/lib/debate/
├── types.ts            # 型定義（共通インターフェース）
├── actions.ts          # 副作用の実装（API Route呼び出し）
├── role-definitions.ts # 【Data】ロール定義と専用プロンプト（Single Source of Truth）
├── runner.ts           # 【Shell】実行エンジン（Async Generator）
└── modes/              # 【Core】議論モードごとの純粋ルール定義
    ├── index.ts        # 各モードのエクスポート
    ├── fixed.ts        # 回数指定モード
    ├── loop.ts         # ループモード
    └── consensus.ts    # 合意達成モード
```

---

## 4. モジュール詳細仕様

### 4.1 型定義 (`types.ts`)

議論の状態や、各モードが実装すべきインターフェースを定義します。

```typescript
// 役割の定義
export type Role = 'facilitator' | 'positive' | 'negative' | 'user' | string;

// メッセージ構造
export interface Message {
  role: Role;
  content: string;
  id: string; // UUID v7
  timestamp: number;
}

// 議論の文脈（入力データ）
export interface DebateContext {
  topic: string;
  messages: Message[];
  currentRound: number;
  totalRounds: number;
}

// 純粋関数としてのルール定義（旧 Strategy）
export type RoleSelector = (context: DebateContext) => Role | null;
export type PromptBuilder = (context: DebateContext, nextSpeaker: Role) => string;

// すべての議論モードが満たすべき契約
export interface DebateModeDefinition {
  name: string;
  init?: (context: DebateContext) => DebateContext;
  selectNextSpeaker: RoleSelector; // 次は誰？
  buildPrompt: PromptBuilder;      // その人に何と言わせる？
}
```

### 4.2 ロール定義 (`role-definitions.ts`)

現在 `page.tsx` に散在している `SYSTEM_PROMPTS` や `DEBATE_ROLES` を一元管理します。
ここを修正すれば、アプリケーション全体のペルソナが変更される「Single Source of Truth」とします。

### 4.3 議論モード (`modes/*.ts`)

各ファイルは `DebateModeDefinition` を返す関数をエクスポートします。
これらは完全にロジックのみを記述し、API呼び出しなどは含みません。

*   **Fixed Mode**: 配列で定義された順序を単純に返すロジック。
*   **Loop Mode**: 現在のラウンド数を見て、肯定/否定を切り替えるロジック。
*   **Consensus Mode**: 合意形成フェーズかどうかを判定し、話者を決定する条件分岐ロジック。

### 4.4 実行エンジン (`runner.ts`)

**本リファクタリングの核となる部分です。**
Generator関数として実装され、反復可能なストリームを提供します。

```typescript
// UIへ通知するイベントの種類
export type DebateYield =
  | { type: 'message'; message: Message }       // 新しい発言があった
  | { type: 'status'; status: 'thinking' | 'waiting' | string } // 考え中などの状態遷移
  | { type: 'finish'; reason: string };         // 議論終了

export async function* runDebate(
  initialContext: DebateContext,
  mode: DebateModeDefinition,
  effects: {
    generateResponse: (prompt: string) => Promise<string>;
  }
): AsyncGenerator<DebateYield, void, unknown> {
  let context = { ...initialContext };

  // 初期化があれば実行
  if (mode.init) {
    context = mode.init(context);
  }

  while (true) {
    // 1. 次の話者を決定（純粋関数）
    const nextSpeaker = mode.selectNextSpeaker(context);
    if (!nextSpeaker) {
      yield { type: 'finish', reason: 'No more speakers' };
      break;
    }

    // 2. プロンプト生成（純粋関数）
    const prompt = mode.buildPrompt(context, nextSpeaker);

    // 3. UIに「考え中」を通知
    yield { type: 'status', status: `thinking:${nextSpeaker}` };

    // 4. API呼び出し（副作用）
    // NOTE: ここでエラーハンドリングや待機時間(sleep)も挟める
    const responseContent = await effects.generateResponse(prompt);

    // 5. メッセージオブジェクト構築
    const newMessage: Message = {
      role: nextSpeaker,
      content: responseContent,
      id: crypto.randomUUID(), // or uuidv7
      timestamp: Date.now(),
    };

    // 6. UIにメッセージを通知
    yield { type: 'message', message: newMessage };

    // 7. コンテキスト更新
    context.messages.push(newMessage);

    // ループ継続...
  }
}
```

### 4.5 コンシューマー (`src/app/page.tsx`)

View層はロジックを持たず、Generatorを回すだけのシンプルな構造になります。
中断ボタンが押された場合、ループを `break` するだけで、安全に処理が停止します。

```typescript
const handleStart = async () => {
  setIsRunning(true);

  // Generatorを作成
  const iterator = runDebate(context, selectedMode, { generateResponse: apiCall });

  for await (const update of iterator) {
    // ストップフラグのチェックもループ条件で行えるが、breakでもOK
    if (!isRunningRef.current) break;

    if (update.type === 'message') {
      setMessages(prev => [...prev, update.message]);
    } else if (update.type === 'status') {
      // 誰が考え中かなども表示可能
      setStatus(update.status);
    }
  }

  setIsRunning(false);
};
```

---

## 5. 実装ロードマップ

1.  **Step 1: データ移行**
    *   `src/lib/debate/role-definitions.ts` を作成し、プロンプト定義を移動。
2.  **Step 2: 基盤実装**
    *   `types.ts` で型定義を作成。
    *   `actions.ts` でAPI呼び出し関数を分離。
3.  **Step 3: モード定義**
    *   `modes/` ディレクトリを作成。
    *   まず `fixed.ts` (Fixed Mode) を移植。
4.  **Step 4: エンジン実装**
    *   `src/lib/debate/runner.ts` を Async Generator として実装。
5.  **Step 5: View結合**
    *   `page.tsx` を修正し、新しいエンジンを使用するように書き換え。
    *   古いロジックを削除。

---

## 6. 将来の拡張性
このアーキテクチャにすることで、将来以下のような機能追加が容易になります。

*   **ステップ実行機能**: Generatorは `next()` を呼ぶまで止まっているため、「次の発言を表示」ボタンの実装が容易。
*   **分岐シミュレーション**: `runDebate` を途中の Context から開始すれば、そこから別の議論を展開可能。
*   **テスト自動化**: `modes/*.ts` は純粋関数なので、API無しでロジックの単体テストが可能。
