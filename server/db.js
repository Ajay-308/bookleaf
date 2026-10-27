import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(here, "data");
fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(path.join(dataDirectory, "bookleaf.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('author', 'admin')),
    phone TEXT,
    city TEXT,
    joined_date TEXT
  );
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    isbn TEXT NOT NULL,
    genre TEXT NOT NULL,
    publication_date TEXT,
    status TEXT NOT NULL,
    mrp REAL,
    author_royalty_per_copy REAL,
    total_copies_sold INTEGER NOT NULL DEFAULT 0,
    total_royalty_earned REAL NOT NULL DEFAULT 0,
    royalty_paid REAL NOT NULL DEFAULT 0,
    royalty_pending REAL NOT NULL DEFAULT 0,
    last_royalty_payout_date TEXT,
    print_partner TEXT,
    available_on TEXT NOT NULL DEFAULT '[]'
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
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    visibility TEXT NOT NULL CHECK(visibility IN ('public', 'internal')),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tickets_status_priority_created ON tickets(status, priority, created_at);
  CREATE INDEX IF NOT EXISTS messages_ticket_created ON messages(ticket_id, created_at);
`);

export function jsonBook(book) {
  return { ...book, available_on: JSON.parse(book.available_on || "[]") };
}
