"use client";

import { getSystemPrompt } from "@/lib/llm/prompt-pool";
import type { ChatRequestOptions } from "ai";
import { type ChangeEvent, type FormEvent, useState } from "react";

type TextAreaProps = {
	input: string;
	handleSubmit: (
		event?: {
			preventDefault?: () => void;
		},
		chatRequestOptions?: ChatRequestOptions,
	) => void;
	handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
};

function TextArea({ input, handleSubmit, handleInputChange }: TextAreaProps) {
	const [turnNumber, setTurnNumber] = useState(0);
	const systemPrompt = getSystemPrompt(turnNumber);

	function incrementTurn() {
		setTurnNumber((prev) => prev + 1);
	}
	console.log("turnNumber", turnNumber);
	console.log("systemPrompt", systemPrompt);

	function handleOnSubmit(e: FormEvent<HTMLFormElement>) {
		incrementTurn();
		handleSubmit(e, {
			body: {
				nextSystem: systemPrompt,
			},
		});
	}

	return (
		<form
			onSubmit={(e) => handleOnSubmit(e)}
			className="box-border flex items-end gap-2 w-full"
		>
			<div className="flex-1 w-full">
				{/* TODO: UIレイアウト崩れ＆改行時の自動拡張が無効化してしまったので別Issueでfixしよう */}
				<textarea
					className="px-4 py-2 h-full w-full resize-none ring rounded-md"
					placeholder="メッセージを入力..."
					value={input}
					onChange={handleInputChange}
				/>
			</div>
			<button
				className="w-max px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
				type="submit"
			>
				送信
			</button>
		</form>
	);
}

export default TextArea;
