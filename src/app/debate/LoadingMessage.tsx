"use client";

// ターン数からロール名を取得する関数
function getRoleName(turnNumber: number): string {
	if (turnNumber % 3 === 1) return "肯定派";
	if (turnNumber % 3 === 2) return "否定派";
	return "展開派";
}

interface LoadingMessageProps {
	turnNumber: number;
}

function LoadingMessage({ turnNumber }: LoadingMessageProps) {
	const name = getRoleName(turnNumber);

	return (
		<article className="flex items-start gap-3 p-2">
			{/* アバター */}
			<div className="h-10 min-w-10 rounded-full flex items-center justify-center bg-green-500">
				<div className="text-white">L</div>
			</div>
			{/* メッセージ領域 */}
			<div className="max-w-2/3 flex flex-col items-start">
				<p className="text-sm text-slate-600 pb-2">{name}</p>
				<div className="p-3 bg-blue-50 text-sm text-slate-900 rounded-xl rounded-tl-none">
					{/* スケルトンローダー */}
					<div className="animate-pulse space-y-2">
						<div className="h-4 bg-slate-200 rounded w-3/4" />
						<div className="h-4 bg-slate-200 rounded w-1/2" />
						<div className="h-4 bg-slate-200 rounded w-5/6" />
					</div>
					<div className="flex items-center space-x-1 mt-2">
						<div className="flex space-x-1">
							<div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
							<div
								className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
								style={{ animationDelay: "0.1s" }}
							/>
							<div
								className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
								style={{ animationDelay: "0.2s" }}
							/>
						</div>
						<span className="text-xs text-slate-500 ml-2">
							{name}が回答を作成中...
						</span>
					</div>
				</div>
				<p className="text-xs text-slate-400 mt-1">
					{new Date().toLocaleString("ja-JP")}
				</p>
			</div>
		</article>
	);
}

export default LoadingMessage;
