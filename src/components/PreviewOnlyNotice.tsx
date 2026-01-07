"use client";

import { ChevronRight, FileText, Lightbulb } from "lucide-react";
import Link from "next/link";

/**
 * 本番環境用のプレビュー専用コンポーネント
 * 議論機能はローカル環境でのみ使用可能であることを案内する
 */
export function PreviewOnlyNotice() {
	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
				<div className="mb-6">
					<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<FileText className="w-8 h-8 text-blue-600" />
					</div>
					<h1 className="text-2xl font-bold text-gray-800 mb-2">
						LLM Agora - 議論ログプレビュー
					</h1>
					<p className="text-gray-600">
						このサイトは議論ログのプレビュー専用です。
						<br />
						議論の実行はローカル環境でのみ可能です。
					</p>
				</div>

				<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
					<p className="text-sm text-amber-800 flex items-center gap-2">
						<Lightbulb className="w-4 h-4 flex-shrink-0" />
						<span>
							議論機能を使用するには、リポジトリをクローンしてローカルで実行してください。
						</span>
					</p>
				</div>

				<Link
					href="/logs"
					className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
				>
					議論ログを見る
					<ChevronRight className="w-4 h-4 ml-2" />
				</Link>
			</div>
		</div>
	);
}
