import "dotenv/config";
import bcrypt from "bcryptjs";
import { initializeDatabase, pool, query, withTransaction } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(fs.readFileSync(path.join(here, "data", "bookleaf_sample_data.json"), "utf8"));
if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)) {
  throw new Error("Production seeding requires ADMIN_PASSWORD with at least 12 characters.");
}

try {
  await initializeDatabase();
  const passwordHash = await bcrypt.hash("Author123!", 10);
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin123!", 10);

  await withTransaction(async (client) => {
    for (const author of sample.authors) {
      await client.query(`
        INSERT INTO users (id,name,email,password_hash,role,phone,city,joined_date)
        VALUES ($1,$2,$3,$4,'author',$5,$6,$7)
        ON CONFLICT (id) DO NOTHING
      `, [
        author.author_id,
        author.name,
        author.email,
        passwordHash,
        author.phone || null,
        author.city || null,
        author.joined_date || null,
      ]);

      for (const book of author.books) {
        await client.query(`
          INSERT INTO books (
            id,author_id,title,isbn,genre,publication_date,status,mrp,
            author_royalty_per_copy,total_copies_sold,total_royalty_earned,
            royalty_paid,royalty_pending,last_royalty_payout_date,print_partner,available_on
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
          )
          ON CONFLICT (id) DO NOTHING
        `, [
          book.book_id,
          author.author_id,
          book.title,
          book.isbn,
          book.genre,
          book.publication_date || null,
          book.status,
          book.mrp,
          book.author_royalty_per_copy,
          book.total_copies_sold,
          book.total_royalty_earned,
          book.royalty_paid,
          book.royalty_pending,
          book.last_royalty_payout_date || null,
          book.print_partner || null,
          JSON.stringify(book.available_on || []),
        ]);
      }
    }

    await client.query(`
      INSERT INTO users (id,name,email,password_hash,role)
      VALUES ('ADMIN001','BookLeaf Support','admin@bookleaf.local',$1,'admin')
      ON CONFLICT (id) DO NOTHING
    `, [adminHash]);
  });

  const [authors, books] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM users WHERE role='author'"),
    query("SELECT COUNT(*)::int AS count FROM books"),
  ]);
  console.log(`Seeded ${authors.rows[0].count} authors and ${books.rows[0].count} books.`);
} finally {
  await pool.end();
}
