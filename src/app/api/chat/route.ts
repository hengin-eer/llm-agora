import { google } from "@ai-sdk/google";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
	const { messages, nextSystem } = await req.json();
	console.log("Received system prompt:", nextSystem);

	const result = streamText({
		model: google("gemini-2.0-flash-001"),
		messages,
		system: nextSystem,
	});

	return result.toDataStreamResponse();
}
