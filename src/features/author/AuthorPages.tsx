import { useMemo, useRef, useState } from "react";
import { BookCard, EmptyState, Metric, PageHeading, Status } from "../../components/common";
import { date, money } from "../../lib/format";
import type { Book, Ticket, TicketDraft, User } from "../../types";

type AuthorPagesProps = {
  page: string;
  user: User;
  books: Book[];
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  draft: TicketDraft;
  search: string;
  busy: boolean;
  onSearch: (value: string) => void;
  onDraftChange: (draft: TicketDraft) => void;
  onSelectTicket: (ticket: Ticket | null) => void;
  onNavigate: (page: string) => void;
  onSubmitTicket: (event: React.FormEvent) => void;
};

export function AuthorPages({ page, user, books, tickets, selectedTicket, draft, search, busy, onSearch, onDraftChange, onSelectTicket, onNavigate, onSubmitTicket }: AuthorPagesProps) {
  const totals = useMemo(() => books.reduce((result, book) => ({
    earned: result.earned + book.total_royalty_earned,
    paid: result.paid + book.royalty_paid,
    pending: result.pending + book.royalty_pending,
    copies: result.copies + book.total_copies_sold,
  }), { earned: 0, paid: 0, pending: 0, copies: 0 }), [books]);
  const visibleBooks = books.filter((book) => `${book.title} ${book.isbn} ${book.genre}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <PageHeading
      eyebrow="YOUR BOOKLEAF ACCOUNT"
      title={page === "Overview" ? <>Good to have you back, {user.name.split(" ")[0]}</> : page}
      detail={page === "Overview" ? "Your author journey, all in one place." : page === "My books" ? "Your published stories and royalty snapshot." : page === "My tickets" ? "Stay in the loop with your support conversations." : "Tell us how we can help."}
      liveText="Updates every 8 sec"
    />
    {page === "Overview" && <Overview books={books} tickets={tickets} totals={totals} onNavigate={onNavigate} onSelectTicket={onSelectTicket} />}
    {page === "My books" && <BooksPage books={visibleBooks} total={books.length} search={search} onSearch={onSearch} />}
    {page === "My tickets" && <TicketsPage tickets={tickets} selectedTicket={selectedTicket} onSelectTicket={onSelectTicket} onNavigate={onNavigate} />}
    {page === "New ticket" && <NewTicketPage books={books} draft={draft} busy={busy} onDraftChange={onDraftChange} onSubmit={onSubmitTicket} />}
  </>;
}

function Overview({ books, tickets, totals, onNavigate, onSelectTicket }: {
  books: Book[];
  tickets: Ticket[];
  totals: { earned: number; paid: number; pending: number; copies: number };
  onNavigate: (page: string) => void;
  onSelectTicket: (ticket: Ticket | null) => void;
}) {
  return <>
    <div className="welcome-banner"><div><span className="banner-kicker">MADE FOR YOUR NEXT CHAPTER</span><h2>Your words are out in the world.<br /><span>We’re here for every step.</span></h2><button className="button light" onClick={() => onNavigate("New ticket")}>Talk to our team <span>→</span></button></div><div className="banner-art"><div className="art-circle" /><div className="art-book"><i /><i /><i /><i /></div><div className="art-spark">✳</div></div></div>
    <div className="metric-grid">
      <Metric label="ROYALTIES EARNED" value={money(totals.earned)} foot="Across your book catalogue" icon="₹" />
      <Metric label="ROYALTIES PAID" value={money(totals.paid)} foot="Transferred to your account" icon="↗" tone="green" />
      <Metric label="PENDING PAYOUT" value={money(totals.pending)} foot="Quarterly payout cycle" icon="◷" tone="warm" />
      <Metric label="COPIES SOLD" value={totals.copies.toLocaleString("en-IN")} foot="Readers reached so far" icon="▤" />
    </div>
    <div className="section-heading"><div><h2>Your books</h2><p>A little shelf of your big ideas.</p></div><button className="text-button" onClick={() => onNavigate("My books")}>View all books <span>→</span></button></div>
    <div className="book-grid">{books.slice(0, 3).map((book, index) => <BookCard key={book.id} book={book} index={index} />)}</div>
    <div className="home-bottom">
      <section className="panel home-tickets"><div className="panel-header"><div><h2>Recent conversations</h2><p>Support, whenever you need it.</p></div><button className="text-button" onClick={() => onNavigate("My tickets")}>All tickets →</button></div>
        {tickets.length ? tickets.slice(0, 3).map((ticket) => <button className="mini-ticket" key={ticket.id} onClick={() => { onSelectTicket(ticket); onNavigate("My tickets"); }}><span><b>{ticket.subject}</b><small>{date(ticket.created_at)}</small></span><Status status={ticket.status} /></button>) : <p className="empty-inline">No support requests yet.</p>}
      </section>
      <section className="royalty-note"><span className="note-spark">✳</span><h3>A note on royalties</h3><p>Royalties are calculated quarterly and paid within 45 days of quarter-end. Balances below ₹1,000 roll over to your next payout.</p><button className="text-button" onClick={() => onNavigate("My books")}>Explore your earnings →</button></section>
    </div>
  </>;
}

function BooksPage({ books, total, search, onSearch }: { books: Book[]; total: number; search: string; onSearch: (value: string) => void }) {
  return <>
    <div className="catalog-toolbar"><div><b>{total} books</b><span> · including titles in production</span></div><input placeholder="Find a title or ISBN…" value={search} onChange={(event) => onSearch(event.target.value)} /></div>
    <div className="book-grid full-book-grid">{books.map((book, index) => <BookCard key={book.id} book={book} index={index} />)}</div>
    {books.length === 0 && <EmptyState title="No books found" detail="Try another title or ISBN." />}
  </>;
}

function TicketsPage({ tickets, selectedTicket, onSelectTicket, onNavigate }: {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  onSelectTicket: (ticket: Ticket | null) => void;
  onNavigate: (page: string) => void;
}) {
  return <section className="panel author-ticket-panel">
    <div className="panel-header"><div><h2>Your conversations</h2><p>Replies from our team appear here automatically.</p></div><button className="button primary compact" onClick={() => onNavigate("New ticket")}>＋ New ticket</button></div>
    {tickets.length ? tickets.map((ticket) => <article key={ticket.id} className="author-ticket">
      <button className="author-ticket-head" onClick={() => onSelectTicket(selectedTicket?.id === ticket.id ? null : ticket)}><span><b>{ticket.subject}</b><small>{ticket.book?.title || "General / Account Level"} · {date(ticket.created_at)}</small></span><Status status={ticket.status} /></button>
      {selectedTicket?.id === ticket.id && <div className="conversation">
        <div className="conversation-message yours"><small>You · {date(ticket.created_at)}</small><p>{ticket.description}</p></div>
        {ticket.messages.filter((message) => message.visibility === "public").map((message) => <div className="conversation-message" key={message.id}><small>{message.sender_name} · {date(message.created_at)}</small><p>{message.body}</p></div>)}
      </div>}
    </article>) : <EmptyState title="No conversations yet" detail="When you reach out to our team, your messages will show up here." />}
  </section>;
}

function NewTicketPage({ books, draft, busy, onDraftChange, onSubmit }: {
  books: Book[];
  draft: TicketDraft;
  busy: boolean;
  onDraftChange: (draft: TicketDraft) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachmentName, setAttachmentName] = useState("");

  return <section className="panel new-ticket-panel">
    <div className="panel-header"><div><h2>Start a conversation</h2><p>Share a few details and the right person will get back to you.</p></div><span className="form-step">01 <i>/</i> 01</span></div>
    <form className="ticket-form" onSubmit={onSubmit}>
      <label>What is this about?<select value={draft.bookId} onChange={(event) => onDraftChange({ ...draft, bookId: event.target.value })}><option value="">General / Account Level</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.status}</option>)}</select><small>Choose a book if your question is title-specific.</small></label>
      <label>Subject<input required minLength={4} maxLength={160} placeholder="A short summary of your question" value={draft.subject} onChange={(event) => onDraftChange({ ...draft, subject: event.target.value })} /></label>
      <label>Tell us a little more<textarea required minLength={10} maxLength={5000} rows={7} placeholder="Include any details that will help us understand and resolve your question…" value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} /><small>{draft.description.length}/5,000 characters</small></label>
      <div className="attachment-control">
        <button type="button" className="attachment-trigger" onClick={() => fileInput.current?.click()}>
          ＋ <span>{attachmentName || "Attach a file"}<small>{attachmentName ? "Selected for this ticket (demo only)" : "Optional · choose an image or document"}</small></span>
        </button>
        <input
          ref={fileInput}
          className="attachment-input"
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          aria-label="Choose an attachment"
          onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || "")}
        />
        {attachmentName && <button type="button" className="attachment-remove" onClick={() => {
          setAttachmentName("");
          if (fileInput.current) fileInput.current.value = "";
        }}>Remove</button>}
      </div>
      <div className="form-actions"><span>We usually reply within 1–2 business days.</span><button className="button primary" disabled={busy}>{busy ? "Sending…" : "Send to BookLeaf"} <span>→</span></button></div>
    </form>
  </section>;
}
