import { DEBATE_ROLES } from "../role-definitions";
import type { DebateModeDefinition, Role } from "../types";

/**
 * MULTIFACETED MODE
 * Facilitator -> (Role A -> Role B -> ... defined by user) * loops
 */
export function createMultifacetedMode(
	selectedRoles: Exclude<Role, "user">[],
	loops = 2,
): DebateModeDefinition {
	if (selectedRoles.length === 0) {
		throw new Error("At least one role must be selected for Multifaceted Mode");
	}

	const maxTurns = 1 + loops * selectedRoles.length;

	return {
		name: "multifaceted",

		selectNextSpeaker: (context) => {
			const aiTurns = context.messages.filter((m) => m.role !== "user");
			const turnIndex = aiTurns.length;

			if (turnIndex >= maxTurns) {
				return null;
			}

			if (turnIndex === 0) {
				return "facilitator";
			}

			// (turnIndex - 1) % roles.length
			const roleIndex = (turnIndex - 1) % selectedRoles.length;
			return selectedRoles[roleIndex];
		},

		buildPrompt: (context, nextSpeaker) => {
			const roleDef = DEBATE_ROLES[nextSpeaker as keyof typeof DEBATE_ROLES];
			return roleDef ? roleDef.prompt : "";
		},
	};
}
