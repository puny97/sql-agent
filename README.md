# Query Studio

**Ask questions about business data in plain language. Get answers grounded in live SQL results.**

Query Studio is an AI-assisted analytics prototype that lets people explore a sales database through a conversational interface—without having to write SQL themselves. Ask questions such as “Which products have the highest sales revenue?” and the assistant can inspect the database schema, run a query, and explain the results in a readable response.

The project demonstrates a practical bridge between generative AI and structured business data: an approachable interface for users, with real database queries behind the answers.

## Why it matters

Teams often have valuable operational data but depend on analysts or SQL specialists to answer routine questions. A natural-language-to-SQL workflow can make self-service exploration more accessible, shorten the path from question to insight, and help business and technical teams work from the same underlying data.

For large organizations, this interaction pattern could be adapted to use cases such as sales and inventory analysis, regional performance reporting, or operational dashboards. **This repository is a focused prototype—not a production enterprise analytics platform.** It currently demonstrates the experience against a sample sales database.

## What it does

- Accepts questions in natural language through a conversational chat interface.
- Gives the AI assistant tools to inspect the database schema and query the database.
- Streams assistant responses and shows database-tool activity in the conversation.
- Renders responses with Markdown, including formatted tables.
- Offers example questions for sales summaries, top products, regional trends, and low-stock checks.
- Includes sample `products` and `sales` tables, a database migration, and seed data.

## How it is built

1. **Web application:** Next.js App Router, React, and TypeScript power the chat experience.
2. **AI orchestration:** The Vercel AI SDK streams the conversation and makes schema and database tools available to the model. OpenRouter provides the model; the application currently selects `openrouter/free`.
3. **Data access:** The database tool uses Drizzle ORM and the LibSQL client to query a local SQLite-compatible database or a remote Turso database.
4. **Data model:** The sample schema contains `products` (name, category, price, stock, and creation time) and `sales` (product, quantity, total, date, customer, and region).
5. **User experience:** The client displays the streamed answer, SQL tool activity, example prompts, loading states, and request errors.

```text
Question in chat
      ↓
Next.js chat API ──→ OpenRouter model
      ↑                    │
      │     schema + query tool calls
      └─────────────┬──────┘
                    ↓
             LibSQL / Turso
                    ↓
       Query results summarized in chat
```

## Run locally

### Prerequisites

- Node.js 22 or later
- pnpm 10.30.1 (the version pinned by this project)
- An OpenRouter API key

You can use a local LibSQL database for development or configure a remote Turso database.

### 1. Install dependencies

```bash
git clone <repository-url>
cd sql-agent
corepack pnpm install
```

Replace `<repository-url>` with the URL of your clone.

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```dotenv
OPENROUTER_API_KEY=your_openrouter_api_key
TURSO_DATABASE_URL=file:local.db
```

`file:local.db` creates/uses a local database file. To use a remote Turso database instead, set `TURSO_DATABASE_URL` to its database URL and provide its authentication token:

```dotenv
OPENROUTER_API_KEY=your_openrouter_api_key
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
```

### 3. Create the database schema

Apply the checked-in migration to the database configured above:

```bash
corepack pnpm db:migrate
```

### 4. (Optional) Load the sample data

The seed script inserts example products and sales into the configured database:

```bash
TURSO_DATABASE_URL=file:local.db corepack pnpm dlx tsx db/db.seed.ts
```

This command is for macOS/Linux shells. In PowerShell, set the database URL before running the seed script:

```powershell
$env:TURSO_DATABASE_URL = "file:local.db"
corepack pnpm dlx tsx db/db.seed.ts
```

For a remote Turso database, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the shell as well. The standalone seed script reads environment variables from the shell; unlike the Next.js app and Drizzle config, it does not automatically load `.env.local`. Run it once against an empty database; it inserts rows each time it is run.

### 5. Start the development server

```bash
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and try one of the suggested questions.

## Production considerations

This project is a portfolio-ready demonstration of a useful product pattern, not a claim of enterprise readiness. The API prompt asks the model to generate `SELECT` queries, but a prompt is **not** a security boundary, and the database tool currently executes the SQL it receives. Before connecting sensitive or production data, enforce read-only access at the database-permission and query-validation layers, and add appropriate authentication, authorization, tenant isolation, audit logging, rate limits, and privacy controls. Validate generated queries and results for your organization’s data policies.

## Project structure

```text
app/
  api/chat/route.ts   # Streaming AI chat API and database tools
  page.tsx            # Chat interface
  layout.tsx          # Application layout and metadata
db/
  db.ts               # Lazy LibSQL/Drizzle database client
  schema.ts           # Products and sales schema
  db.seed.ts          # Example dataset
  migrations/         # Checked-in database migration
```
