"use client";

import { useState } from "react";

type Message = {
	id: string;
	role: "user" | "assistant";
	content: string;
	roleName?: string; // 表示用のロール名
};

// システムプロンプト定義
const SYSTEM_PROMPTS = {
	facilitator:
		"あなたは議論のファシリテーターです。与えられた議題について簡潔に論点を整理してください。",
	positive: `あなたは討論に参加するAIアシスタントです。
役割: 相手の意見を肯定しつつ、議論を深める建設的な参加者です。
相手の発言を簡潔に要約し、同意する理由を説明し、新しい視点を追加してください。`,
};

export default function Home() {
	const [topic, setTopic] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// APIを呼び出す共通関数
	const callAPI = async (
		messageHistory: { role: string; content: string }[],
		systemPrompt: string,
	): Promise<string> => {
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: messageHistory,
				systemPrompt,
			}),
		});

		const data = await response.json();
		console.log("API Response:", data);

		if (!response.ok) {
			throw new Error(data.error || "APIエラー");
		}

		return data.content;
	};

	// ステップ2: 2回連続でAPIを呼び出す
	const handleTwoRequests = async () => {
		if (!topic.trim()) {
			alert("議題を入力してください");
			return;
		}

		setIsLoading(true);
		setError(null);
		setMessages([]);

		try {
			// 1. ユーザーメッセージ
			const userMessage: Message = {
				id: `user-${Date.now()}`,
				role: "user",
				content: topic,
				roleName: "ユーザー",
			};
			setMessages([userMessage]);

			// 2. 1回目のAPI呼び出し（ファシリテーター）
			console.log("=== 1回目のリクエスト: ファシリテーター ===");
			const firstResponse = await callAPI(
				[{ role: "user", content: topic }],
				SYSTEM_PROMPTS.facilitator,
			);

			const firstAIMessage: Message = {
				id: `ai-1-${Date.now()}`,
				role: "assistant",
				content: firstResponse,
				roleName: "ファシリテーター",
			};
			setMessages((prev) => [...prev, firstAIMessage]);

			// 3. 2回目のAPI呼び出し（肯定派）- 会話履歴を含める
			console.log("=== 2回目のリクエスト: 肯定派 ===");
			const secondResponse = await callAPI(
				[
					{ role: "user", content: topic },
					{ role: "assistant", content: firstResponse },
				],
				SYSTEM_PROMPTS.positive,
			);

			const secondAIMessage: Message = {
				id: `ai-2-${Date.now()}`,
				role: "assistant",
				content: secondResponse,
				roleName: "肯定派",
			};
			setMessages((prev) => [...prev, secondAIMessage]);

			console.log("=== 2回のリクエスト完了 ===");
		} catch (err) {
			console.error("Error:", err);
			setError(String(err));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-2xl font-bold mb-6">
					ステップ2: 2回連続APIリクエストテスト
				</h1>

				{/* 入力エリア */}
				<div className="bg-white p-4 rounded-lg shadow mb-6">
					<textarea
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder="議題を入力..."
						className="w-full p-3 border rounded-lg resize-none"
						rows={2}
					/>
					<button
						type="button"
						onClick={handleTwoRequests}
						disabled={isLoading}
						className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
					>
						{isLoading
							? "送信中..."
							: "2回連続で送信（ファシリテーター → 肯定派）"}
					</button>
				</div>

				{/* エラー表示 */}
				{error && (
					<div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
						エラー: {error}
					</div>
				)}

				{/* メッセージ表示 */}
				<div className="bg-white p-4 rounded-lg shadow">
					<h2 className="font-bold mb-4">メッセージ ({messages.length}件)</h2>
					{messages.map((msg) => (
						<div
							key={msg.id}
							className={`p-3 mb-2 rounded-lg ${
								msg.role === "user" ? "bg-blue-100" : "bg-green-100"
							}`}
						>
							<div className="text-xs text-gray-500 mb-1">
								{msg.roleName || (msg.role === "user" ? "ユーザー" : "AI")}
							</div>
							<div className="whitespace-pre-wrap">{msg.content}</div>
						</div>
					))}
					{messages.length === 0 && (
						<p className="text-gray-500">メッセージがありません</p>
					)}
					{isLoading && (
						<div className="text-blue-500 animate-pulse">処理中...</div>
					)}
				</div>
			</div>
		</div>
	);
}
