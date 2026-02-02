import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// ログ保存ディレクトリ
const LOG_DIR = path.join(process.cwd(), "public", "council-logs");

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ filename: string }> },
) {
	try {
		const { filename } = await params;

		// ディレクトリトラバーサル対策
		const safeFilename = path.basename(filename);
		if (safeFilename !== filename || !filename.endsWith(".json")) {
			return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
		}

		const filePath = path.join(LOG_DIR, safeFilename);

		try {
			await fs.access(filePath);
		} catch {
			return NextResponse.json({ error: "Log not found" }, { status: 404 });
		}

		const fileContent = await fs.readFile(filePath, "utf-8");
		const logData = JSON.parse(fileContent);

		return NextResponse.json(logData);
	} catch (error) {
		console.error("Failed to read log:", error);
		return NextResponse.json({ error: "Failed to read log" }, { status: 500 });
	}
}
