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
				className={`flex flex-col gap-1 ${role === "user" ? "items-end" : "items-start"}`}
			>
				<p className="text-sm pb-1">{name}</p>
				<p className="p-3 bg-slate-100 text-sm text-gray-700">{message}</p>
			</div>
		</article>
	);
}

export default Message;
