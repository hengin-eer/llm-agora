"use client";

import { MarkdownPreview } from "@/components/MarkdownPreview";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type Message = {
	id: string;
	role: "user" | "assistant";
	content: string;
	roleName?: string;
};

type CouncilLog = {
	id: string;
	topic: string;
	startTime: string;
	mode: string;
	messages: Message[];
};

export default function LogDetailPage({
	params,
}: {
	params: Promise<{ filename: string }>;
}) {
	const { filename } = use(params);
	const [log, setLog] = useState<CouncilLog | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchLog = async () => {
			try {
				// 拡張子がない場合は付与
				const safeFilename = filename.endsWith(".json")
					? filename
					: `${filename}.json`;
				const res = await fetch(`/api/council-logs/${safeFilename}`);

				if (!res.ok) {
					if (res.status === 404) throw new Error("ログが見つかりません");
					throw new Error("ログの取得に失敗しました");
				}

				const data = await res.json();
				setLog(data);
			} catch (err) {
				setError(String(err));
			} finally {
				setIsLoading(false);
			}
		};

		fetchLog();
	}, [filename]);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
				<div className="text-gray-500">読み込み中...</div>
			</div>
		);
	}

	if (error || !log) {
		return (
			<div className="min-h-screen bg-gray-50 p-8">
				<div className="max-w-2xl mx-auto">
					<div className="bg-red-100 text-red-700 p-4 rounded mb-4">
						{error || "ログが見つかりません"}
					</div>
					<Link href="/logs" className="text-blue-600 hover:underline">
						← 一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-2xl mx-auto">
				<div className="mb-6">
					<Link
						href="/logs"
						className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
					>
						← 一覧に戻る
					</Link>
					<h1 className="text-2xl font-bold mb-2">{log.topic}</h1>
					<div className="flex gap-4 text-sm text-gray-500">
						<span>日時: {new Date(log.startTime).toLocaleString("ja-JP")}</span>
						<span>モード: {log.mode}</span>
					</div>
				</div>

				<div className="bg-white p-4 rounded-lg shadow">
					{log.messages.map((msg) => (
						<div
							key={msg.id}
							className={`p-3 mb-2 rounded-lg ${
								msg.role === "user" ? "bg-blue-100" : "bg-green-100"
							}`}
						>
							<div className="text-xs text-gray-500 mb-1">
								{msg.roleName || (msg.role === "user" ? "ユーザー" : "AI")}
							</div>
							{msg.role === "user" ? (
								<div className="whitespace-pre-wrap">{msg.content}</div>
							) : (
								<MarkdownPreview content={msg.content} />
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
