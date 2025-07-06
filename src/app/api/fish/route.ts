import { NextResponse } from 'next/server';

export async function GET() {
  const fishes = [
    "サケ",
    "マグロ",
    "アジ",
    "イワシ",
    "サバ",
    "タイ",
    "カツオ",
    "ヒラメ",
    "ブリ",
    "サンマ"
  ];
  return NextResponse.json(fishes);
}
