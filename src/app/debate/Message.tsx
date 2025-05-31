"use client";

export type ChatMessageProps = {
	id: string;
	message: string;
	role: "user" | "llm";
	name: string;
};

function Message({ id, message, role, name }: ChatMessageProps) {
	return (
		<article
			key={id}
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
					className={`p-3 bg-blue-50 text-sm text-slate-900 rounded-xl
            ${role === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
				>
					{message}
				</p>
				<p className="text-xs text-slate-400 mt-1">
					{`${id.slice(0, 4)}年${id.slice(4, 6)}月${id.slice(6, 8)}日 ${id.slice(8, 10)}:${id.slice(10, 12)}:${id.slice(12, 14)}`}
				</p>
			</div>
		</article>
	);
}

export default Message;
