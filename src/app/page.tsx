"use client";

import MessageComponent from "@/components/Message";
import type { Message } from "ai";
import { useCallback, useRef, useState } from "react";

export default function Home() {
	const [isDebating, setIsDebating] = useState(false);
	const [topic, setTopic] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const isDebatingRef = useRef(false);

	// メッセージを追加する関数
	const addMessage = useCallback((newMessage: Message) => {
		setMessages((prevMessages) => [...prevMessages, newMessage]);
	}, []);

	// 議論を開始する関数
	const handleStartDebate = useCallback(async () => {
		if (!topic.trim()) {
			alert("議題を入力してください");
			return;
		}

		console.log("🚀 handleStartDebate called with topic:", topic);
		setIsDebating(true);
		setIsLoading(true);
		isDebatingRef.current = true;

		// ユーザーメッセージを作成
		const userMessage: Message = {
			id: `msg-${Date.now()}-${Math.random()}`,
			role: "user",
			content: topic,
			createdAt: new Date(),
		};

		console.log("📝 Created user message:", userMessage);
		setMessages([userMessage]);
		console.log("✅ Added user message to state");

		// 最初のAI応答を取得
		try {
			console.log("🔄 Calling API...");
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: [userMessage],
					nextSystem:
						"[ROOT_PAGE] あなたは議論のファシリテーターです。与えられた議題について、まず簡潔に論点を整理し、議論の方向性を示してください。",
				}),
			});

			if (!response.ok) {
				throw new Error(`APIリクエストが失敗しました: ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("レスポンスボディが取得できませんでした");
			}

			let assistantMessage = "";
			const decoder = new TextDecoder();

			console.log("📖 Reading response stream...");
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				console.log("📦 Raw chunk:", chunk);
				const lines = chunk.split("\n");
				console.log("📄 Split lines:", lines);

				for (const line of lines) {
					console.log("🔍 Processing line:", line);
					if (line.startsWith("0:")) {
						try {
							// "0:" の後の部分を取得してJSONとしてパース
							const jsonStr = line.slice(2);
							console.log("🔧 JSON string:", jsonStr);
							// JSONをパースしてテキストを直接取得
							const text = JSON.parse(jsonStr);
							console.log("📊 Parsed text:", text);
							if (typeof text === "string" && text.trim()) {
								assistantMessage += text;
								console.log("✅ Added text:", text);
							}
						} catch (e) {
							console.log("❌ JSON parse error:", e);
						}
					}
				}
			}

			console.log("📄 Complete assistant message:", assistantMessage);
			setIsLoading(false);

			// AIメッセージを作成
			const aiMessage: Message = {
				id: `msg-${Date.now()}-${Math.random()}`,
				role: "assistant",
				content: assistantMessage.trim(),
				createdAt: new Date(),
			};

			console.log("🤖 Created AI message:", aiMessage);
			// メッセージを追加し、議論を開始
			setMessages((prev) => [...prev, aiMessage]);
			console.log("✅ Updated messages state with AI response");

			// 少し待ってから議論を開始
			setTimeout(async () => {
				console.log("🚀 Starting continuous debate...");
				const { continueConversation } = await import(
					"@/lib/llm/continue-conversation"
				);
				continueConversation({
					messages: [userMessage, aiMessage],
					onNewMessage: (newMessage: Message) => {
						console.log("📨 New message from debate:", newMessage);
						addMessage(newMessage);
					},
					turnNumber: 1,
					isDebating: true,
					maxTurns: 20,
					intervalMs: 8000,
					isDebatingRef,
				});
			}, 2000);
		} catch (error) {
			console.error("❌ エラー:", error);
			alert("議論の開始に失敗しました");
			setIsDebating(false);
			setIsLoading(false);
			isDebatingRef.current = false;
		}
	}, [topic, addMessage]);

	// 議論を停止する関数
	const handleStopDebate = useCallback(() => {
		setIsDebating(false);
		isDebatingRef.current = false;
	}, []);

	// 議論をリセットする函数
	const handleResetDebate = useCallback(() => {
		setIsDebating(false);
		isDebatingRef.current = false;
		setMessages([]);
		setTopic("");
	}, []);

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-4xl mx-auto px-4 py-6">
					<h1 className="text-3xl font-bold text-gray-900 text-center">
						LLM議論自走システム
					</h1>
					<p className="text-gray-600 text-center mt-2">
						議題を入力すると、AIエージェントが自動的に議論を展開します
					</p>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 py-8">
				{/* 議題入力エリア */}
				{!isDebating && messages.length === 0 && (
					<div className="bg-white rounded-lg shadow-md p-6 mb-6">
						<h2 className="text-xl font-semibold mb-4">
							議題を入力してください
						</h2>
						<div className="space-y-4">
							<textarea
								value={topic}
								onChange={(e) => setTopic(e.target.value)}
								placeholder="例: AIの発達は人類にとって良いことか悪いことか"
								className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								rows={3}
							/>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={handleStartDebate}
									disabled={!topic.trim() || isLoading}
									className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
								>
									{isLoading ? "準備中..." : "議論を開始"}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* コントロールパネル */}
				{(isDebating || messages.length > 0) && (
					<div className="bg-white rounded-lg shadow-md p-4 mb-6">
						<div className="flex items-center justify-between">
							<div>
								<span className="text-sm text-gray-600">現在の状態: </span>
								<span
									className={`font-medium ${
										isDebating ? "text-green-600" : "text-red-600"
									}`}
								>
									{isDebating ? "議論進行中" : "議論停止中"}
								</span>
							</div>
							<div className="flex gap-2">
								{isDebating ? (
									<button
										type="button"
										onClick={handleStopDebate}
										className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm transition-colors"
									>
										停止
									</button>
								) : (
									<button
										type="button"
										onClick={handleStartDebate}
										disabled={!topic.trim()}
										className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-1 rounded text-sm transition-colors"
									>
										再開
									</button>
								)}
								<button
									type="button"
									onClick={handleResetDebate}
									className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 rounded text-sm transition-colors"
								>
									リセット
								</button>
							</div>
						</div>
					</div>
				)}

				{/* 議論の表示エリア */}
				<div className="bg-white rounded-lg shadow-md">
					{/* デバッグ情報 */}
					<div className="p-2 bg-gray-100 text-xs">
						デバッグ: メッセージ数 = {messages.length}
					</div>
					{messages.length > 0 && (
						<div className="p-4">
							<h3 className="text-lg font-semibold mb-4">議論の流れ</h3>
							<div className="space-y-4">
								{messages.map((msg, index) => (
									<div key={msg.id}>
										<div className="text-xs text-gray-500 mb-1">
											メッセージ{index + 1}: {msg.role} -{" "}
											{msg.content.substring(0, 50)}...
										</div>
										<MessageComponent
											id={msg.id}
											role={msg.role}
											createdAt={msg.createdAt}
											content={msg.content}
											parts={msg.parts || []}
										/>
									</div>
								))}
								{isLoading && (
									<div className="flex items-center space-x-2 p-4">
										<div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
										<div
											className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
											style={{ animationDelay: "0.1s" }}
										/>
										<div
											className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
											style={{ animationDelay: "0.2s" }}
										/>
										<span className="text-sm text-gray-500 ml-2">
											議論を生成中...
										</span>
									</div>
								)}
							</div>
						</div>
					)}

					{messages.length === 0 && (
						<div className="p-8 text-center text-gray-500">
							議題を入力して議論を開始してください
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
