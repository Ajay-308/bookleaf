import { classifyTicket } from "../ai.js";
import * as bookRepository from "../repositories/book.repository.js";
import * as ticketRepository from "../repositories/ticket.repository.js";

export function listBooks(req, res) {
  res.json({ books: bookRepository.listForAuthor(req.user.sub) });
}

export async function createTicket(req, res) {
  const { bookId, subject, description } = req.validated.body;
  if (bookId && !bookRepository.findForAuthor(bookId, req.user.sub)) {
    return res.status(400).json({ error: "Choose one of your books, or select General / Account Level." });
  }
  const classification = await classifyTicket(subject, description);
  const ticket = ticketRepository.create({
    authorId: req.user.sub,
    bookId,
    subject,
    description,
    ...classification,
  });
  res.status(201).json({ ticket });
}

export function listTickets(req, res) {
  res.json({ tickets: ticketRepository.listForAuthor(req.user.sub) });
}

export function getTicket(req, res) {
  const ticket = ticketRepository.findForAuthor(req.params.id, req.user.sub);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  res.json({ ticket });
}
