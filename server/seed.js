import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(fs.readFileSync(path.join(here, "data", "bookleaf_sample_data.json"), "utf8"));
if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)) {
  throw new Error("Production seeding requires ADMIN_PASSWORD with at least 12 characters.");
}
const passwordHash = await bcrypt.hash("Author123!", 10);
const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin123!", 10);

const seed = db.transaction(() => {
  const insertAuthor = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, city, joined_date)
    VALUES (@id, @name, @email, @password_hash, 'author', @phone, @city, @joined_date)
  `);
  const insertBook = db.prepare(`
    INSERT OR IGNORE INTO books (
      id, author_id, title, isbn, genre, publication_date, status, mrp,
      author_royalty_per_copy, total_copies_sold, total_royalty_earned,
      royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on
    ) VALUES (
      @id, @author_id, @title, @isbn, @genre, @publication_date, @status, @mrp,
      @author_royalty_per_copy, @total_copies_sold, @total_royalty_earned,
      @royalty_paid, @royalty_pending, @last_royalty_payout_date, @print_partner, @available_on
    )
  `);

  for (const author of sample.authors) {
    insertAuthor.run({
      id: author.author_id,
      name: author.name,
      email: author.email,
      password_hash: passwordHash,
      phone: author.phone || null,
      city: author.city || null,
      joined_date: author.joined_date || null,
    });
    for (const book of author.books) {
      insertBook.run({
        id: book.book_id,
        author_id: author.author_id,
        title: book.title,
        isbn: book.isbn,
        genre: book.genre,
        publication_date: book.publication_date || null,
        status: book.status,
        mrp: book.mrp,
        author_royalty_per_copy: book.author_royalty_per_copy,
        total_copies_sold: book.total_copies_sold,
        total_royalty_earned: book.total_royalty_earned,
        royalty_paid: book.royalty_paid,
        royalty_pending: book.royalty_pending,
        last_royalty_payout_date: book.last_royalty_payout_date || null,
        print_partner: book.print_partner || null,
        available_on: JSON.stringify(book.available_on || []),
      });
    }
  }

  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
    VALUES ('ADMIN001', 'BookLeaf Support', 'admin@bookleaf.local', ?, 'admin')
  `).run(adminHash);
});

seed();
console.log(`Seeded ${db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='author'").get().n} authors and ${db.prepare("SELECT COUNT(*) AS n FROM books").get().n} books.`);
