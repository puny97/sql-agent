import { getDb } from "@/db/db";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  tool,
  isStepCount,
} from "ai";
import z from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const SYSTEM_PROMPT = `You are an expert SQL assistant that helps users to query their database using natural language
  You have access to following tools:
  1. schema tool - call this tool to get the database schema which will help you to write sql query
  2. db tool - call this tool to query the database.

  ${new Date().toLocaleString("sv-SE")}
  Rules: 
  - Generate only SELECT queries (No INSERT, DROP, UPDATE, DELETE)
  - Always use the schema provided by the schema tool
  - Pass in valid SQl syntax in db tool.
  - IMPORTANT: To query database call db tool, Dont return just SQL query.
  
  Always respond in a helpful, conversational tone while being technically accurate.
  `;

  const result = streamText({
    model: openRouter.chat("openrouter/free"),
    messages: await convertToModelMessages(messages),
    system: SYSTEM_PROMPT,
    stopWhen: isStepCount(10),
    tools: {
      schema: tool({
        description: "Call this tool to get database schema information",
        inputSchema: z.object({}),
        execute: async () => {
          return `
          CREATE TABLE products (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	name text NOT NULL,
	category text NOT NULL,
	price real NOT NULL,
	stock integer DEFAULT 0 NOT NULL,
	created_at text DEFAULT CURRENT_TIMESTAMP
)

CREATE TABLE sales (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	product_id integer NOT NULL,
	quantity integer NOT NULL,
	total_amount real NOT NULL,
	sale_date text DEFAULT CURRENT_TIMESTAMP,
	customer_name text NOT NULL,
	region text NOT NULL,
	FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE no action
)
          `;
        },
      }),
      db: tool({
        description: "Call this tool to query a database",
        inputSchema: z.object({
          query: z.string().describe("The SQL query to be ran"),
        }),
        execute: async ({ query }) => {
          return await getDb().run(query);
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
