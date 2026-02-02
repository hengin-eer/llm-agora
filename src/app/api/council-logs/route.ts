import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { uuidv7 } from "uuidv7";

// ログ保存ディレクトリ
const LOG_DIR = path.join(process.cwd(), "public", "council-logs");
const INDEX_FILE = path.join(LOG_DIR, "index.json");

// ディレクトリが存在しない場合は作成するヘルパー関数
async function ensureLogDir() {
	try {
		await fs.access(LOG_DIR);
	} catch {
		await fs.mkdir(LOG_DIR, { recursive: true });
	}
}

// index.jsonを更新するヘルパー関数
async function updateIndexJson(newFilename: string) {
	let files: string[] = [];

	// 既存のindex.jsonを読み込み
	try {
		const indexContent = await fs.readFile(INDEX_FILE, "utf-8");
		const indexData = JSON.parse(indexContent);
		files = Array.isArray(indexData.files) ? indexData.files : [];
	} catch {
		// index.jsonが存在しない場合は空配列から開始
		files = [];
	}

	// 新しいファイルを追加（重複を避ける）
	if (!files.includes(newFilename)) {
		files.push(newFilename);
	}

	// 日付降順でソート
	files.sort().reverse();

	// index.jsonを書き込み
	await fs.writeFile(INDEX_FILE, JSON.stringify({ files }, null, 2), "utf-8");
}

// GET: ログファイル一覧の取得
export async function GET() {
	try {
		await ensureLogDir();
		const files = await fs.readdir(LOG_DIR);
		// JSONファイルのみをフィルタリングし、新しい順にソート
		const jsonFiles = files
			.filter((file) => file.endsWith(".json"))
			.sort()
			.reverse();

		return NextResponse.json({ files: jsonFiles });
	} catch (error) {
		console.error("Failed to list logs:", error);
		return NextResponse.json({ error: "Failed to list logs" }, { status: 500 });
	}
}

// POST: ログの保存
export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { topic, startTime, messages } = body;

		if (!topic || !startTime || !messages) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// ファイル名の生成 (YYYYMMDDHHmmss_{slug}.json)
		// slugはクライアント側で生成して渡されることを想定、なければタイムスタンプのみ
		const slug = body.slug || "log";
		const timestamp = new Date()
			.toISOString()
			.replace(/[-:T.]/g, "")
			.slice(0, 14);
		const filename = `${timestamp}_${slug}.json`;
		const filePath = path.join(LOG_DIR, filename);

		// データの整形
		const logData = {
			id: uuidv7(),
			version: "1.0.0",
			...body,
			savedAt: new Date().toISOString(),
		};

		await ensureLogDir();
		await fs.writeFile(filePath, JSON.stringify(logData, null, 2), "utf-8");

		// index.jsonを更新
		await updateIndexJson(filename);

		return NextResponse.json({ success: true, filename });
	} catch (error) {
		console.error("Failed to save log:", error);
		return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
	}
}
