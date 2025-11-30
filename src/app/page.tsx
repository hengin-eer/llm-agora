"use client";

import { useState } from "react";

type Message = {
	id: string;
	role: "user" | "assistant";
	content: string;
};

export default function Home() {
	const [topic, setTopic] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 1回だけAPIを呼び出すテスト関数
	const handleSingleRequest = async () => {
		if (!topic.trim()) {
			alert("議題を入力してください");
			return;
		}

		setIsLoading(true);
		setError(null);

		// ユーザーメッセージを作成
		const userMessage: Message = {
			id: `user-${Date.now()}`,
			role: "user",
			content: topic,
		};
		setMessages([userMessage]);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: topic }],
					systemPrompt:
						"あなたは議論のファシリテーターです。与えられた議題について簡潔に論点を整理してください。",
				}),
			});

			const data = await response.json();
			console.log("API Response:", data);

			if (!response.ok) {
				throw new Error(data.error || "APIエラー");
			}

			// AIメッセージを追加
			const aiMessage: Message = {
				id: `ai-${Date.now()}`,
				role: "assistant",
				content: data.content,
			};
			setMessages((prev) => [...prev, aiMessage]);
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
					ステップ1: 単一APIリクエストテスト
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
						onClick={handleSingleRequest}
						disabled={isLoading}
						className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
					>
						{isLoading ? "送信中..." : "1回だけ送信"}
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
								{msg.role === "user" ? "ユーザー" : "AI"}
							</div>
							<div className="whitespace-pre-wrap">{msg.content}</div>
						</div>
					))}
					{messages.length === 0 && (
						<p className="text-gray-500">メッセージがありません</p>
					)}
				</div>
			</div>
		</div>
	);
}
