"use client";

import type { UIMessage } from "ai";

function Message({ id, role, createdAt, content, parts }: UIMessage) {
	const name = role === "user" ? "明石太郎" : "AIアシスタント";

	return (
		<article
			id={id}
			className={`flex items-start gap-3 p-2
        ${role === "user" && "flex-row-reverse"}`}
		>
			{/* アバター */}
			<div
				aria-roledescription={role}
				className={`h-10 min-w-10 rounded-full flex items-center justify-center ${role === "user" ? "bg-blue-500" : "bg-green-500"}`}
			>
				<div className="text-white">{role === "user" ? "U" : "L"}</div>
			</div>
			{/* メッセージ領域 */}
			<div
				className={`max-w-2/3 flex flex-col ${role === "user" ? "items-end" : "items-start"}`}
			>
				<p className="text-sm text-slate-600 pb-2">{name}</p>
				<p
					className={`p-3 bg-blue-50 text-sm text-slate-900 rounded-xl whitespace-pre-line
            ${role === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
				>
					{content}
				</p>
				<p className="text-xs text-slate-400 mt-1">
					{createdAt instanceof Date
						? `${createdAt.getFullYear()}年${String(createdAt.getMonth() + 1).padStart(2, "0")}月${String(createdAt.getDate()).padStart(2, "0")}日 ${String(createdAt.getHours()).padStart(2, "0")}:${String(createdAt.getMinutes()).padStart(2, "0")}:${String(createdAt.getSeconds()).padStart(2, "0")}`
						: ""}
				</p>
			</div>
		</article>
	);
}

export default Message;
