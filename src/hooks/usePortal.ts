import { useCallback, useEffect, useMemo, useState } from "react";
import { request } from "../lib/api";
import type { Book, QueueFilters, Ticket, TicketDraft, User } from "../types";

const emptyFilters: QueueFilters = { status: "", category: "", priority: "", from: "", to: "", q: "" };
const emptyTicket: TicketDraft = { bookId: "", subject: "", description: "" };

export function usePortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem("bookleaf-token") || "");
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState("Overview");
  const [books, setBooks] = useState<Book[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [busy, setBusy] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");
  const [filters, setFilters] = useState<QueueFilters>(emptyFilters);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [newTicket, setNewTicket] = useState<TicketDraft>(emptyTicket);
  const [search, setSearch] = useState("");

  const signOut = useCallback(() => {
    sessionStorage.removeItem("bookleaf-token");
    setToken("");
    setUser(null);
    setSelectedTicket(null);
    setBooks([]);
    setTickets([]);
  }, []);

  const api = useCallback(<T,>(url: string, options: RequestInit = {}) =>
    request<T>(url, token, signOut, options), [token, signOut]);

  const loadPortal = useCallback(async (currentUser: User, silent = false) => {
    if (!silent) setBusy(true);
    try {
      if (currentUser.role === "author") {
        const [bookResult, ticketResult] = await Promise.all([
          api<{ books: Book[] }>("/api/books"),
          api<{ tickets: Ticket[] }>("/api/tickets"),
        ]);
        setBooks(bookResult.books);
        setTickets(ticketResult.tickets);
        setSelectedTicket((selected) => selected ? ticketResult.tickets.find((item) => item.id === selected.id) || null : null);
      } else {
        const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
        const result = await api<{ tickets: Ticket[] }>(`/api/admin/tickets${params.size ? `?${params}` : ""}`);
        setTickets(result.tickets);
        setSelectedTicket((selected) => selected ? result.tickets.find((item) => item.id === selected.id) || null : null);
      }
    } catch (error) {
      if (!silent) setNotice(error instanceof Error ? error.message : "Unable to load your portal.");
    } finally {
      if (!silent) setBusy(false);
    }
  }, [api, filters]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    let active = true;
    api<{ user: User }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        setPage(currentUser.role === "admin" ? "Queue" : "Overview");
      })
      .catch((error: Error) => {
        if (active) setNotice(error.message);
      });
    return () => { active = false; };
  }, [token, api]);

  useEffect(() => {
    if (!user) return;
    void loadPortal(user);
    const timer = window.setInterval(() => void loadPortal(user, true), 8000);
    return () => window.clearInterval(timer);
  }, [user, loadPortal]);

  useEffect(() => {
    if (user?.role !== "admin" || !selectedTicket) return;
    let active = true;
    setDraft("");
    setReply("");
    setDraftLoading(true);
    api<{ draft: string; aiUnavailable: boolean }>(`/api/admin/tickets/${selectedTicket.id}/draft`, { method: "POST" })
      .then((result) => {
        if (!active) return;
        setDraft(result.draft);
        setNotice(result.aiUnavailable ? "AI is unavailable; an editable suggested response is ready." : "AI draft ready. Review and edit before sending.");
      })
      .catch((error: Error) => {
        if (active) setNotice(error.message);
      })
      .finally(() => {
        if (active) setDraftLoading(false);
      });
    return () => { active = false; };
  }, [user?.role, selectedTicket?.id, api]);

  async function logIn(email: string, password: string) {
    setBusy(true);
    setLoginError("");
    try {
      const result = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem("bookleaf-token", result.token);
      setToken(result.token);
      setNotice("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTicket(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/tickets", { method: "POST", body: JSON.stringify(newTicket) });
      setNewTicket(emptyTicket);
      setNotice("Your ticket is in the queue. Our team will be in touch.");
      setPage("My tickets");
      if (user) await loadPortal(user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ticket could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  async function updateTicket(patch: Record<string, unknown>) {
    if (!selectedTicket) return;
    try {
      const result = await api<{ ticket: Ticket }>(`/api/admin/tickets/${selectedTicket.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setSelectedTicket(result.ticket);
      if (user) await loadPortal(user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ticket update failed.");
    }
  }

  async function sendMessage(body: string, visibility: "public" | "internal") {
    if (!selectedTicket || !body.trim()) return;
    try {
      const result = await api<{ ticket: Ticket }>(`/api/admin/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, visibility }),
      });
      setSelectedTicket(result.ticket);
      setReply("");
      setInternalNote("");
      setNotice(visibility === "public" ? "Response sent to the author." : "Internal note saved.");
      if (user) await loadPortal(user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Message could not be sent.");
    }
  }

  async function generateDraft() {
    if (!selectedTicket) return;
    setDraftLoading(true);
    try {
      const result = await api<{ draft: string; aiUnavailable: boolean }>(`/api/admin/tickets/${selectedTicket.id}/draft`, { method: "POST" });
      setDraft(result.draft);
      setReply("");
      setNotice(result.aiUnavailable ? "AI is unavailable; an editable suggested response is ready." : "AI draft ready. Review and edit before sending.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate a draft.");
    } finally {
      setDraftLoading(false);
    }
  }

  const royaltyTotals = useMemo(() => books.reduce((result, book) => ({
    earned: result.earned + book.total_royalty_earned,
    paid: result.paid + book.royalty_paid,
    pending: result.pending + book.royalty_pending,
    copies: result.copies + book.total_copies_sold,
  }), { earned: 0, paid: 0, pending: 0, copies: 0 }), [books]);

  return {
    user, page, setPage, books, tickets, selectedTicket, setSelectedTicket,
    busy, draftLoading, notice, setNotice, loginError, filters, setFilters, draft, setDraft,
    reply, setReply, internalNote, setInternalNote, newTicket, setNewTicket,
    search, setSearch, royaltyTotals, signOut, logIn, loadPortal, submitTicket,
    updateTicket, sendMessage, generateDraft,
  };
}
