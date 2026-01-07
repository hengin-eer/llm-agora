import { uuidv7 } from "uuidv7";
import { DEBATE_ROLES } from "./role-definitions";
import type { DebateContext, DebateModeDefinition, Message } from "./types";

// Yield types for the Generator
export type DebateYield =
	| { type: "status"; status: string; role?: string }
	| { type: "message"; message: Message }
	| { type: "finish"; reason: string };

/**
 * The Imperative Shell (Async Generator)
 * Orchestrates the debate flow by combining the pure Mode logic with side effects.
 */
export async function* runDebate(
	initialContext: DebateContext,
	mode: DebateModeDefinition,
	effects: {
		/**
		 * 非同期でレスポンスを生成する（API呼び出しなど）
		 */
		generateResponse: (
			prompt: string,
			context: DebateContext,
		) => Promise<string>;
	},
): AsyncGenerator<DebateYield, void, unknown> {
	// Initialize context with a shallow copy
	const context: DebateContext = {
		...initialContext,
		messages: [...initialContext.messages],
	};

	if (mode.init) {
		const newContext = mode.init(context);
		// Update context properties
		Object.assign(context, newContext);
	}

	while (true) {
		// 1. Next Speaker
		const nextSpeaker = mode.selectNextSpeaker(context);

		// If no next speaker, finish debate
		if (!nextSpeaker) {
			yield { type: "finish", reason: "Sequence completed" };
			break;
		}

		// 2. Build Prompt
		const prompt = mode.buildPrompt(context, nextSpeaker);

		// 3. Notify UI: Thinking (and who is thinking)
		yield { type: "status", status: "thinking", role: nextSpeaker };

		// 4. Side Effect: Call API
		const responseContent = await effects.generateResponse(prompt, context);

		// Resolve Role Name
		const roleDef =
			nextSpeaker !== "user"
				? DEBATE_ROLES[nextSpeaker as keyof typeof DEBATE_ROLES]
				: undefined;
		const roleName = roleDef ? roleDef.name : nextSpeaker;

		// 5. Create Message
		const newMessage: Message = {
			role: nextSpeaker,
			content: responseContent,
			id: uuidv7(),
			timestamp: Date.now(),
			roleName: roleName,
		};

		// 6. Yield Message
		yield { type: "message", message: newMessage };

		// 7. Update Context
		context.messages.push(newMessage);
		context.currentRound++;
	}
}
