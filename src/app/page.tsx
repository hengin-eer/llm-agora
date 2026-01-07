"use client";

import MessageComponent from "@/components/Message";
import { PreviewOnlyNotice } from "@/components/PreviewOnlyNotice";
import { callChatApi } from "@/lib/debate/actions";
import { createConsensusMode } from "@/lib/debate/modes/consensus";
import { createFixedMode } from "@/lib/debate/modes/fixed";
import { createLoopMode } from "@/lib/debate/modes/loop";
import { createMultifacetedMode } from "@/lib/debate/modes/multifaceted";
import {
	DEBATE_ROLES,
	type RoleDefinition,
} from "@/lib/debate/role-definitions";
import { runDebate } from "@/lib/debate/runner";
import type {
	DebateContext,
	DebateModeDefinition,
	Message,
	Role,
} from "@/lib/debate/types";
import { useRef, useState } from "react";

// 本番環境かどうかを判定
const isProduction = process.env.NEXT_PUBLIC_PREVIEW_ONLY === "true";

type DebateMode = "fixed" | "loop" | "consensus" | "multifaceted";

// 最低待機時間を保証するsleep関数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
	// 本番環境ではプレビュー専用UIを表示
	if (isProduction) {
		return <PreviewOnlyNotice />;
	}

	return <DebatePage />;
}

function DebatePage() {
	const [topic, setTopic] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentStatus, setCurrentStatus] = useState<string>("");
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
		setCurrentStatus("準備中...");
		stopRef.current = false;

		try {
			// 初期コンテキストの作成
			const initialUserMessage: Message = {
				id: `user-${Date.now()}`,
				role: "user",
				roleName: "ユーザー",
				content: topic,
				timestamp: Date.now(),
			};

			// UIの初期化
			setMessages([initialUserMessage]);
			const runningMessages = [initialUserMessage]; // 実行中の履歴保持用

			const initialContext: DebateContext = {
				topic,
				messages: [initialUserMessage],
				currentRound: 0,
			};

			// モード定義の作成
			let modeDef: DebateModeDefinition;
			switch (debateMode) {
				case "fixed":
					modeDef = createFixedMode(
						["facilitator", "positive", "negative"],
						turnCount,
					);
					break;
				case "loop":
					modeDef = createLoopMode(loopCount);
					break;
				case "consensus":
					modeDef = createConsensusMode(10);
					break;
				case "multifaceted":
					modeDef = createMultifacetedMode(
						selectedRoles.map((r) => r.key) as Exclude<Role, "user">[],
						loopCount,
					);
					break;
				default:
					// 決して到達しないはずだが、デフォルトを設定
					modeDef = createFixedMode(
						["facilitator", "positive", "negative"],
						turnCount,
					);
			}

			// 議論ランナーの初期化
			const generator = runDebate(initialContext, modeDef, {
				generateResponse: async (prompt, context) => {
					if (stopRef.current) throw new Error("Stop requested");

					const startTime = Date.now();
					let result = "";
					try {
						// API呼び出し
						result = await callChatApi(context.messages, prompt);
					} catch (e) {
						console.error("API Call failed", e);
						throw e;
					}

					// 最低待機時間の確保
					const elapsed = Date.now() - startTime;
					const waitTime = minInterval * 1000 - elapsed;
					if (waitTime > 0 && !stopRef.current) {
						await sleep(waitTime);
					}

					if (stopRef.current) throw new Error("Stop requested");
					return result;
				},
			});

			// ランナーの実行ループ
			for await (const yieldData of generator) {
				if (stopRef.current) break;

				if (yieldData.type === "status") {
					setCurrentStatus(
						`${yieldData.role ? DEBATE_ROLES[yieldData.role as keyof typeof DEBATE_ROLES]?.name || yieldData.role : ""} が思考中...`,
					);
				} else if (yieldData.type === "message") {
					setMessages((prev) => [...prev, yieldData.message]);
					runningMessages.push(yieldData.message);
				} else if (yieldData.type === "finish") {
					console.log("Debate finished:", yieldData.reason);
				}
			}

			// 議論終了後の処理（ログ保存など）
			if (!stopRef.current) {
				await saveLogs(topic, debateMode, runningMessages);
			}
		} catch (err: unknown) {
			if (err instanceof Error && err.message === "Stop requested") {
				console.log("Debate stopped by user");
			} else {
				console.error("Error:", err);
				setError(String(err));
			}
		} finally {
			setIsLoading(false);
			setCurrentStatus("");
		}
	};

	/**
	 * ログ保存処理
	 */
	const saveLogs = async (
		topic: string,
		mode: DebateMode,
		messages: Message[],
	) => {
		try {
			setCurrentStatus("ログ保存中...");

			// Settings object for logs
			const settings = {
				turnCount: mode === "fixed" ? turnCount : undefined,
				loopCount: mode !== "fixed" ? loopCount : undefined,
				selectedRoles:
					mode === "multifaceted" ? selectedRoles.map((r) => r.key) : undefined,
				minInterval,
			};

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
				startTime: new Date().toISOString(),
				mode,
				settings,
				messages,
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
			console.error(saveErr);
			alert(`ログ保存エラー: ${saveErr}`);
		}
	};

	/**
	 * 議論を停止
	 */
	const handleStopDebate = () => {
		stopRef.current = true;
		setCurrentStatus("停止中...");
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-2xl mx-auto">
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
							{isLoading ? `処理中... (${currentStatus})` : "議論開始"}
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
						<MessageComponent
							key={msg.id}
							id={msg.id}
							role={msg.role}
							content={msg.content}
							roleName={msg.roleName}
							createdAt={msg.timestamp}
						/>
					))}
					{messages.length === 0 && (
						<p className="text-gray-500">メッセージがありません</p>
					)}
					{isLoading && (
						<div className="text-blue-500 animate-pulse">
							{currentStatus ? currentStatus : "処理中..."}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
