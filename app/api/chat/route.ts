import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const result = streamText({
    model: openRouter.chat("openrouter/free"),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
