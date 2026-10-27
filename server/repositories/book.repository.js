import { jsonBook, query } from "../db.js";

export async function listForAuthor(authorId) {
  const result = await query("SELECT * FROM books WHERE author_id=$1 ORDER BY title", [authorId]);
  return result.rows.map(jsonBook);
}

export async function findForAuthor(bookId, authorId) {
  const result = await query("SELECT id FROM books WHERE id=$1 AND author_id=$2", [bookId, authorId]);
  return result.rows[0] || null;
}

export async function findById(bookId) {
  const result = await query("SELECT * FROM books WHERE id=$1", [bookId]);
  return result.rows[0] || null;
}
