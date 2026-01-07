export type Role =
	| "facilitator"
	| "positive"
	| "negative"
	| "consensus"
	| "critical"
	| "creative"
	| "mediator"
	| "user";

export interface Message {
	role: Role;
	content: string;
	id: string; // UUID v7
	timestamp: number;
	roleName?: string; // 表示用のロール名
}

export interface DebateContext {
	topic: string;
	messages: Message[];
	currentRound: number;
	// モード固有の状態や設定などを保持するための自由領域
	// 必要に応じて型を厳密に定義することも可能
	state?: Record<string, unknown>;
}

// 純粋関数としてのルール定義
export type RoleSelector = (context: DebateContext) => Role | null;
export type PromptBuilder = (
	context: DebateContext,
	nextSpeaker: Role,
) => string;

// すべての議論モードが満たすべきインターフェース
export interface DebateModeDefinition {
	name: string;
	init?: (context: DebateContext) => DebateContext;
	selectNextSpeaker: RoleSelector;
	buildPrompt: PromptBuilder;
}
