import { SYSTEM_PROMPTS } from "@/lib/llm/prompts";

export function getSystemPrompt(turn: number) {
	if (turn % 3 === 1) {
		return SYSTEM_PROMPTS.positive;
	}
	if (turn % 3 === 2) {
		return SYSTEM_PROMPTS.negative;
	}
	return SYSTEM_PROMPTS.expansion;
}
