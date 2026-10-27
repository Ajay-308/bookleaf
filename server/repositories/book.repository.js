import { db, jsonBook } from "../db.js";

export function listForAuthor(authorId) {
  return db.prepare("SELECT * FROM books WHERE author_id=? ORDER BY title").all(authorId).map(jsonBook);
}

export function findForAuthor(bookId, authorId) {
  return db.prepare("SELECT id FROM books WHERE id=? AND author_id=?").get(bookId, authorId);
}

export function findById(bookId) {
  return db.prepare("SELECT * FROM books WHERE id=?").get(bookId);
}
