import { DEBATE_ROLES } from "../role-definitions";
import type { DebateModeDefinition } from "../types";

/**
 * CONSENSUS MODE
 * Facilitator -> (Positive -> Negative -> Consensus) * Max 10
 * Stops early if Consensus role says "[合意達成]"
 */
export function createConsensusMode(maxRounds = 10): DebateModeDefinition {
	// 1 Facilitator + maxRounds * (Positive + Negative + Consensus)
	const maxTurns = 1 + maxRounds * 3;

	return {
		name: "consensus",

		selectNextSpeaker: (context) => {
			// Check if previous message was from Consensus and reached agreement
			const lastMsg = context.messages[context.messages.length - 1];
			// Using role name check or just checking content if role is consensus
			if (
				lastMsg &&
				lastMsg.role === "consensus" &&
				lastMsg.content.includes("[合意達成]")
			) {
				return null;
			}

			const aiTurns = context.messages.filter((m) => m.role !== "user");
			const turnIndex = aiTurns.length;

			if (turnIndex >= maxTurns) {
				return null;
			}

			if (turnIndex === 0) {
				return "facilitator";
			}

			// Cycle: Positive -> Negative -> Consensus
			const loopIndex = (turnIndex - 1) % 3;
			if (loopIndex === 0) return "positive";
			if (loopIndex === 1) return "negative";
			return "consensus";
		},

		buildPrompt: (context, nextSpeaker) => {
			const roleDef = DEBATE_ROLES[nextSpeaker as keyof typeof DEBATE_ROLES];
			return roleDef ? roleDef.prompt : "";
		},
	};
}
