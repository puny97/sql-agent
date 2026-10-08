import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  tool,
} from "ai";
import z from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const SYSTEM_PROMPT = `You are an expert SQL assistant that helps users to query their database using natural language
  You have access to following tools:
  2. db tool - call this tool to query the database.

  Rules: 
  - Generate only SELECT queries (No INSERT, DROP, UPDATE, DELETE)
  - Return valid SQLite syntax
  `;

  const result = streamText({
    model: openRouter.chat("openrouter/free"),
    messages: await convertToModelMessages(messages),
    system: SYSTEM_PROMPT,
    tools: {
      query: tool({
        description: "Call this tool to query a database",
        inputSchema: z.object({
          query: z.string().describe("The SQL query to be ran"),
        }),
        execute: async ({ query }) => {
          return query;
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
