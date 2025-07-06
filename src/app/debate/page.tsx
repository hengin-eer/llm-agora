"use client";

import Message from "./Message";
import TextArea from "./Textarea";
import { useChat } from "@ai-sdk/react";

function DebatePage() {
	const { messages, input, handleInputChange, handleSubmit } = useChat();

	return (
		<div>
			<header className="px-5 py-4 flex items-center justify-center border-b">
				<p className="text-2xl">Debate Page</p>
			</header>
			<main className="p-4 mb-[120px]">
				<section className="flex flex-col gap-4">
					{messages.map((msg) => (
						<Message
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
					<TextArea input={input} handleSubmit={handleSubmit} handleInputChange={handleInputChange} />
				</section>
			</main>
		</div>
	);
}

export default DebatePage;
