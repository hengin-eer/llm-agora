import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
	try {
		const { topic } = await req.json();

		if (!topic) {
			return NextResponse.json({ error: "Topic is required" }, { status: 400 });
		}

		const prompt = `
You are a helpful assistant that generates file name slugs.
Translate the following Japanese topic into a short, descriptive English slug (kebab-case).
The slug should be concise (max 5-6 words) and URL-safe.
Only return the slug string, nothing else. Do not include file extension.

Topic: ${topic}
Slug:`;

		const result = await generateText({
			model: google("gemini-2.5-flash"),
			prompt: prompt,
			temperature: 0.1,
		});

		// 結果を整形（小文字化、不要な文字の削除）
		const slug = result.text
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-") // 英数字とハイフン以外を置換
			.replace(/-+/g, "-") // 連続するハイフンを1つに
			.replace(/^-|-$/g, ""); // 先頭と末尾のハイフンを削除

		return NextResponse.json({ slug });
	} catch (error) {
		console.error("Failed to generate slug:", error);
		return NextResponse.json(
			{ error: "Failed to generate slug" },
			{ status: 500 },
		);
	}
}
