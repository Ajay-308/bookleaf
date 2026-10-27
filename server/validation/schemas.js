import { z } from "zod";

const statuses = ["Open", "In Progress", "Resolved", "Closed"];
const categories = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];
const priorities = ["Critical", "High", "Medium", "Low"];

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const createTicketSchema = z.object({
  bookId: z.string().nullable().optional(),
  subject: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(5000),
});

export const adminTicketQuerySchema = z.object({
  status: z.enum(statuses).optional(),
  category: z.enum(categories).optional(),
  priority: z.enum(priorities).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  q: z.string().max(100).optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(statuses).optional(),
  category: z.enum(categories).optional(),
  priority: z.enum(priorities).optional(),
  assignToMe: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one ticket update.");

export const ticketMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  visibility: z.enum(["public", "internal"]),
});
