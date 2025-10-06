import { getSystemPrompt } from "@/lib/llm/prompt-pool";
import type { Message } from "ai";

// ターン数からロール名を取得する関数
function getRoleName(turnNumber: number): string {
	if (turnNumber % 3 === 1) return "肯定派";
	if (turnNumber % 3 === 2) return "否定派";
	return "展開派";
}

/**
 * useChat()の返り値であるmessagesの最後のメッセージはAIの応答である
 * この応答を入力として会話を続ける関数
 *
 * 【方針】
 * - `api/chat/route.ts`にPOSTリクエストを送信する
 * - `debate/Textarea.tsx`のhandleOnSubmit()を起点にLLMへ再帰的にメッセージを送信して議論を進める
 */

type ContinueConversationOptions = {
	messages: Message[];
	onNewMessage: (message: Message) => void;
	turnNumber: number;
	isDebating: boolean;
	maxTurns?: number;
	intervalMs?: number;
	isDebatingRef?: { current: boolean };
	onLoadingStart?: (turnNumber: number) => void;
	onLoadingEnd?: () => void;
};

export async function continueConversation({
	messages,
	onNewMessage,
	turnNumber,
	isDebating,
	maxTurns = 20, // デフォルト最大ターン数を20に削減（レートリミット対策）
	intervalMs = 8000, // デフォルト8秒間隔に増加（レートリミット対策）
	isDebatingRef,
	onLoadingStart,
	onLoadingEnd,
}: ContinueConversationOptions): Promise<void> {
	console.log(
		`continueConversation called: turn ${turnNumber}, isDebating: ${isDebating}, messages: ${messages.length}`,
	);

	// 議論が停止されている場合は処理を終了
	const currentIsDebating = isDebatingRef?.current ?? isDebating;
	if (!currentIsDebating) {
		console.log("議論が停止されています。処理を終了します。");
		return;
	}

	// 最大ターン数に達した場合は処理を終了
	if (maxTurns && turnNumber >= maxTurns) {
		console.log("最大ターン数に達しました。議論を終了します。");
		return;
	}

	try {
		// 次のターンのシステムプロンプトを取得
		const systemPrompt = getSystemPrompt(turnNumber);
		const roleName = getRoleName(turnNumber);
		console.log(`ターン ${turnNumber}: ${roleName} のプロンプトを使用`);

		// APIリクエストを送信
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages,
				nextSystem: systemPrompt,
			}),
		});

		if (!response.ok) {
			throw new Error(`APIリクエストが失敗しました: ${response.status}`);
		}

		// ストリーミングレスポンスを処理
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error("レスポンスボディが取得できませんでした");
		}

		let assistantMessage = "";
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (line.startsWith("0:")) {
					// ストリーミングデータの解析
					try {
						const jsonStr = line.slice(2);
						const text = JSON.parse(jsonStr);
						if (typeof text === "string" && text.trim()) {
							assistantMessage += text;
						}
					} catch (e) {
						// JSON解析エラーは無視
					}
				}
			}
		}

		// 新しいメッセージを作成
		const newMessage: Message = {
			id: `msg-${Date.now()}-${Math.random()}`,
			role: "assistant",
			content: assistantMessage.trim(),
			createdAt: new Date(),
		};

		// メッセージを追加
		onNewMessage(newMessage);

		// インターバルを挟んで次の議論を継続
		setTimeout(() => {
			const updatedMessages = [...messages, newMessage];
			continueConversation({
				messages: updatedMessages,
				onNewMessage,
				turnNumber: turnNumber + 1,
				isDebating,
				maxTurns,
				intervalMs,
				isDebatingRef,
				onLoadingStart,
				onLoadingEnd,
			});
		}, intervalMs);
	} catch (error) {
		console.error("議論の継続中にエラーが発生しました:", error);
		// エラーが発生した場合も少し待ってからリトライ
		setTimeout(() => {
			continueConversation({
				messages,
				onNewMessage,
				turnNumber,
				isDebating,
				maxTurns,
				intervalMs,
				isDebatingRef,
				onLoadingStart,
				onLoadingEnd,
			});
		}, intervalMs * 2); // エラー時は少し長めに待つ
	}
}

/**
 * 議論を開始する関数
 */
export function startDebate({
	messages,
	onNewMessage,
	initialTurnNumber = 1,
	maxTurns = 30,
	intervalMs = 5000,
	isDebatingRef,
}: {
	messages: Message[];
	onNewMessage: (message: Message) => void;
	initialTurnNumber?: number;
	maxTurns?: number;
	intervalMs?: number;
	isDebatingRef?: { current: boolean };
}) {
	console.log(
		`startDebate called with ${messages.length} messages, starting turn ${initialTurnNumber}`,
	);
	// 少し待ってから議論を開始（ユーザーメッセージが確実に追加されるのを待つ）
	setTimeout(() => {
		console.log("Starting continuous debate...");
		continueConversation({
			messages,
			onNewMessage,
			turnNumber: initialTurnNumber,
			isDebating: isDebatingRef?.current ?? true,
			maxTurns,
			intervalMs,
			isDebatingRef,
		});
	}, 1000);
}
