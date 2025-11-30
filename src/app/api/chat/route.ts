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

		// バリデーション
		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return Response.json({ error: "messagesが必要です" }, { status: 400 });
		}

		// メッセージを整形（roleの交互チェック）
		const formattedMessages = messages.map(
			(msg: { role: string; content: string }) => ({
				role: msg.role as "user" | "assistant",
				content: msg.content,
			}),
		);

		// 最後のメッセージがassistantの場合、userメッセージを追加
		// （Gemini APIは会話がuserで終わることを期待する場合がある）
		if (formattedMessages[formattedMessages.length - 1].role === "assistant") {
			formattedMessages.push({
				role: "user",
				content: "上記の議論を踏まえて、あなたの見解を述べてください。",
			});
		}

		console.log(
			"Formatted messages:",
			JSON.stringify(formattedMessages, null, 2),
		);

		// generateTextを使用
		const result = await generateText({
			model: google("gemini-2.0-flash-001", {
				// セーフティ設定を緩和
				safetySettings: [
					{
						category: "HARM_CATEGORY_HATE_SPEECH",
						threshold: "BLOCK_ONLY_HIGH",
					},
					{
						category: "HARM_CATEGORY_DANGEROUS_CONTENT",
						threshold: "BLOCK_ONLY_HIGH",
					},
					{
						category: "HARM_CATEGORY_HARASSMENT",
						threshold: "BLOCK_ONLY_HIGH",
					},
					{
						category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
						threshold: "BLOCK_ONLY_HIGH",
					},
				],
			}),
			system: systemPrompt || "あなたは議論に参加するAIアシスタントです。",
			messages: formattedMessages,
		});

		console.log("=== API Response ===");
		console.log("Response text:", result.text?.substring(0, 200));

		return Response.json({
			success: true,
			content: result.text,
		});
	} catch (error) {
		console.error("API Error:", error);

		// エラーの詳細を返す
		const errorMessage = error instanceof Error ? error.message : String(error);
		return Response.json(
			{
				error: errorMessage,
				details:
					"Gemini APIからのレスポンス取得に失敗しました。しばらく待ってから再試行してください。",
			},
			{ status: 500 },
		);
	}
}
