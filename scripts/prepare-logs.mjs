#!/usr/bin/env node
/**
 * ビルド前にdocs/council-logsからpublic/council-logsにログをコピーし、
 * index.jsonを生成するスクリプト
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const SOURCE_DIR = path.join(ROOT_DIR, "docs", "council-logs");
const TARGET_DIR = path.join(ROOT_DIR, "public", "council-logs");

async function main() {
	console.log("📦 Preparing council logs for static build...");

	// 出力先ディレクトリを作成（存在する場合は中身を削除）
	try {
		await fs.rm(TARGET_DIR, { recursive: true, force: true });
	} catch {
		// ディレクトリが存在しない場合は無視
	}
	await fs.mkdir(TARGET_DIR, { recursive: true });

	// ソースディレクトリからJSONファイルを取得
	let files = [];
	try {
		const allFiles = await fs.readdir(SOURCE_DIR);
		files = allFiles.filter((f) => f.endsWith(".json")).sort().reverse();
	} catch (_error) {
		console.warn("⚠️  Source directory not found or empty:", SOURCE_DIR);
		// 空のindex.jsonを作成
		await fs.writeFile(
			path.join(TARGET_DIR, "index.json"),
			JSON.stringify({ files: [] }, null, 2),
		);
		console.log("✅ Created empty index.json");
		return;
	}

	// 各ログファイルをコピー
	for (const file of files) {
		const sourcePath = path.join(SOURCE_DIR, file);
		const targetPath = path.join(TARGET_DIR, file);
		await fs.copyFile(sourcePath, targetPath);
		console.log(`  📄 Copied: ${file}`);
	}

	// index.jsonを生成（ファイル一覧）
	const indexData = { files };
	await fs.writeFile(
		path.join(TARGET_DIR, "index.json"),
		JSON.stringify(indexData, null, 2),
	);

	console.log(`✅ Prepared ${files.length} log files`);
	console.log("✅ Generated index.json");
}

main().catch((err) => {
	console.error("❌ Error:", err);
	process.exit(1);
});
