"use client";

import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { useCallback, useRef, useState } from "react";
import MessageComponent from "./Message";
import TextArea from "./Textarea";

function DebatePage() {
	const [isDebating, setIsDebating] = useState(false);
	const [turnNumber, setTurnNumber] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingTurn, setLoadingTurn] = useState(0);
	const isDebatingRef = useRef(false);

	const { messages, input, handleInputChange, handleSubmit, setMessages } =
		useChat({
			onFinish: async (message) => {
				console.log("=== onFinish called ===");
				console.log("messages.length:", messages.length);
				console.log("message:", message);
				console.log("isDebatingRef.current:", isDebatingRef.current);
				console.log("messages array:", messages);
				console.log("messages.length + 1 === 2:", messages.length + 1 === 2);
				console.log("!isDebatingRef.current:", !isDebatingRef.current);

				// ユーザーのメッセージに対する最初のAI応答が完了した後、議論を開始
				// メッセージが2個（ユーザー1個 + AI1個）になった時点で議論開始
				const totalMessages = messages.length + 1; // +1 は今回のmessageを含む
				const hasUserMessage = messages.some((msg) => msg.role === "user");

				console.log("totalMessages:", totalMessages);
				console.log("hasUserMessage:", hasUserMessage);

				if (totalMessages >= 2 && hasUserMessage && !isDebatingRef.current) {
					console.log("🚀 Starting automatic debate...");
					setIsDebating(true);
					isDebatingRef.current = true;
					try {
						const { startDebate } = await import(
							"@/lib/llm/continue-conversation"
						);
						const currentMessages = [...messages, message];
						console.log("📝 Current messages for debate:", currentMessages);
						startDebate({
							messages: currentMessages,
							onNewMessage: addMessage,
							initialTurnNumber: 1,
							isDebatingRef,
						});
						console.log("✅ startDebate called successfully");
					} catch (error) {
						console.error("❌ Error starting debate:", error);
					}
				} else {
					console.log("❌ Conditions not met for starting debate");
					console.log("- totalMessages >= 2:", totalMessages >= 2);
					console.log("- hasUserMessage:", hasUserMessage);
					console.log("- !isDebatingRef.current:", !isDebatingRef.current);
				}
			},
		});

	// メッセージを追加する関数
	const addMessage = useCallback(
		(newMessage: Message) => {
			setMessages((prevMessages) => [...prevMessages, newMessage]);
		},
		[setMessages],
	);

	// 議論制御関数
	const startDebate = useCallback(() => {
		setIsDebating(true);
	}, []);

	const stopDebate = useCallback(() => {
		setIsDebating(false);
	}, []);

	const resetDebate = useCallback(() => {
		setIsDebating(false);
		setTurnNumber(0);
		setMessages([]);
	}, [setMessages]);

	return (
		<div>
			<header className="px-5 py-4 flex items-center justify-center border-b">
				<p className="text-2xl">Debate Page</p>
			</header>
			<main className="p-4 mb-[120px]">
				<section className="flex flex-col gap-4">
					{messages.map((msg) => (
						<MessageComponent
							key={msg.id}
							id={msg.id}
							role={msg.role}
							createdAt={msg.createdAt}
							content={msg.content}
							parts={msg.parts}
						/>
					))}
					{isLoading && (
						<div>
							<div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
							<div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse mt-2" />
							<div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse mt-2" />
							<div className="flex items-center mt-2">
								<div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
								<div
									className="w-2 h-2 bg-slate-400 rounded-full animate-bounce ml-1"
									style={{ animationDelay: "0.1s" }}
								/>
								<div
									className="w-2 h-2 bg-slate-400 rounded-full animate-bounce ml-1"
									style={{ animationDelay: "0.2s" }}
								/>
								<span className="text-xs text-slate-500 ml-2">
									議論を生成中...
								</span>
							</div>
						</div>
					)}
				</section>
				<section className="fixed w-full bottom-0 left-0 bg-white px-4 py-5 border-t">
					<TextArea
						input={input}
						handleSubmit={handleSubmit}
						handleInputChange={handleInputChange}
						messages={messages}
						addMessage={addMessage}
						isDebating={isDebating}
						turnNumber={turnNumber}
						setTurnNumber={setTurnNumber}
						startDebate={startDebate}
						stopDebate={stopDebate}
						resetDebate={resetDebate}
					/>
				</section>
			</main>
		</div>
	);
}

export default DebatePage;
