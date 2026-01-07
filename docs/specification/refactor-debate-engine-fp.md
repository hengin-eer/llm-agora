# リファクタリング仕様書: 関数型アプローチによるDebate Engine

## 1. 概要
`src/app/page.tsx` に記述されている議論ロジック（Fixed Mode, Dynamic Mode等）を、関数型プログラミング（FP）のアプローチを用いてリファクタリングする。
高階関数（Higher-Order Functions）とカリー化を活用し、副作用（APIコール/UI更新）と純粋なロジック（プロンプト構築/次話者決定）を分離することで、テスト容易性と拡張性を高める。

## 2. アーキテクチャ

### 2.1 ディレクトリ構造
`src/lib/debate/` 配下にロジックを集約する。

```
src/lib/debate/
├── types.ts            # 型定義（共通インターフェース）
├── actions.ts          # 副作用を伴う処理（LLM API呼び出し）
├── role-definitions.ts # ロール定義と専用プロンプト
├── runner.ts           # 実行エンジン
└── modes/              # 議論モードごとのロジック定義
    ├── index.ts        # 各モードのエクスポート
    ├── fixed.ts        # 回数指定モード
    ├── loop.ts         # ループモード
    └── consensus.ts    # 合意達成モード
```

汎用的なプロンプトは `src/lib/llm/prompts.ts` に残しつつ、議論モード固有のロール定義プロンプトはこのディレクトリ内で管理する。

### 2.2 モジュール詳細

#### A. 型定義 (`types.ts`)
議論の状態やモードを厳格に型定義する。

```typescript
export type Role = 'facilitator' | 'positive' | 'negative' | 'user';

export interface Message {
  role: Role;
  content: string;
  id: string; // UUID v7
  timestamp: number;
}

export interface DebateContext {
  topic: string;
  messages: Message[];
  currentRound: number;
  totalRounds: number;
}

// 議論の進行ルールを定義する関数型（旧 Strategy）
export type RoleSelector = (context: DebateContext) => Role | null;
export type PromptBuilder = (context: DebateContext, nextSpeaker: Role) => string;

// 各モードが実装すべきインターフェース
export interface DebateModeDefinition {
  init?: (context: DebateContext) => DebateContext;
  selectNextSpeaker: RoleSelector;
  buildPrompt: PromptBuilder;
}
```

#### B. 議論モード定義 (`modes/*.ts`)
議論のモードごとの振る舞いを高階関数として定義する。
各モードは `DebateModeDefinition` インターフェースを満たすオブジェクトを生成する関数を提供する。

*   **Fixed Mode (`modes/fixed.ts`)**:
    *   `createFixedMode(order: Role[])`: 事前定義された順序リストに基づき話者を決定するモード定義を返す。
*   **Loop Mode (`modes/loop.ts`)**:
    *   肯定・否定をループさせるロジックを定義。
*   **Consensus Mode (`modes/consensus.ts`)**:
    *   合意形成に至るまでの動的なロール切り替えを定義。

#### C. 副作用モジュール (`actions.ts`)
Next.jsのServer Actions、またはClientからのAPI Route呼び出しをカプセル化する。

```typescript
export const callChatApi = async (messages: Message[]): Promise<string> => {
  // src/app/api/chat/route.ts へのfetch処理
};
```

#### D. 実行エンジン (`runner.ts`)
**Async Generator (非同期ジェネレータ)** を採用し、Pull型のアーキテクチャに変更する。
これにより、UI側（React）での状態更新や処理の中断（`break`）が容易かつ安全になる。

```typescript
// 具体的な出力の方針は検討が必要だが、基本は更新されたMessageやStatusをyieldする
export type DebateYield = 
  | { type: 'message'; message: Message }
  | { type: 'status'; status: 'thinking' | 'waiting' };

export async function* runDebate(
  initialContext: DebateContext,
  mode: DebateModeDefinition,
  effects: {
    generateResponse: (prompt: string) => Promise<string>;
  }
): AsyncGenerator<DebateYield, void, unknown> {
  // 1. ループ開始
  // 2. mode.selectNextSpeaker で次話者を決定
  // 3. 終了ならreturn
  // 4. mode.buildPrompt でプロンプト生成
  // 5. API呼び出し (yield {type: 'status', ...} で途中経過も通知可)
  // 6. 結果を yield {type: 'message', ...}
  // 7. Context更新して次へ
}
```

利用側（Component）は `for await...of` ループでこれを受け取る。

```typescript
// page.tsx での利用イメージ
for await (const update of runDebate(context, mode, effects)) {
  if (update.type === 'message') {
    setMessages(prev => [...prev, update.message]);
  }
}
```

## 3. 既存コードの変更点

### 3.1 プロンプト管理のモジュール化
現在 `page.tsx` に定義されている `SYSTEM_PROMPTS` や `DEBATE_ROLES` を、`src/lib/debate/role-definitions.ts` に移動しモジュール化する。
これにより、議論モードや新しい参加者ロールを追加する際に、UIコンポーネント（`page.tsx`）を修正する必要がなくなり、構成とロジックが明確に分離される。

### 3.2 `src/app/page.tsx`
巨大な `useEffect` や `runFixedMode` 関数を削除し、`useDebate` フック（または直接的なハンドラ呼び出し）経由で `runner.ts` を利用する形に変更する。
State管理だけを担当し、ロジックを持たない「View」に近い構成とする。

## 4. 目標とするメリット
1.  **拡張性**: 新しい議論モード（例: 自由討論モード）を追加する際、`modes/` に新しい定義ファイルを追加するだけで済む。
2.  **可読性**: 制御フロー（`runner.ts`）とビジネスロジック（`modes/*.ts`）が分離され、コードの見通しが良くなる。
3.  **保守性**: プロンプトが一箇所にまとまり、微調整が容易になる。

## 5. 実装ステップ
1.  **Step 1**: `src/lib/debate/role-definitions.ts` を作成し、`page.tsx` からロールとプロンプト定義を移行。
2.  **Step 2**: `src/lib/debate/` ディレクトリ作成と `types.ts`, `actions.ts` 実装。
3.  **Step 3**: `modes/` ディレクトリ作成と各モードロジックの実装。
4.  **Step 4**: `runner.ts` の実装。
5.  **Step 5**: `page.tsx` の書き換えと結合。
