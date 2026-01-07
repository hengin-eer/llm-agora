"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LogsPage() {
	const [files, setFiles] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchLogs = async () => {
			try {
				// 静的ファイルから読み込み（本番・開発共通）
				const res = await fetch("/council-logs/index.json");
				if (!res.ok) throw new Error("Failed to fetch logs");
				const data = await res.json();
				setFiles(data.files);
			} catch (err) {
				setError(String(err));
			} finally {
				setIsLoading(false);
			}
		};

		fetchLogs();
	}, []);

	// ファイル名から日時とトピックを抽出するヘルパー
	const parseFilename = (filename: string) => {
		// 形式: YYYYMMDDHHmmss_slug.json
		const match = filename.match(/^(\d{14})_(.+)\.json$/);
		if (!match) return { date: filename, topic: "" };

		const dateStr = match[1];
		const slug = match[2];

		const formattedDate = `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)} ${dateStr.slice(8, 10)}:${dateStr.slice(10, 12)}`;

		return { date: formattedDate, topic: slug };
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-4xl mx-auto">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold">議論ログ一覧</h1>
				</div>

				{isLoading ? (
					<div className="text-center py-10 text-gray-500">読み込み中...</div>
				) : error ? (
					<div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
				) : files.length === 0 ? (
					<div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
						保存されたログはありません
					</div>
				) : (
					<div className="grid gap-4">
						{files.map((file) => {
							const { date, topic } = parseFilename(file);
							const displayTopic = decodeURIComponent(topic.replace(/-/g, " "));
							const path = `/logs/${file.replace(".json", "")}`;
							return (
								<Link
									key={file}
									href={path}
									className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-transparent hover:border-blue-300"
								>
									<div className="flex justify-between items-center">
										<div>
											<div className="text-sm text-gray-500 mb-1">{date}</div>
											<div className="font-medium text-lg text-gray-800">
												{displayTopic}
											</div>
										</div>
										<div className="text-blue-600 text-sm">詳細を見る</div>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
