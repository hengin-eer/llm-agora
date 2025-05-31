"use client";
import { useRef, useState } from "react";

/**
 * 送信ボタン付きのテキストエリア
 * 改行時に自動で拡張される
 */
function TextArea() {
	const hiddenInput = useRef<HTMLDivElement>(null);
	const [value, setValue] = useState("");

	return (
		<div className="box-border flex items-end gap-2 w-full">
			<div className="relative flex-1 w-full">
				<div
					className="invisible px-4 py-2 min-h-[2.5rem] overflow-x-hidden whitespace-pre-wrap wrap-anywhere"
					aria-hidden={true}
					ref={hiddenInput}
				/>
				<textarea
					className="absolute top-0 left-0 px-4 py-2 h-full w-full resize-none ring rounded-md"
					placeholder="メッセージを入力..."
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
						if (hiddenInput.current)
							hiddenInput.current.textContent = `${e.target.value}\u200b`;
					}}
				/>
			</div>
			<button
				className="w-max px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
				type="submit"
			>
				送信
			</button>
		</div>
	);
}

export default TextArea;
