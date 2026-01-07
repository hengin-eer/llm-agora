import { DEBATE_ROLES } from "../role-definitions";
import type { DebateModeDefinition } from "../types";

/**
 * LOOP MODE
 * Starts with Facilitator, then loops between Positive and Negative roles.
 */
export function createLoopMode(loops = 2): DebateModeDefinition {
	const maxTurns = 1 + loops * 2; // 1 Facilitator + loops * (Positive + Negative)

	return {
		name: "loop",

		selectNextSpeaker: (context) => {
			const aiTurns = context.messages.filter((m) => m.role !== "user");
			const turnIndex = aiTurns.length;

			// Stop condition
			if (turnIndex >= maxTurns) {
				return null;
			}

			// First turn is always Facilitator
			if (turnIndex === 0) {
				return "facilitator";
			}

			// Determine phase in the loop (offset by 1 due to Facilitator)
			// turnIndex 1 -> (0) -> Positive
			// turnIndex 2 -> (1) -> Negative
			const loopIndex = turnIndex - 1;
			return loopIndex % 2 === 0 ? "positive" : "negative";
		},

		buildPrompt: (context, nextSpeaker) => {
			const roleDef = DEBATE_ROLES[nextSpeaker as keyof typeof DEBATE_ROLES];
			return roleDef ? roleDef.prompt : "";
		},
	};
}
