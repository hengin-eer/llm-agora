"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = {
	content: string;
};

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				// 見出し
				h1: ({ children }) => (
					<h1 className="text-xl font-bold mt-4 mb-2 border-b pb-1">
						{children}
					</h1>
				),
				h2: ({ children }) => (
					<h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
				),
				h3: ({ children }) => (
					<h3 className="text-base font-bold mt-2 mb-1">{children}</h3>
				),
				// 段落
				p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
				// リスト
				ul: ({ children }) => (
					<ul className="list-disc list-inside mb-2 ml-2">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="list-decimal list-inside mb-2 ml-2">{children}</ol>
				),
				li: ({ children }) => <li className="mb-1">{children}</li>,
				// コードブロック
				code: ({ className, children }) => {
					const isInline = !className;
					if (isInline) {
						return (
							<code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">
								{children}
							</code>
						);
					}
					return (
						<code className="block bg-gray-800 text-gray-100 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-2">
							{children}
						</code>
					);
				},
				pre: ({ children }) => <pre className="mb-2">{children}</pre>,
				// 強調
				strong: ({ children }) => (
					<strong className="font-bold">{children}</strong>
				),
				em: ({ children }) => <em className="italic">{children}</em>,
				// リンク
				a: ({ href, children }) => (
					<a
						href={href}
						className="text-blue-600 hover:underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						{children}
					</a>
				),
				// 引用
				blockquote: ({ children }) => (
					<blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 mb-2">
						{children}
					</blockquote>
				),
				// 水平線
				hr: () => <hr className="my-4 border-gray-300" />,
				// テーブル
				table: ({ children }) => (
					<div className="overflow-x-auto mb-2">
						<table className="min-w-full border-collapse border border-gray-300">
							{children}
						</table>
					</div>
				),
				thead: ({ children }) => (
					<thead className="bg-gray-100">{children}</thead>
				),
				tbody: ({ children }) => <tbody>{children}</tbody>,
				tr: ({ children }) => (
					<tr className="border-b border-gray-300">{children}</tr>
				),
				th: ({ children }) => (
					<th className="border border-gray-300 px-3 py-1 text-left font-bold">
						{children}
					</th>
				),
				td: ({ children }) => (
					<td className="border border-gray-300 px-3 py-1">{children}</td>
				),
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
