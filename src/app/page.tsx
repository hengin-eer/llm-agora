"use client";

import { useState } from "react";

type Message = {
	id: string;
	role: "user" | "assistant";
	content: string;
	roleName?: string; // 表示用のロール名
};

type ChatMessage = {
	role: "user" | "assistant";
	content: string;
};

// システムプロンプト定義
const SYSTEM_PROMPTS = {
	facilitator:
		"あなたは議論のファシリテーターです。与えられた議題について簡潔に論点を整理してください。",
	positive: `あなたは討論に参加するAIアシスタントです。
役割: 相手の意見を肯定しつつ、議論を深める建設的な参加者です。
相手の発言を簡潔に要約し、同意する理由を説明し、新しい視点を追加してください。`,
	negative: `あなたは討論に参加するAIアシスタントです。
役割: 相手の意見に対して批判的思考を示し、異なる立場から建設的に反論を行います。
相手の発言を要約し、問題点を指摘し、別の観点を示してください。`,
};

// ロール定義
const ROLES = [
	{
		key: "facilitator",
		name: "ファシリテーター",
		prompt: SYSTEM_PROMPTS.facilitator,
	},
	{ key: "positive", name: "肯定派", prompt: SYSTEM_PROMPTS.positive },
	{ key: "negative", name: "否定派", prompt: SYSTEM_PROMPTS.negative },
] as const;

/**
 * 最低待機時間を保証するsleep関数
 * @param ms 待機時間（ミリ秒）
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * APIを呼び出す関数（最低待機時間付き）
 * - 会話履歴を含めてリクエスト
 * - レスポンスが来るまで次のリクエストは行わない（この関数はawaitで呼ばれる前提）
 * - 最低待機時間を保証（レスポンスが早くても指定時間は待つ）
 */
async function callAPIWithMinInterval(
	messageHistory: ChatMessage[],
	systemPrompt: string,
	minIntervalMs = 0,
): Promise<string> {
	const startTime = Date.now();

	// APIリクエスト
	const response = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			messages: messageHistory,
			systemPrompt,
		}),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error || "APIエラー");
	}

	// 経過時間を計算
	const elapsedTime = Date.now() - startTime;
	const remainingTime = minIntervalMs - elapsedTime;

	// 最低待機時間に満たない場合は待機
	if (remainingTime > 0) {
		console.log(`⏳ 残り ${remainingTime}ms 待機中...`);
		await sleep(remainingTime);
	}

	console.log(`✅ API呼び出し完了 (実行時間: ${Date.now() - startTime}ms)`);
	return data.content;
}

export default function Home() {
	const [topic, setTopic] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentRole, setCurrentRole] = useState<string>("");
	const [minInterval, setMinInterval] = useState(5); // デフォルト5秒

	/**
	 * 連続議論を実行する関数
	 * - 各ロールを順番に実行
	 * - 会話履歴を蓄積しながらリクエスト
	 * - 最低待機時間を適用
	 */
	const handleContinuousDebate = async () => {
		if (!topic.trim()) {
			alert("議題を入力してください");
			return;
		}

		setIsLoading(true);
		setError(null);
		setMessages([]);

		// 会話履歴を管理
		const chatHistory: ChatMessage[] = [];

		try {
			// 1. ユーザーメッセージを追加
			const userMessage: Message = {
				id: `user-${Date.now()}`,
				role: "user",
				content: topic,
				roleName: "ユーザー",
			};
			setMessages([userMessage]);
			chatHistory.push({ role: "user", content: topic });

			// 2. 各ロールを順番に実行
			for (const role of ROLES) {
				setCurrentRole(role.name);
				console.log(`=== ${role.name} のリクエスト開始 ===`);
				console.log(`📜 会話履歴: ${chatHistory.length}件`);

				// APIを呼び出し（最低待機時間付き）
				const response = await callAPIWithMinInterval(
					chatHistory,
					role.prompt,
					minInterval * 1000, // 秒をミリ秒に変換
				);

				// 応答をメッセージに追加
				const aiMessage: Message = {
					id: `ai-${role.key}-${Date.now()}`,
					role: "assistant",
					content: response,
					roleName: role.name,
				};
				setMessages((prev) => [...prev, aiMessage]);

				// 会話履歴に追加（次のロールが参照できるように）
				chatHistory.push({ role: "assistant", content: response });

				console.log(`=== ${role.name} のリクエスト完了 ===`);
			}

			setCurrentRole("");
			console.log("=== すべてのリクエスト完了 ===");
		} catch (err) {
			console.error("Error:", err);
			setError(String(err));
		} finally {
			setIsLoading(false);
			setCurrentRole("");
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-2xl font-bold mb-6">
					ステップ3: 連続APIリクエスト（最低待機時間付き）
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

					{/* 最低待機時間設定 */}
					<div className="mt-3 flex items-center gap-2">
						<label htmlFor="interval" className="text-sm text-gray-600">
							最低待機時間:
						</label>
						<input
							id="interval"
							type="number"
							min={1}
							max={60}
							value={minInterval}
							onChange={(e) => setMinInterval(Number(e.target.value))}
							className="w-20 p-2 border rounded"
						/>
						<span className="text-sm text-gray-600">秒</span>
					</div>

					<button
						type="button"
						onClick={handleContinuousDebate}
						disabled={isLoading}
						className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
					>
						{isLoading
							? `処理中... (${currentRole})`
							: "議論開始（ファシリテーター → 肯定派 → 否定派）"}
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
						<div className="text-blue-500 animate-pulse">
							{currentRole ? `${currentRole} が応答中...` : "処理中..."}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
