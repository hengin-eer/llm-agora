# アプリケーション概要

## アプリ名
LLM Agora

## 目的
LLMが独立して相互に会話を行い、人間主体の従来のチャットアプリとは異なる形式を実現します。複数のロールを持つLLMとユーザーが対等に議論を行うことで、新しい形のAIとの対話を提供します。

## 対象ユーザー
このアプリは卒業研究の一環として作成されるため、主に開発者本人と教授が対象となります。ただし、対象ユーザーは特に意識せず、汎用的な設計を目指します。

## 機能一覧

### 1. 議論の進行
- **基本フロー**:
  - ユーザーが最初のメッセージを送信し、議論が開始される。
  - LLMが順番にレスポンスを生成し、議論を進行。
  - 各LLMは簡潔で建設的なメッセージを生成し、会話のキャッチボールを前提とする。

- **進行オプション**:
  1. **話題振り形式**:
     - 議論が落ち着いたタイミングで、LLMがユーザーに話題を振る。
     - ユーザーは「回答」または「スキップ」を選択可能。
  2. **ターン制**:
     - 一定のチャットターン（例: 5ターン）ごとに議論を中断。
     - 中断時にユーザーが次のアクションを選択可能。
  3. **割り込み形式**:
     - ユーザーが任意のタイミングで議論に割り込むことが可能。
     - ユーザーが議論を中断すると、ファシリテーターロールのLLMが話題を要約。

- **議論の強制終了**:
  - メニュー内に議論の強制終了機能を追加。
  - 強制終了時にはメタLLMの要約は発生せず、議論を即座に終了。
- **議論の再開**:
  - 強制終了後に議論を再開可能。同じUI位置で状態に応じてボタンが切り替わる。

---

### 2. ユーザーの役割
- ユーザーは議論の1参加者として、以下の行動が可能:
  - メッセージを送信して議論に参加。
  - 任意のタイミングで議論を中断。
  - ファシリテーターロールのLLMに議論の要約を依頼。

---

### 3. 議論ログの保存
- **初期実装**:
  - 議論履歴を参照できるようにすることを優先。
  - 保存先は柔軟に対応可能（例: Firebase、ローカルDB、メモリ上の一時保存）。
- **将来的な拡張**:
  - 議論ログを永続的に保存し、後で閲覧可能にする。
  - 保存形式:
    - JSON形式（初期実装）。
    - 必要に応じてテキスト形式やPDF形式でのエクスポートも検討。

---

### 4. その他の機能

#### 4.1. ロールのカスタマイズ
- **初期ロール**:
  - **肯定派**: 議論のテーマに対して肯定的な立場を取る。
  - **否定派**: 議論のテーマに対して否定的な立場を取る。
  - **中立派**: 肯定・否定のどちらにも偏らず、バランスの取れた意見を述べる。
  - **ユーザー**: 議論に参加し、メッセージを送信する。

- **追加ロール（多角的な議論を進めるための提案）**:
  1. **ファシリテーター**:
     - 議論を管理し、進行を円滑にする役割。
     - 必要に応じて議論を要約し、次の話題を提案。
  2. **批評家**:
     - 議論の内容を批判的に検討し、弱点や矛盾を指摘。
     - 建設的な改善案を提示する。
  3. **専門家**:
     - 特定の分野に精通した視点から議論を進める。
     - 例: 科学、倫理、経済、教育など。
  4. **クリエイティブプランナー**:
     - 創造的なアイデアや新しい視点を提供し、議論を活性化。
     - 例: 問題解決の新しいアプローチを提案。
  5. **データサポーター**:
     - 議論の内容をデータや事実に基づいて補強。
     - 客観的な視点を提供し、議論の信頼性を高める。
  6. **倫理観の擁護者**:
     - 議論の内容が倫理的に適切かを評価。
     - 社会的影響や人間的価値観を考慮した意見を述べる。
  7. **未来志向の提案者**:
     - 議論のテーマが将来に与える影響を予測。
     - 長期的な視点から意見を述べ、戦略的な提案を行う。
  8. **現場視点の代表者**:
     - 実務や現場の視点から議論を進める。
     - 例: 現場での課題や実行可能性を考慮した意見を述べる。
  9. **哲学的思考者**:
     - 議論のテーマを抽象的・哲学的に考察。
     - 根本的な問いや価値観を掘り下げる。

- **将来的な拡張**:
  - ユーザーが自由にロールをカスタマイズできる機能を追加。
  - 各ロールに独自のプロンプトを設定可能にする。

- **議題の設定**:
  - チャット履歴が0の状態では、画面上部に議題入力用のテキストエリアを表示。
  - ユーザーが議題を入力して送信すると、LLM同士の合議が開始される。

---

## 技術仕様

### 1. フロントエンド
- **使用技術**:
  - TypeScript
  - Next.js (App Router)
  - Tailwind CSS
- **設計方針**:
  - モダンながら最小限のライブラリに依存した軽量なアプリを構築。
  - UIライブラリの使用は可能だが、できるだけ自前実装を優先。
  - ミニマリズムを大切にしたシンプルなUIを目指す。
  - レスポンシブデザインに対応（Tailwind CSSを活用して実装中に対応）。

---

### 2. バックエンド
- **使用技術**:
  - Next.js (App Router)
  - TypeScript
- **設計方針**:
  - `lib`フォルダやAPIルートを活用して、シンプルかつ効率的な実装を行う。
  - LLMとの接続には、Vercel AIが提供する以下のライブラリを使用:
    - `ai`
    - `@ai-sdk`
  - Google Generative AI (Gemini)を初期モデルとして採用。

---

### 3. データベース
- **初期実装**:
  - データベースの選定は柔軟に対応。
  - PostgreSQLをDockerで用意することを検討。ただし、時間がかかりすぎる場合は他の選択肢（例: ローカルDBやメモリ上の一時保存）を採用。
- **将来的な拡張**:
  - 永続的なデータ保存を目指し、PostgreSQLやFirebaseへの移行を検討。

---

## ユーザーインターフェース

### 1. チャット画面
- **全体イメージ**:
  - Lineやその他のグループチャットアプリをイメージしたデザイン。
  - 各ロール（ユーザー含む）のメッセージは丸いアバターアイコンまたはロール名とともに、吹き出し形式で表示。
  - メッセージの種類を区別:
    - **ユーザー**: メッセージは右寄せ。
    - **LLMロール**: メッセージは左寄せ。
    - **メタLLM**: 左寄せだが、枠線や色を強調して目立つデザイン。

- **議論の進行オプション3「割込み形式」**:
  - ユーザーが任意のタイミングで議論に割り込むことが可能。
  - 割り込み時のメッセージは通常のチャット形式で表示される。

---

### 2. 入力フォーム
- **位置とデザイン**:
  - 画面下部に固定。
  - 入力時に最大5行まで入力可能なテキストエリアを提供。
  - テキストエリアの右側に送信ボタンを配置。
  - テキストエリアの左端にはメニューを設置。

- **メニュー機能**:
  - メニューを展開すると以下の機能が利用可能:
    1. **議論の終了**:
       - 現在の議論を終了し、メタLLMが全体を要約。
    2. **メタLLMへの質問モード**:
       - 現在の議論とは別に、メタLLMに質問を送信可能。
       - この質問と回答は議論のチャット履歴には保存されない。
    3. **議論の強制終了**:
       - 議論を即座に終了。メタLLMの要約は発生しない。
    4. **議論の再開**:
       - 強制終了後に議論を再開可能。同じUI位置で状態に応じてボタンが切り替わる。

---

### 3. 議題の設定
- **初期状態**:
  - チャット履歴が0の状態では、画面上部に議題入力用のテキストエリアを表示。
  - ユーザーが議題を入力して送信すると、LLM同士の合議が開始される。
  - この機能により、ユーザー主導ではなく、議題を与えられたLLM同士の議論が可能。

---

### 4. その他のUI要素
- **レスポンシブ対応**:
  - モバイル、タブレット、デスクトップに対応したデザイン。
  - Tailwind CSSを活用して効率的に実装。
- **ミニマリズムデザイン**:
  - カラフルな要素を避け、シンプルで直感的なUIを目指す。

---

## 開発スケジュール

### フェーズ1: 割込み形式のチャット機能の実装（2週間）
- **目標**:
  - 各ロールのLLMとユーザーが議論に参加できる基本的なチャット機能を実装。
  - 割込み形式の議論フローを実現。
- **タスク**:
  1. チャット画面のUIを完成させる（吹き出し形式、メッセージの区別など）。
  2. 割込み形式の議論フローを実装。
  3. 議論の強制終了・再開機能を実装。
  4. 議題の設定機能（初期状態での議題入力）を実装。

---

### フェーズ2: メタLLMの実装（2週間）
- **目標**:
  - メタLLMを導入し、議論の要約や質問モードを実現。
- **タスク**:
  1. メタLLMへの質問モードを実装。
  2. メタLLMによる議論の要約機能を追加。
  3. メニュー機能にメタLLM関連のオプションを統合。

---

### フェーズ3: 高度な機能の追加（2週間）
- **目標**:
  - 議論ログの保存機能を追加。
  - ロールのカスタマイズ機能を実装。
- **タスク**:
  1. 議論ログをJSON形式で保存する機能を実装。
  2. ロールのカスタマイズ機能を追加（初期ロールの選択やプロンプトの編集）。
  3. レスポンシブデザインを最適化。

---

### フェーズ4: テストと最適化（1週間）
- **目標**:
  - ユーザビリティテストを実施。
  - パフォーマンスの最適化。
- **タスク**:
  1. 各機能の動作確認とバグ修正。
  2. LLMのレスポンス速度やUIのパフォーマンスを最適化。
  3. 必要に応じて、議論ログのエクスポート機能（PDFやテキスト形式）を追加。

---

## 初期実装の計画（MVP: Minimum Viable Product）

### 必須機能
1. **チャット画面**:
   - 吹き出し形式のメッセージ表示。
   - ユーザーとLLMのメッセージを区別（右寄せ・左寄せ）。
2. **入力フォーム**:
   - テキストエリアと送信ボタン。
   - メニュー機能（議論終了、強制終了）。
3. **議論の進行**:
   - 割込み形式の議論フロー。
   - 議論の強制終了と再開機能。
4. **議題の設定**:
   - 初期状態での議題入力機能。

### 後回しにする機能
- メタLLMへの質問モード。
- メタLLMによる議論の要約機能。
- 議論ログの保存（初期実装では履歴の参照のみ）。
- ロールのカスタマイズ機能。
- 議論ログのエクスポート（JSON以外の形式）。
