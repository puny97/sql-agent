import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

let database: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (database) {
    return database;
  }

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL must be set before querying the database.",
    );
  }

  const turso = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  database = drizzle(turso);
  return database;
}
