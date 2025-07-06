import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const systemPrompt = "ユーザの意見を合理的かつ理路整然とした形で論破して。語調は中立的で、感情的にならないように。";

  const result = streamText({
    model: google('gemini-2.0-flash-001'),
    messages,
    system: systemPrompt,
  });

  return result.toDataStreamResponse();
}
