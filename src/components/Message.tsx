"use client";

import { MarkdownPreview } from "./MarkdownPreview";

type MessageProps = {
	id: string;
	role: string;
	content: string;
	createdAt?: Date | number;
	roleName?: string;
};

function Message({ id, role, createdAt, content, roleName }: MessageProps) {
	const name = role === "user" ? "あなた" : roleName || "AIアシスタント";
	const date =
		typeof createdAt === "number"
			? new Date(createdAt)
			: createdAt || new Date();

	return (
		<article
			id={id}
			className={`flex items-start gap-3 p-2
        ${role === "user" && "flex-row-reverse"}`}
		>
			{/* アバター */}
			<div
				aria-roledescription={role}
				className={`h-10 min-w-10 rounded-full flex items-center justify-center shrink-0 ${
					role === "user" ? "bg-blue-500" : "bg-green-500"
				}`}
			>
				<div className="text-white text-sm font-bold">
					{role === "user" ? "U" : "L"}
				</div>
			</div>
			{/* メッセージ領域 */}
			<div
				className={`max-w-[85%] flex flex-col ${
					role === "user" ? "items-end" : "items-start"
				}`}
			>
				<p className="text-sm text-slate-600 pb-1 px-1">{name}</p>
				<div
					className={`p-3 text-sm text-slate-900 rounded-xl overflow-hidden
            ${role === "user" ? "bg-blue-100 rounded-tr-none" : "bg-gray-100 rounded-tl-none w-full"}`}
				>
					{role === "user" ? (
						<div className="whitespace-pre-wrap">{content}</div>
					) : (
						<MarkdownPreview content={content} />
					)}
				</div>
				<p className="text-xs text-slate-400 mt-1 px-1">
					{date.toLocaleTimeString()}
				</p>
			</div>
		</article>
	);
}

export default Message;
