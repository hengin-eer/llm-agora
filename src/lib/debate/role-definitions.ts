import { SYSTEM_PROMPTS } from "../llm/prompts";
import type { Role } from "./types";

export type RoleDefinition = {
	key: Role;
	name: string;
	prompt: string;
};

const PROMPTS = {
	facilitator:
		"あなたは議論のファシリテーターです。与えられた議題について簡潔に論点を整理してください。",
	positive: SYSTEM_PROMPTS.positive,
	negative: SYSTEM_PROMPTS.negative,
	consensus: `あなたは討論に参加するAIアシスタントです。
これまでの議論を踏まえて、合意点と残る対立点を整理してください。
もし十分な合意が得られたと判断した場合は、応答の最後に「[合意達成]」と記載してください。
まだ議論が必要な場合は、次に議論すべきポイントを提示してください。`,
	critical: `あなたは討論に参加するAIアシスタントです。
役割: 批判的思考者 (Critical Thinker)。
提示された意見の前提条件を疑い、論理的な飛躍やバイアスがないか厳しくチェックしてください。
「なぜそう言えるのか？」「隠れた前提は何か？」を問いかけ、議論の足場を固めてください。`,
	creative: `あなたは討論に参加するAIアシスタントです。
役割: 創造的思考者 (Creative Thinker)。
既存の枠組みにとらわれない代替案や、全く新しい視点を提示してください。
「もし全く別の方法があるとしたら？」「逆の視点から見ると？」といった問いかけで議論を広げてください。`,
	mediator: `あなたは討論に参加するAIアシスタントです。
役割: 調停者 (Mediator)。
対立する意見の共通点を見出し、建設的な妥協点や統合案を探ってください。
AとBの意見をどのように両立させるか、あるいはより高い次元で統合できるかを提案してください。`,
};

export const DEBATE_ROLES: Record<Exclude<Role, "user">, RoleDefinition> = {
	facilitator: {
		key: "facilitator",
		name: "ファシリテーター",
		prompt: PROMPTS.facilitator,
	},
	positive: {
		key: "positive",
		name: "肯定派",
		prompt: PROMPTS.positive,
	},
	negative: {
		key: "negative",
		name: "否定派",
		prompt: PROMPTS.negative,
	},
	consensus: {
		key: "consensus",
		name: "合意確認",
		prompt: PROMPTS.consensus,
	},
	critical: {
		key: "critical",
		name: "批判的思考者",
		prompt: PROMPTS.critical,
	},
	creative: {
		key: "creative",
		name: "創造的思考者",
		prompt: PROMPTS.creative,
	},
	mediator: {
		key: "mediator",
		name: "調停者",
		prompt: PROMPTS.mediator,
	},
} as const;
