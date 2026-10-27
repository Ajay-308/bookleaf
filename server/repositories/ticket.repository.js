import { randomUUID } from "node:crypto";
import { jsonBook, query, withTransaction } from "../db.js";

async function withRelations(ticket, includeInternal = false) {
  const [bookResult, authorResult, messageResult] = await Promise.all([
    ticket.book_id
      ? query("SELECT * FROM books WHERE id=$1", [ticket.book_id])
      : Promise.resolve({ rows: [] }),
    query("SELECT id,name,email FROM users WHERE id=$1", [ticket.author_id]),
    query(`
      SELECT m.id,m.ticket_id,m.author_id,m.body,m.visibility,m.created_at,
        u.name AS sender_name,u.role AS sender_role
      FROM messages m JOIN users u ON u.id=m.author_id
      WHERE m.ticket_id=$1 ORDER BY m.created_at
    `, [ticket.id]),
  ]);
  const messages = messageResult.rows.filter((message) => includeInternal || message.visibility === "public");
  const book = bookResult.rows[0];
  return {
    ...ticket,
    author: authorResult.rows[0],
    book: book ? jsonBook(book) : null,
    messages,
  };
}

export async function create({ id = randomUUID(), authorId, bookId, subject, description, category, priority, aiUnavailable }) {
  const now = new Date().toISOString();
  await query(`
    INSERT INTO tickets (id,author_id,book_id,subject,description,category,priority,status,created_at,updated_at,ai_error)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'Open',$8,$9,$10)
  `, [id, authorId, bookId || null, subject, description, category, priority, now, now,
    aiUnavailable ? "AI unavailable; local classification used." : null]);
  return findById(id, authorId);
}

export async function listForAuthor(authorId) {
  const result = await query("SELECT * FROM tickets WHERE author_id=$1 ORDER BY updated_at DESC", [authorId]);
  return Promise.all(result.rows.map((ticket) => withRelations(ticket)));
}

export async function findForAuthor(ticketId, authorId) {
  const result = await query("SELECT * FROM tickets WHERE id=$1 AND author_id=$2", [ticketId, authorId]);
  return result.rows[0] ? withRelations(result.rows[0]) : null;
}

export async function findById(ticketId, authorId) {
  return findForAuthor(ticketId, authorId);
}

export async function listForAdmin(filters) {
  const terms = [];
  const params = [];
  const addFilter = (expression, value) => {
    params.push(value);
    terms.push(expression.replace("?", `$${params.length}`));
  };
  if (filters.status) addFilter("t.status=?", filters.status);
  if (filters.category) addFilter("t.category=?", filters.category);
  if (filters.priority) addFilter("t.priority=?", filters.priority);
  if (filters.from) addFilter("t.created_at>=?", `${filters.from}T00:00:00.000Z`);
  if (filters.to) addFilter("t.created_at<=?", `${filters.to}T23:59:59.999Z`);
  if (filters.q) {
    const searchTerm = `%${filters.q}%`;
    const placeholders = Array.from({ length: 4 }, () => {
      params.push(searchTerm);
      return `$${params.length}`;
    });
    terms.push(`(t.subject ILIKE ${placeholders[0]} OR t.description ILIKE ${placeholders[1]} OR u.name ILIKE ${placeholders[2]} OR u.email ILIKE ${placeholders[3]})`);
  }
  const where = terms.length ? `WHERE ${terms.join(" AND ")}` : "";
  const result = await query(`
    SELECT t.* FROM tickets t JOIN users u ON u.id=t.author_id ${where}
    ORDER BY CASE WHEN t.status IN ('Resolved','Closed') THEN 1 ELSE 0 END,
    CASE t.priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
    t.created_at ASC
  `, params);
  return Promise.all(result.rows.map((ticket) => withRelations(ticket, true)));
}

export async function findForAdmin(ticketId) {
  const result = await query("SELECT * FROM tickets WHERE id=$1", [ticketId]);
  return result.rows[0] ? withRelations(result.rows[0], true) : null;
}

export async function update(ticketId, { status, category, priority, assignedTo }) {
  await query(`
    UPDATE tickets SET status=$1,category=$2,priority=$3,assigned_to=$4,updated_at=$5 WHERE id=$6
  `, [status, category, priority, assignedTo, new Date().toISOString(), ticketId]);
  return findForAdmin(ticketId);
}

export async function addMessage({ ticketId, authorId, body, visibility }) {
  const now = new Date().toISOString();
  await withTransaction(async (client) => {
    await client.query(
      "INSERT INTO messages (id,ticket_id,author_id,body,visibility,created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [randomUUID(), ticketId, authorId, body, visibility, now],
    );
    await client.query("UPDATE tickets SET updated_at=$1 WHERE id=$2", [now, ticketId]);
  });
  return findForAdmin(ticketId);
}
