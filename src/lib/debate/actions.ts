import type { Message } from "./types";

// API expects standard Vercel AI SDK format
type ChatMessage = {
	role: "user" | "assistant";
	content: string;
};

/**
 * Maps our internal domain roles to the simple user/assistant roles required by the LLM API.
 */
function mapMessagesToApi(messages: Message[]): ChatMessage[] {
	return messages.map((m) => ({
		role: m.role === "user" ? "user" : "assistant",
		content: m.content,
	}));
}

/**
 * Calls the /api/chat endpoint with the current conversation history and a system prompt.
 */
export async function callChatApi(
	messages: Message[],
	systemPrompt: string,
): Promise<string> {
	const apiMessages = mapMessagesToApi(messages);

	const response = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			messages: apiMessages,
			systemPrompt,
		}),
	});

	if (!response.ok) {
		const data = await response.json();
		throw new Error(data.error || "API request failed");
	}

	const data = await response.json();
	// generateText returns { text: ... } or similar structure depending on route.ts
	// Check route.ts response structure.
	return data.content || data.text;
}
