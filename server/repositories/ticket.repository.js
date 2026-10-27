import { randomUUID } from "node:crypto";
import { db, jsonBook } from "../db.js";

function withRelations(ticket, includeInternal = false) {
  const book = ticket.book_id ? db.prepare("SELECT * FROM books WHERE id=?").get(ticket.book_id) : null;
  const author = db.prepare("SELECT id,name,email FROM users WHERE id=?").get(ticket.author_id);
  const messages = db.prepare(`
    SELECT m.id,m.ticket_id,m.author_id,m.body,m.visibility,m.created_at,u.name AS sender_name,u.role AS sender_role
    FROM messages m JOIN users u ON u.id=m.author_id WHERE m.ticket_id=? ORDER BY m.created_at
  `).all(ticket.id).filter((message) => includeInternal || message.visibility === "public");
  return { ...ticket, author, book: book ? jsonBook(book) : null, messages };
}

export function create({ id = randomUUID(), authorId, bookId, subject, description, category, priority, aiUnavailable }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tickets (id,author_id,book_id,subject,description,category,priority,status,created_at,updated_at,ai_error)
    VALUES (?,?,?,?,?,?,?,'Open',?,?,?)
  `).run(id, authorId, bookId || null, subject, description, category, priority, now, now, aiUnavailable ? "AI unavailable; local classification used." : null);
  return findById(id, authorId);
}

export function listForAuthor(authorId) {
  return db.prepare("SELECT * FROM tickets WHERE author_id=? ORDER BY updated_at DESC")
    .all(authorId).map((ticket) => withRelations(ticket));
}

export function findForAuthor(ticketId, authorId) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id=? AND author_id=?").get(ticketId, authorId);
  return ticket ? withRelations(ticket) : null;
}

export function findById(ticketId, authorId) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id=? AND author_id=?").get(ticketId, authorId);
  return ticket ? withRelations(ticket) : null;
}

export function listForAdmin(filters) {
  const terms = [];
  const params = [];
  if (filters.status) { terms.push("t.status=?"); params.push(filters.status); }
  if (filters.category) { terms.push("t.category=?"); params.push(filters.category); }
  if (filters.priority) { terms.push("t.priority=?"); params.push(filters.priority); }
  if (filters.from) { terms.push("t.created_at>=?"); params.push(`${filters.from}T00:00:00.000Z`); }
  if (filters.to) { terms.push("t.created_at<=?"); params.push(`${filters.to}T23:59:59.999Z`); }
  if (filters.q) {
    terms.push("(t.subject LIKE ? OR t.description LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");
    params.push(...Array(4).fill(`%${filters.q}%`));
  }
  const where = terms.length ? `WHERE ${terms.join(" AND ")}` : "";
  return db.prepare(`
    SELECT t.* FROM tickets t JOIN users u ON u.id=t.author_id ${where}
    ORDER BY CASE WHEN t.status IN ('Resolved','Closed') THEN 1 ELSE 0 END,
    CASE t.priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
    t.created_at ASC
  `).all(...params).map((ticket) => withRelations(ticket, true));
}

export function findForAdmin(ticketId) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id=?").get(ticketId);
  return ticket ? withRelations(ticket, true) : null;
}

export function update(ticketId, { status, category, priority, assignedTo }) {
  db.prepare(`
    UPDATE tickets SET status=?,category=?,priority=?,assigned_to=?,updated_at=? WHERE id=?
  `).run(status, category, priority, assignedTo, new Date().toISOString(), ticketId);
  return findForAdmin(ticketId);
}

export function addMessage({ ticketId, authorId, body, visibility }) {
  const now = new Date().toISOString();
  const save = db.transaction(() => {
    db.prepare("INSERT INTO messages (id,ticket_id,author_id,body,visibility,created_at) VALUES (?,?,?,?,?,?)")
      .run(randomUUID(), ticketId, authorId, body, visibility, now);
    db.prepare("UPDATE tickets SET updated_at=? WHERE id=?").run(now, ticketId);
  });
  save();
  return findForAdmin(ticketId);
}
