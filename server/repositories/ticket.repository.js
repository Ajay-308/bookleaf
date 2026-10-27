import { randomUUID } from "node:crypto";
import { jsonBook, prisma } from "../db.js";

const ticketInclude = {
  author: { select: { id: true, name: true, email: true } },
  book: true,
  messages: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, role: true } } },
  },
};

function serializeTicket(ticket, includeInternal = false) {
  return {
    id: ticket.id,
    author_id: ticket.authorId,
    book_id: ticket.bookId,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    assigned_to: ticket.assignedToId,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
    ai_error: ticket.aiError,
    author: ticket.author,
    book: ticket.book ? jsonBook(ticket.book) : null,
    messages: ticket.messages
      .filter((message) => includeInternal || message.visibility === "public")
      .map((message) => ({
        id: message.id,
        ticket_id: message.ticketId,
        author_id: message.authorId,
        body: message.body,
        visibility: message.visibility,
        created_at: message.createdAt,
        sender_name: message.author.name,
        sender_role: message.author.role,
      })),
  };
}

export async function create({ id = randomUUID(), authorId, bookId, subject, description, category, priority, aiUnavailable }) {
  const now = new Date().toISOString();
  await prisma.ticket.create({
    data: {
      id,
      authorId,
      bookId: bookId || null,
      subject,
      description,
      category,
      priority,
      status: "Open",
      createdAt: now,
      updatedAt: now,
      aiError: aiUnavailable ? "AI unavailable; local classification used." : null,
    },
  });
  return findById(id, authorId);
}

export async function listForAuthor(authorId) {
  const tickets = await prisma.ticket.findMany({
    where: { authorId },
    include: ticketInclude,
    orderBy: { updatedAt: "desc" },
  });
  return tickets.map((ticket) => serializeTicket(ticket));
}

export async function findForAuthor(ticketId, authorId) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, authorId },
    include: ticketInclude,
  });
  return ticket ? serializeTicket(ticket) : null;
}

export async function findById(ticketId, authorId) {
  return findForAuthor(ticketId, authorId);
}

export async function listForAdmin(filters) {
  const createdAt = {};
  if (filters.from) createdAt.gte = `${filters.from}T00:00:00.000Z`;
  if (filters.to) createdAt.lte = `${filters.to}T23:59:59.999Z`;

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(filters.q ? {
        OR: [
          { subject: { contains: filters.q, mode: "insensitive" } },
          { description: { contains: filters.q, mode: "insensitive" } },
          { author: { name: { contains: filters.q, mode: "insensitive" } } },
          { author: { email: { contains: filters.q, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: ticketInclude,
    orderBy: { createdAt: "asc" },
  });

  return tickets
    .sort((left, right) => {
      const leftResolved = ["Resolved", "Closed"].includes(left.status);
      const rightResolved = ["Resolved", "Closed"].includes(right.status);
      if (leftResolved !== rightResolved) return Number(leftResolved) - Number(rightResolved);
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (priorityOrder[left.priority] ?? 3) - (priorityOrder[right.priority] ?? 3)
        || left.createdAt.localeCompare(right.createdAt);
    })
    .map((ticket) => serializeTicket(ticket, true));
}

export async function findForAdmin(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: ticketInclude,
  });
  return ticket ? serializeTicket(ticket, true) : null;
}

export async function update(ticketId, { status, category, priority, assignedTo }) {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      category,
      priority,
      assignedToId: assignedTo,
      updatedAt: new Date().toISOString(),
    },
  });
  return findForAdmin(ticketId);
}

export async function addMessage({ ticketId, authorId, body, visibility }) {
  const now = new Date().toISOString();
  await prisma.$transaction(async (transaction) => {
    await transaction.message.create({
      data: { id: randomUUID(), ticketId, authorId, body, visibility, createdAt: now },
    });
    await transaction.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: now },
    });
  });
  return findForAdmin(ticketId);
}
