import { DEBATE_ROLES } from "../role-definitions";
import type { DebateModeDefinition, Role } from "../types";

/**
 * FIXED MODE
 * Rotates through a fixed list of roles for a specified number of turns.
 */
export function createFixedMode(
	order: Exclude<Role, "user">[] = ["facilitator", "positive", "negative"],
	maxTurns = 3,
): DebateModeDefinition {
	return {
		name: "fixed",

		selectNextSpeaker: (context) => {
			// Filter out 'user' messages to count actual AI turns
			const aiTurns = context.messages.filter((m) => m.role !== "user");
			const turnCount = aiTurns.length;

			// Stop if we reached the total rounds (turns) limit
			if (turnCount >= maxTurns) {
				return null;
			}

			// Determine next role based on the order
			const nextRoleIndex = turnCount % order.length;
			return order[nextRoleIndex];
		},

		buildPrompt: (context, nextSpeaker) => {
			const roleDef = DEBATE_ROLES[nextSpeaker as keyof typeof DEBATE_ROLES];
			if (!roleDef) {
				throw new Error(`Role definition not found for: ${nextSpeaker}`);
			}
			return roleDef.prompt;
		},
	};
}
