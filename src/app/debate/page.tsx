"use client";

import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { useCallback, useRef, useState } from "react";
import MessageComponent from "./Message";
import TextArea from "./Textarea";

function DebatePage() {
	const [isDebating, setIsDebating] = useState(false);
	const [turnNumber, setTurnNumber] = useState(0);
	const isDebatingRef = useRef(false);

	const { messages, input, handleInputChange, handleSubmit, setMessages } =
		useChat({
			onFinish: async (message) => {
				console.log(
					"onFinish called, messages.length:",
					messages.length,
					"isDebating:",
					isDebatingRef.current,
				);
				// ユーザーのメッセージに対する最初のAI応答が完了した後、議論を開始
				if (messages.length === 1 && !isDebatingRef.current) {
					console.log("Starting debate...");
					setIsDebating(true);
					isDebatingRef.current = true;
					const { startDebate } = await import(
						"@/lib/llm/continue-conversation"
					);
					const currentMessages = [...messages, message];
					startDebate({
						messages: currentMessages,
						onNewMessage: addMessage,
						initialTurnNumber: 1,
					});
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
