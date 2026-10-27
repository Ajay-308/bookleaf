import pg from "pg";

const connectionString = process.env.db || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Set the PostgreSQL connection string in db or DATABASE_URL.");
}

export const pool = new pg.Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export function query(text, values) {
  return pool.query(text, values);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('author', 'admin')),
      phone TEXT,
      city TEXT,
      joined_date TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_ci ON users (LOWER(email));

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      isbn TEXT NOT NULL,
      genre TEXT NOT NULL,
      publication_date TEXT,
      status TEXT NOT NULL,
      mrp DOUBLE PRECISION,
      author_royalty_per_copy DOUBLE PRECISION,
      total_copies_sold INTEGER NOT NULL DEFAULT 0,
      total_royalty_earned DOUBLE PRECISION NOT NULL DEFAULT 0,
      royalty_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
      royalty_pending DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_royalty_payout_date TEXT,
      print_partner TEXT,
      available_on JSONB NOT NULL DEFAULT '[]'::jsonb
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id),
      book_id TEXT REFERENCES books(id),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      assigned_to TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ai_error TEXT
    );
    CREATE INDEX IF NOT EXISTS tickets_status_priority_created
      ON tickets(status, priority, created_at);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      visibility TEXT NOT NULL CHECK(visibility IN ('public', 'internal')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_ticket_created ON messages(ticket_id, created_at);
  `);
}

export function jsonBook(book) {
  return {
    ...book,
    available_on: Array.isArray(book.available_on)
      ? book.available_on
      : JSON.parse(book.available_on || "[]"),
  };
}
