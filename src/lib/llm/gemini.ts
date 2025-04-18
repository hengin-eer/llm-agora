import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

const model = google('gemini-2.0-flash-exp', {
  // TODO: `cachedContent`を使用して、チャットに最適化する
})

const { text } = await generateText({
  model: model,
  prompt: `
  # ここにプロンプトを追加
  あなたは哲学者です。これから議論を始めるので建設的に議論を進めてください。
  `
})
