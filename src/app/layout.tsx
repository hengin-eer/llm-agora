import { Header } from "@/components/Header";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "LLM Agora",
	description:
		"複数のLLMエージェントが異なる倫理的立場から議論を行い、合意形成を目指すマルチエージェント議論プラットフォーム",
	authors: [
		{
			name: "timdaik (@hengin-eer)",
			url: "https://github.com/hengin-eer",
		},
	],
	keywords: [
		"LLM",
		"Multi-agent",
		"Debate",
		"AI Ethics",
		"Consensus Building",
		"マルチエージェント",
		"議論",
		"合意形成",
	],
	creator: "timdaik (@hengin-eer)",
	openGraph: {
		title: "LLM Agora",
		description:
			"複数のLLMエージェントが異なる倫理的立場から議論を行い、合意形成を目指すマルチエージェント議論プラットフォーム",
		type: "website",
		locale: "ja_JP",
		siteName: "LLM Agora",
		url: "https://github.com/hengin-eer/llm-agora",
	},
	twitter: {
		card: "summary",
		title: "LLM Agora",
		description:
			"複数のLLMエージェントが異なる倫理的立場から議論を行い、合意形成を目指すマルチエージェント議論プラットフォーム",
	},
	other: {
		"DC.title": "LLM Agora",
		"DC.creator": "timdaik (@hengin-eer)",
		"DC.date": "2026",
		"DC.type": "Software",
		"DC.language": "ja",
		citation_title: "LLM Agora",
		citation_author: "timdaik",
		citation_date: "2026",
		citation_public_url: "https://github.com/hengin-eer/llm-agora",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
			>
				<Header />
				<main>{children}</main>
			</body>
		</html>
	);
}
