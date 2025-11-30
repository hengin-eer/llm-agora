import { google } from "@ai-sdk/google";
import { generateText } from "ai";

// Allow responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
	try {
		const { messages, systemPrompt } = await req.json();

		console.log("=== API Request ===");
		console.log("System Prompt:", systemPrompt?.substring(0, 100));
		console.log("Messages count:", messages?.length);
		console.log("Messages:", JSON.stringify(messages, null, 2));

		// バリデーション
		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return Response.json({ error: "messagesが必要です" }, { status: 400 });
		}

		// generateTextを使用（ストリーミングではなく一括取得）
		const result = await generateText({
			model: google("gemini-2.0-flash-001"),
			system: systemPrompt || "あなたは議論に参加するAIアシスタントです。",
			messages: messages.map((msg: { role: string; content: string }) => ({
				role: msg.role as "user" | "assistant",
				content: msg.content,
			})),
		});

		console.log("=== API Response ===");
		console.log("Response text:", result.text?.substring(0, 200));

		return Response.json({
			success: true,
			content: result.text,
		});
	} catch (error) {
		console.error("API Error:", error);
		return Response.json({ error: String(error) }, { status: 500 });
	}
}
