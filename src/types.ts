export type User = { id: string; name: string; email: string; role: "author" | "admin" };
export type Book = {
  id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
};
export type Message = {
  id: string;
  body: string;
  visibility: "public" | "internal";
  created_at: string;
  sender_name: string;
  sender_role: string;
};
export type Ticket = {
  id: string;
  author_id: string;
  book_id: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  ai_error?: string | null;
  author: { id: string; name: string; email: string };
  book: Book | null;
  messages: Message[];
};
export type QueueFilters = { status: string; category: string; priority: string; from: string; to: string; q: string };
export type TicketDraft = { bookId: string; subject: string; description: string };

export const categories = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
];
export const priorities = ["Critical", "High", "Medium", "Low"];
export const statuses = ["Open", "In Progress", "Resolved", "Closed"];
