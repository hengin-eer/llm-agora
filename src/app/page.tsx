"use client";

import { MarkdownPreview } from "@/components/MarkdownPreview";
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
type DebateMode = "fixed" | "loop" | "consensus" | "multifaceted";

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
	critical: `あなたは討論に参加するAIアシスタントです。
役割: 批判的思考者 (Critical Thinker)。
提示された意見の前提条件を疑い、論理的な飛躍やバイアスがないか厳しくチェックしてください。
「なぜそう言えるのか？」「隠れた前提は何か？」を問いかけ、議論の足場を固めてください。`,
	creative: `あなたは討論に参加するAIアシスタントです。
役割: 創造的思考者 (Creative Thinker)。
既存の枠組みにとらわれない代替案や、全く新しい視点を提示してください。
「もし全く別の方法があるとしたら？」「逆の視点から見ると？」といった問いかけで議論を広げてください。`,
	mediator: `あなたは討論に参加するAIアシスタントです。
役割: 調停者 (Mediator)。
対立する意見の共通点を見出し、建設的な妥協点や統合案を探ってください。
AとBの意見をどのように両立させるか、あるいはより高い次元で統合できるかを提案してください。`,
};

// ロール定義
type RoleDefinition = {
	key: string;
	name: string;
	prompt: string;
};

const DEBATE_ROLES: Record<string, RoleDefinition> = {
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
	critical: {
		key: "critical",
		name: "批判的思考者",
		prompt: SYSTEM_PROMPTS.critical,
	},
	creative: {
		key: "creative",
		name: "創造的思考者",
		prompt: SYSTEM_PROMPTS.creative,
	},
	mediator: {
		key: "mediator",
		name: "調停者",
		prompt: SYSTEM_PROMPTS.mediator,
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
	const [selectedRoles, setSelectedRoles] = useState<RoleDefinition[]>([
		DEBATE_ROLES.positive,
		DEBATE_ROLES.negative,
		DEBATE_ROLES.critical,
	]);

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
		fullHistory: Message[], // 追加: 保存用の完全な履歴配列
	) => {
		const aiMessage: Message = {
			id: `ai-${roleKey}-${Date.now()}-${Math.random()}`,
			role: "assistant",
			content,
			roleName,
		};
		setMessages((prev) => [...prev, aiMessage]);
		chatHistory.push({ role: "assistant", content });
		fullHistory.push(aiMessage); // 追加
	};

	/**
	 * モード1: 回数指定モード
	 * - 指定した回数だけロールを順番に実行
	 */
	const runFixedMode = async (
		chatHistory: ChatMessage[],
		fullHistory: Message[],
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
			addMessage(
				chatHistory,
				response,
				`${role.name} [T${i + 1}]`,
				role.key,
				fullHistory,
			);
		}
	};

	/**
	 * モード2: ループモード
	 * - 肯定派 → 否定派 を指定回数繰り返す
	 */
	const runLoopMode = async (
		chatHistory: ChatMessage[],
		fullHistory: Message[],
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
					fullHistory,
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
				fullHistory,
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
				fullHistory,
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
		fullHistory: Message[],
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
					fullHistory,
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
				fullHistory,
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
				fullHistory,
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
				fullHistory,
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
	 * モード4: 多面的議論モード
	 * - 選択されたロールを順番に実行する
	 */
	const runMultifacetedMode = async (
		chatHistory: ChatMessage[],
		fullHistory: Message[],
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
					fullHistory,
				);
			}
		}

		// 指定回数ループ
		for (let i = 0; i < loopCount; i++) {
			if (stopRef.current) break;

			for (const role of selectedRoles) {
				if (stopRef.current) break;

				setCurrentRole(`${role.name} (ラウンド ${i + 1}/${loopCount})`);
				const response = await callAPIWithMinInterval(
					chatHistory,
					role.prompt,
					intervalMs,
				);

				if (stopRef.current) break;
				addMessage(
					chatHistory,
					response,
					`${role.name} [R${i + 1}]`,
					role.key,
					fullHistory,
				);
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
		const fullHistory: Message[] = []; // 保存用

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
			fullHistory.push(userMessage);

			const intervalMs = minInterval * 1000;

			// モードに応じて実行
			switch (debateMode) {
				case "fixed":
					await runFixedMode(chatHistory, fullHistory, intervalMs);
					break;
				case "loop":
					await runLoopMode(chatHistory, fullHistory, intervalMs);
					break;
				case "consensus":
					await runConsensusMode(chatHistory, fullHistory, intervalMs);
					break;
				case "multifaceted":
					await runMultifacetedMode(chatHistory, fullHistory, intervalMs);
					break;
			}

			console.log("=== 議論完了 ===");

			// 議論終了時にログを保存
			if (!stopRef.current) {
				try {
					setCurrentRole("ログ保存中...");

					// 1. Slug生成
					const slugRes = await fetch("/api/slug", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ topic }),
					});
					const { slug } = await slugRes.json();

					// 2. ログ保存
					const logData = {
						topic,
						startTime: new Date().toISOString(), // 簡易的に現在時刻（本来は開始時刻を保持すべき）
						mode: debateMode,
						settings: {
							turnCount: debateMode === "fixed" ? turnCount : undefined,
							loopCount: debateMode !== "fixed" ? loopCount : undefined,
							selectedRoles:
								debateMode === "multifaceted"
									? selectedRoles.map((r) => r.key)
									: undefined,
							minInterval,
						},
						messages: fullHistory,
					};

					const saveRes = await fetch("/api/council-logs", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ ...logData, slug }),
					});

					if (saveRes.ok) {
						console.log("✅ ログ保存完了");
					} else {
						alert("ログ保存失敗");
					}
				} catch (saveErr) {
					alert(`ログ保存エラー: ${saveErr}`);
				}
			}
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

							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="debateMode"
									value="multifaceted"
									checked={debateMode === "multifaceted"}
									onChange={(e) => setDebateMode(e.target.value as DebateMode)}
									disabled={isLoading}
								/>
								<span className="text-sm">多面的議論（カスタムロール）</span>
								{debateMode === "multifaceted" && (
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
								{debateMode === "multifaceted" && (
									<span className="text-xs text-gray-500">ラウンド</span>
								)}
							</label>
						</div>
					</div>

					{/* ロール選択 (多面的議論モード用) */}
					{debateMode === "multifaceted" && (
						<div className="mt-4 p-3 bg-blue-50 rounded-lg">
							<p className="text-sm font-medium text-blue-800 mb-2">
								参加ロール選択:
							</p>
							<div className="flex flex-wrap gap-2">
								{Object.values(DEBATE_ROLES)
									.filter((r) => r.key !== "facilitator") // ファシリテーターは自動
									.map((role) => (
										<button
											type="button"
											key={role.key}
											onClick={() => {
												if (selectedRoles.find((r) => r.key === role.key)) {
													setSelectedRoles(
														selectedRoles.filter((r) => r.key !== role.key),
													);
												} else {
													setSelectedRoles([...selectedRoles, role]);
												}
											}}
											className={`px-3 py-1 rounded-full text-xs border ${
												selectedRoles.find((r) => r.key === role.key)
													? "bg-blue-600 text-white border-blue-600"
													: "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
											}`}
											disabled={isLoading}
										>
											{role.name}
										</button>
									))}
							</div>
							<p className="text-xs text-blue-600 mt-2">
								選択順: {selectedRoles.map((r) => r.name).join(" → ")}
							</p>
						</div>
					)}

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
							{msg.role === "user" ? (
								<div className="whitespace-pre-wrap">{msg.content}</div>
							) : (
								<MarkdownPreview content={msg.content} />
							)}
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
