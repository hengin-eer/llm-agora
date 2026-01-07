# リファクタリング仕様書: 関数型アプローチによるDebate Engine

## 1. 概要
`src/app/page.tsx` に記述されている議論ロジック（Fixed Mode, Dynamic Mode等）を、関数型プログラミング（FP）のアプローチを用いてリファクタリングする。
高階関数（Higher-Order Functions）とカリー化を活用し、副作用（APIコール/UI更新）と純粋なロジック（プロンプト構築/次話者決定）を分離することで、テスト容易性と拡張性を高める。

## 2. アーキテクチャ

### 2.1 ディレクトリ構造
`src/lib/debate/` 配下にロジックを集約する。

```
src/lib/debate/
├── types.ts            # 型定義（Discriminated Unions等）
├── actions.ts          # 副作用を伴う処理（LLM API呼び出し）
├── strategies.ts       # 議論進行戦略（高階関数群）
├── runner.ts           # 実行エンジン
└── role-definitions.ts # ロール定義と専用プロンプト（新規）
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

// 議論の進行戦略を定義する関数型
export type NextSpeakerStrategy = (context: DebateContext) => Role | null;
export type PromptStrategy = (context: DebateContext, nextSpeaker: Role) => string;
```

#### B. 戦略モジュール (`strategies.ts`)
議論のモードごとの振る舞いを高階関数として定義する。これらは「純粋関数」であることを目指す。

*   **Speaker Selection Strategies**: 次に誰が話すべきかを決定する。
    *   `createFixedOrderStrategy(order: Role[])`: 事前定義された順序で話者を決定する高階関数。
    *   `dynamicSelectionStrategy`: 文脈に基づいて動的に決定する（今回は簡易実装または将来拡張）。
*   **Prompt Factory Strategies**: 文脈に応じたプロンプトを生成する。
    *   `createDebatePromptStrategy(instructions: Record<Role, string>)`: 役割ごとの指示書に基づきプロンプトを生成。

#### C. 副作用モジュール (`actions.ts`)
Next.jsのServer Actions、またはClientからのAPI Route呼び出しをカプセル化する。

```typescript
export const callChatApi = async (messages: Message[]): Promise<string> => {
  // src/app/api/chat/route.ts へのfetch処理
};
```

#### D. 実行エンジン (`runner.ts`)
再帰的、あるいはループ処理によって議論を進行させるメイン関数。
UIコンポーネントはこの関数を呼び出し、コールバックで状態更新を受け取る。

```typescript
type StateUpdater = (newMessage: Message) => void;

export const runDebate = async (
  initialContext: DebateContext,
  strategies: {
    nextSpeaker: NextSpeakerStrategy;
    promptFactory: PromptStrategy;
  },
  effects: {
    generateResponse: (prompt: string) => Promise<string>;
    onMessage: StateUpdater;
  }
) => {
  // 1. NextSpeaker戦略を実行
  // 2. 終了条件判定
  // 3. Prompt戦略を実行
  // 4. 副作用（APIコール）実行
  // 5. State更新
  // 6. 再帰呼び出し or 終了
};
```

## 3. 既存コードの変更点

### 3.1 プロンプト管理のモジュール化
現在 `page.tsx` に定義されている `SYSTEM_PROMPTS` や `DEBATE_ROLES` を、`src/lib/debate/role-definitions.ts` に移動しモジュール化する。
これにより、議論モードや新しい参加者ロールを追加する際に、UIコンポーネント（`page.tsx`）を修正する必要がなくなり、構成とロジックが明確に分離される。

### 3.2 `src/app/page.tsx`
巨大な `useEffect` や `runFixedMode` 関数を削除し、`useDebate` フック（または直接的なハンドラ呼び出し）経由で `runner.ts` を利用する形に変更する。
State管理だけを担当し、ロジックを持たない「View」に近い構成とする。

## 4. 目標とするメリット
1.  **拡張性**: 新しい議論モード（例: 自由討論モード）を追加する際、`NextSpeakerStrategy` を差し替えるだけで済む。
2.  **可読性**: 制御フロー（`runner.ts`）とビジネスロジック（`strategies.ts`）が分離され、コードの見通しが良くなる。
3.  **保守性**: プロンプトが一箇所にまとまり、微調整が容易になる。

## 5. 実装ステップ
1.  **Step 1**: `src/lib/debate/role-definitions.ts` を作成し、`page.tsx` からロールとプロンプト定義を移行。
2.  **Step 2**: `src/lib/debate/` ディレクトリ作成と `types.ts`, `actions.ts` 実装。
3.  **Step 3**: `strategies.ts` の実装（Fixed Modeのロジック移植）。
4.  **Step 4**: `runner.ts` の実装。
5.  **Step 5**: `page.tsx` の書き換えと結合。
