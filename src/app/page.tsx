"use client";

import { useRef, useState } from "react";

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

// 議論モード
type DebateMode = "fixed" | "loop" | "consensus";

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
	consensus: `あなたは討論に参加するAIアシスタントです。
これまでの議論を踏まえて、合意点と残る対立点を整理してください。
もし十分な合意が得られたと判断した場合は、応答の最後に「[合意達成]」と記載してください。
まだ議論が必要な場合は、次に議論すべきポイントを提示してください。`,
};

// ロール定義
const DEBATE_ROLES = {
	facilitator: {
		key: "facilitator",
		name: "ファシリテーター",
		prompt: SYSTEM_PROMPTS.facilitator,
	},
	positive: {
		key: "positive",
		name: "肯定派",
		prompt: SYSTEM_PROMPTS.positive,
	},
	negative: {
		key: "negative",
		name: "否定派",
		prompt: SYSTEM_PROMPTS.negative,
	},
	consensus: {
		key: "consensus",
		name: "合意確認",
		prompt: SYSTEM_PROMPTS.consensus,
	},
} as const;

/**
 * 最低待機時間を保証するsleep関数
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * APIを呼び出す関数（最低待機時間付き）
 */
async function callAPIWithMinInterval(
	messageHistory: ChatMessage[],
	systemPrompt: string,
	minIntervalMs = 0,
): Promise<string> {
	const startTime = Date.now();

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

	const elapsedTime = Date.now() - startTime;
	const remainingTime = minIntervalMs - elapsedTime;

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
	const [minInterval, setMinInterval] = useState(5);

	// モード関連
	const [debateMode, setDebateMode] = useState<DebateMode>("fixed");
	const [turnCount, setTurnCount] = useState(3); // 回数指定モード用
	const [loopCount, setLoopCount] = useState(2); // ループモード用（肯定→否定のセット回数）

	// 停止制御用
	const stopRef = useRef(false);

	/**
	 * メッセージを追加するヘルパー関数
	 */
	const addMessage = (
		chatHistory: ChatMessage[],
		content: string,
		roleName: string,
		roleKey: string,
	) => {
		const aiMessage: Message = {
			id: `ai-${roleKey}-${Date.now()}-${Math.random()}`,
			role: "assistant",
			content,
			roleName,
		};
		setMessages((prev) => [...prev, aiMessage]);
		chatHistory.push({ role: "assistant", content });
	};

	/**
	 * モード1: 回数指定モード
	 * - 指定した回数だけロールを順番に実行
	 */
	const runFixedMode = async (
		chatHistory: ChatMessage[],
		intervalMs: number,
	) => {
		const roles = [
			DEBATE_ROLES.facilitator,
			DEBATE_ROLES.positive,
			DEBATE_ROLES.negative,
		];

		for (let i = 0; i < turnCount; i++) {
			if (stopRef.current) break;

			const role = roles[i % roles.length];
			setCurrentRole(`${role.name} (${i + 1}/${turnCount})`);
			console.log(
				`=== ${role.name} のリクエスト開始 (${i + 1}/${turnCount}) ===`,
			);

			const response = await callAPIWithMinInterval(
				chatHistory,
				role.prompt,
				intervalMs,
			);

			if (stopRef.current) break;
			addMessage(chatHistory, response, `${role.name} [T${i + 1}]`, role.key);
		}
	};

	/**
	 * モード2: ループモード
	 * - 肯定派 → 否定派 を指定回数繰り返す
	 */
	const runLoopMode = async (
		chatHistory: ChatMessage[],
		intervalMs: number,
	) => {
		// 最初にファシリテーター
		if (!stopRef.current) {
			setCurrentRole("ファシリテーター (開始)");
			const facilitatorResponse = await callAPIWithMinInterval(
				chatHistory,
				DEBATE_ROLES.facilitator.prompt,
				intervalMs,
			);
			if (!stopRef.current) {
				addMessage(
					chatHistory,
					facilitatorResponse,
					"ファシリテーター",
					"facilitator",
				);
			}
		}

		// 肯定派 → 否定派 をループ
		for (let i = 0; i < loopCount; i++) {
			if (stopRef.current) break;

			// 肯定派
			setCurrentRole(`肯定派 (ラウンド ${i + 1}/${loopCount})`);
			const positiveResponse = await callAPIWithMinInterval(
				chatHistory,
				DEBATE_ROLES.positive.prompt,
				intervalMs,
			);
			if (stopRef.current) break;
			addMessage(
				chatHistory,
				positiveResponse,
				`肯定派 [R${i + 1}]`,
				"positive",
			);

			// 否定派
			setCurrentRole(`否定派 (ラウンド ${i + 1}/${loopCount})`);
			const negativeResponse = await callAPIWithMinInterval(
				chatHistory,
				DEBATE_ROLES.negative.prompt,
				intervalMs,
			);
			if (stopRef.current) break;
			addMessage(
				chatHistory,
				negativeResponse,
				`否定派 [R${i + 1}]`,
				"negative",
			);
		}
	};

	/**
	 * モード3: 合意達成モード
	 * - 肯定派 → 否定派 → 合意確認 を繰り返す
	 * - 合意確認が「[合意達成]」を含むまで継続（最大10ラウンド）
	 */
	const runConsensusMode = async (
		chatHistory: ChatMessage[],
		intervalMs: number,
	) => {
		const maxRounds = 10;

		// 最初にファシリテーター
		if (!stopRef.current) {
			setCurrentRole("ファシリテーター (開始)");
			const facilitatorResponse = await callAPIWithMinInterval(
				chatHistory,
				DEBATE_ROLES.facilitator.prompt,
				intervalMs,
			);
			if (!stopRef.current) {
				addMessage(
					chatHistory,
					facilitatorResponse,
					"ファシリテーター",
					"facilitator",
				);
			}
		}

		for (let round = 1; round <= maxRounds; round++) {
			if (stopRef.current) break;

			// 肯定派
			setCurrentRole(`肯定派 (ラウンド ${round})`);
			const positiveResponse = await callAPIWithMinInterval(
				chatHistory,
				DEBATE_ROLES.positive.prompt,
				intervalMs,
			);
			if (stopRef.current) break;
			addMessage(
				chatHistory,
				positiveResponse,
				`肯定派 [R${round}]`,
				"positive",
			);

			// 否定派
			setCurrentRole(`否定派 (ラウンド ${round})`);
			const negativeResponse = await callAPIWithMinInterval(
				chatHistory,
				DEBATE_ROLES.negative.prompt,
				intervalMs,
			);
			if (stopRef.current) break;
			addMessage(
				chatHistory,
				negativeResponse,
				`否定派 [R${round}]`,
				"negative",
			);

			// 合意確認
			setCurrentRole(`合意確認 (ラウンド ${round})`);
			const consensusResponse = await callAPIWithMinInterval(
				chatHistory,
				DEBATE_ROLES.consensus.prompt,
				intervalMs,
			);
			if (stopRef.current) break;
			addMessage(
				chatHistory,
				consensusResponse,
				`合意確認 [R${round}]`,
				"consensus",
			);

			// 合意達成チェック
			if (consensusResponse.includes("[合意達成]")) {
				console.log("🎉 合意に達しました！");
				break;
			}

			if (round === maxRounds) {
				console.log("⚠️ 最大ラウンド数に達しました");
			}
		}
	};

	/**
	 * 議論を開始
	 */
	const handleStartDebate = async () => {
		if (!topic.trim()) {
			alert("議題を入力してください");
			return;
		}

		setIsLoading(true);
		setError(null);
		setMessages([]);
		stopRef.current = false;

		const chatHistory: ChatMessage[] = [];

		try {
			// ユーザーメッセージを追加
			const userMessage: Message = {
				id: `user-${Date.now()}`,
				role: "user",
				content: topic,
				roleName: "ユーザー",
			};
			setMessages([userMessage]);
			chatHistory.push({ role: "user", content: topic });

			const intervalMs = minInterval * 1000;

			// モードに応じて実行
			switch (debateMode) {
				case "fixed":
					await runFixedMode(chatHistory, intervalMs);
					break;
				case "loop":
					await runLoopMode(chatHistory, intervalMs);
					break;
				case "consensus":
					await runConsensusMode(chatHistory, intervalMs);
					break;
			}

			console.log("=== 議論完了 ===");
		} catch (err) {
			console.error("Error:", err);
			setError(String(err));
		} finally {
			setIsLoading(false);
			setCurrentRole("");
		}
	};

	/**
	 * 議論を停止
	 */
	const handleStopDebate = () => {
		stopRef.current = true;
		setCurrentRole("停止中...");
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-2xl font-bold mb-6">LLM Agora - 議論システム</h1>

				{/* 入力エリア */}
				<div className="bg-white p-4 rounded-lg shadow mb-6">
					<textarea
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder="議題を入力..."
						className="w-full p-3 border rounded-lg resize-none"
						rows={2}
						disabled={isLoading}
					/>

					{/* モード選択 */}
					<div className="mt-4 p-3 bg-gray-50 rounded-lg">
						<p className="text-sm font-medium text-gray-700 mb-2">
							議論モード:
						</p>
						<div className="space-y-2">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="debateMode"
									value="fixed"
									checked={debateMode === "fixed"}
									onChange={(e) => setDebateMode(e.target.value as DebateMode)}
									disabled={isLoading}
								/>
								<span className="text-sm">回数指定</span>
								{debateMode === "fixed" && (
									<input
										type="number"
										min={1}
										max={20}
										value={turnCount}
										onChange={(e) => setTurnCount(Number(e.target.value))}
										className="w-16 p-1 border rounded text-sm"
										disabled={isLoading}
									/>
								)}
								{debateMode === "fixed" && (
									<span className="text-xs text-gray-500">ターン</span>
								)}
							</label>

							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="debateMode"
									value="loop"
									checked={debateMode === "loop"}
									onChange={(e) => setDebateMode(e.target.value as DebateMode)}
									disabled={isLoading}
								/>
								<span className="text-sm">ループ（肯定↔否定）</span>
								{debateMode === "loop" && (
									<input
										type="number"
										min={1}
										max={100}
										value={loopCount}
										onChange={(e) => setLoopCount(Number(e.target.value))}
										className="w-16 p-1 border rounded text-sm"
										disabled={isLoading}
									/>
								)}
								{debateMode === "loop" && (
									<span className="text-xs text-gray-500">ラウンド</span>
								)}
							</label>

							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="debateMode"
									value="consensus"
									checked={debateMode === "consensus"}
									onChange={(e) => setDebateMode(e.target.value as DebateMode)}
									disabled={isLoading}
								/>
								<span className="text-sm">合意達成まで（最大10ラウンド）</span>
							</label>
						</div>
					</div>

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
							disabled={isLoading}
						/>
						<span className="text-sm text-gray-600">秒</span>
					</div>

					{/* ボタン */}
					<div className="mt-3 flex gap-2">
						<button
							type="button"
							onClick={handleStartDebate}
							disabled={isLoading}
							className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
						>
							{isLoading ? `処理中... (${currentRole})` : "議論開始"}
						</button>
						{isLoading && (
							<button
								type="button"
								onClick={handleStopDebate}
								className="bg-red-500 text-white px-4 py-2 rounded-lg"
							>
								停止
							</button>
						)}
					</div>
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
