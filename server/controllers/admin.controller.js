import { draftResponse } from "../ai.js";
import * as ticketRepository from "../repositories/ticket.repository.js";

export function listTickets(req, res) {
  res.json({ tickets: ticketRepository.listForAdmin(req.validated.query) });
}

export function getTicket(req, res) {
  const ticket = ticketRepository.findForAdmin(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  res.json({ ticket });
}

export async function generateDraft(req, res) {
  const ticket = ticketRepository.findForAdmin(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  res.json(await draftResponse(ticket, ticket.book, ticket.author));
}

export function updateTicket(req, res) {
  const existing = ticketRepository.findForAdmin(req.params.id);
  if (!existing) return res.status(404).json({ error: "Ticket not found." });
  const patch = req.validated.body;
  const ticket = ticketRepository.update(req.params.id, {
    status: patch.status || existing.status,
    category: patch.category || existing.category,
    priority: patch.priority || existing.priority,
    assignedTo: patch.assignToMe ? req.user.sub : existing.assigned_to,
  });
  res.json({ ticket });
}

export function addMessage(req, res) {
  const existing = ticketRepository.findForAdmin(req.params.id);
  if (!existing) return res.status(404).json({ error: "Ticket not found." });
  const ticket = ticketRepository.addMessage({
    ticketId: existing.id,
    authorId: req.user.sub,
    ...req.validated.body,
  });
  res.status(201).json({ ticket });
}
